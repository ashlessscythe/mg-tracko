import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import type { SessionUser } from "@/lib/types";

interface PartData {
  partNumber: string;
  quantity: number;
  shipmentNumber: string;
  plant: string;
  trailerNumber: string;
  routeInfo: string;
}

interface RowData {
  shipmentNumber: string;
  plant: string;
  parts: PartData[];
  routeInfo: string;
}

interface ValidationError {
  row: number;
  errors: string[];
}

interface ProcessResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: ValidationError[];
}

type SplitCriteria = "shipment" | "trailer" | "route" | "part";

function validateRow(
  row: RowData,
  rowIndex: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.shipmentNumber) {
    errors.push("Shipment number is required");
  }
  if (!row.parts || row.parts.length === 0) {
    errors.push("At least one part with quantity is required");
  } else {
    row.parts.forEach((part, idx) => {
      if (!part.partNumber) {
        errors.push(`Part number is required for part ${idx + 1}`);
      }
      if (!part.quantity || isNaN(part.quantity) || part.quantity <= 0) {
        errors.push(`Valid quantity is required for part ${idx + 1}`);
      }
      if (!part.trailerNumber) {
        errors.push(`Trailer number is required for part ${idx + 1}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function groupDataByCriteria(
  rawData: any[],
  splitCriteria: SplitCriteria
): RowData[] {
  const groupedData: { [key: string]: any } = {};

  rawData.forEach((row) => {
    const shipmentNumber = row["SHIPMENT"]?.toString() || "";
    const plant = row["PLANT"]?.toString() || "";
    const trailerNumber = row["1ST truck #"]?.toString() || "";
    const routeInfo = row["INSTRUCTIONS"]?.toString() || "";
    const partNumber = row["DELPHI P/N"]?.toString() || "";
    const quantity = parseInt(
      row["MG QTY"]?.toString() || row["qty"]?.toString() || "0"
    );

    if (!partNumber || !quantity) return;

    // Create a unique key based on the split criteria
    let groupKey: string;
    switch (splitCriteria) {
      case "shipment":
        groupKey = shipmentNumber;
        break;
      case "trailer":
        groupKey = `${trailerNumber || "no-trailer"}-${shipmentNumber}`;
        break;
      case "route":
        groupKey = `${routeInfo || "no-route"}-${shipmentNumber}`;
        break;
      case "part":
        groupKey = partNumber;
        break;
      default:
        groupKey = shipmentNumber;
    }

    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        shipmentNumber:
          splitCriteria === "part" ? `${partNumber}-group` : shipmentNumber,
        plant,
        routeInfo,
        parts: [],
      };
    }

    // Add part with its context
    groupedData[groupKey].parts.push({
      partNumber,
      quantity,
      shipmentNumber,
      plant,
      trailerNumber,
      routeInfo,
    });
  });

  return Object.values(groupedData);
}

function parseExcelBuffer(
  buffer: Buffer,
  splitCriteria: SplitCriteria
): RowData[] {
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet);
  return groupDataByCriteria(rawData, splitCriteria);
}

function parseRawText(text: string, splitCriteria: SplitCriteria): RowData[] {
  const decodedText = decodeURIComponent(text);
  const lines = decodedText.split(/[\r\n]+/).filter((line) => line.trim());
  const dataLines = lines.slice(1);

  const rawData = dataLines.map((line) => {
    const parts = line.split(/[\t,]+/).map((part) => part.trim());
    const [
      shipmentNumber,
      delivery,
      plant,
      customerPN,
      delphiPN,
      mgQty,
      instructions,
      trailerNumber,
      qty,
    ] = parts;

    return {
      SHIPMENT: shipmentNumber,
      PLANT: plant,
      "DELPHI P/N": delphiPN,
      "MG QTY": mgQty || qty,
      INSTRUCTIONS: instructions,
      "1ST truck #": trailerNumber,
    };
  });

  return groupDataByCriteria(rawData, splitCriteria);
}

async function processRows(
  rows: RowData[],
  userId: string
): Promise<ProcessResult> {
  const result: ProcessResult = {
    success: true,
    totalRows: rows.length,
    successfulRows: 0,
    failedRows: 0,
    errors: [],
  };

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      ...result,
      success: false,
      failedRows: rows.length,
      errors: rows.map((_, index) => ({
        row: index + 1,
        errors: [`User with ID ${userId} not found`],
      })),
    };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validation = validateRow(row, i);

    if (!validation.isValid) {
      result.failedRows++;
      result.errors.push({
        row: i + 1,
        errors: validation.errors,
      });
      continue;
    }

    try {
      // Group parts by trailer
      const partsByTrailer = row.parts.reduce((acc, part) => {
        if (!acc[part.trailerNumber]) {
          acc[part.trailerNumber] = [];
        }
        acc[part.trailerNumber].push(part);
        return acc;
      }, {} as { [key: string]: PartData[] });

      // Calculate total pallet count across all parts
      const totalPalletCount = row.parts.reduce((acc, part) => {
        return acc + Math.ceil(part.quantity / 24);
      }, 0);

      // Use transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // Create the request first
        const request = await tx.mustGoRequest.create({
          data: {
            shipmentNumber: row.shipmentNumber,
            plant: row.plant,
            routeInfo: row.routeInfo,
            palletCount: totalPalletCount,
            createdBy: userId,
            logs: {
              create: {
                action: `Request created with ${row.parts.length} part number(s)`,
                performer: {
                  connect: {
                    id: userId,
                  },
                },
              },
            },
          },
        });

        // Process each trailer and its parts
        for (const [trailerNumber, parts] of Object.entries(partsByTrailer)) {
          // Create or find the trailer
          const trailer = await tx.trailer.upsert({
            where: {
              trailerNumber,
            },
            create: {
              trailerNumber,
            },
            update: {},
          });

          // Link trailer to request
          await tx.requestTrailer.create({
            data: {
              request: {
                connect: {
                  id: request.id,
                },
              },
              trailer: {
                connect: {
                  id: trailer.id,
                },
              },
            },
          });

          // Create part details for this trailer
          await Promise.all(
            parts.map((part) =>
              tx.partDetail.create({
                data: {
                  partNumber: part.partNumber,
                  quantity: part.quantity,
                  request: {
                    connect: {
                      id: request.id,
                    },
                  },
                  trailer: {
                    connect: {
                      id: trailer.id,
                    },
                  },
                },
              })
            )
          );
        }
      });

      result.successfulRows++;
    } catch (error) {
      console.error("Error processing row:", error);
      result.failedRows++;
      result.errors.push({
        row: i + 1,
        errors: ["Database error: " + (error as Error).message],
      });
    }
  }

  result.success = result.failedRows === 0;
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    if (!user.id) {
      return NextResponse.json(
        { error: "Invalid user session" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;
    const splitCriteria =
      (formData.get("splitCriteria") as SplitCriteria) || "shipment";

    let rows: RowData[] = [];

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      rows = parseExcelBuffer(buffer, splitCriteria);
    } else if (text) {
      rows = parseRawText(text, splitCriteria);
    } else {
      return NextResponse.json(
        { error: "No file or text provided" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No data found to process" },
        { status: 400 }
      );
    }

    const result = await processRows(rows, user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
