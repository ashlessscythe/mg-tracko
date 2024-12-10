import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import type { SessionUser } from "@/lib/types";

interface PartData {
  partNumber: string;
  quantity: number;
}

interface RowData {
  shipmentNumber: string;
  plant: string;
  parts: PartData[];
  trailerNumber: string;
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
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function parseExcelBuffer(buffer: Buffer): RowData[] {
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet);

  // Skip header row and group rows by shipment number
  const groupedData = rawData.reduce(
    (acc: { [key: string]: any }, row: any) => {
      const shipmentNumber = row["SHIPMENT"]?.toString() || "";
      if (!acc[shipmentNumber]) {
        acc[shipmentNumber] = {
          shipmentNumber,
          plant: row["PLANT"]?.toString() || "",
          trailerNumber: row["1ST truck #"]?.toString() || "",
          parts: [],
        };
      }

      acc[shipmentNumber].parts.push({
        partNumber: row["DELPHI P/N"]?.toString() || "",
        quantity: parseInt(row["qty"]?.toString() || "0"),
      });

      return acc;
    },
    {}
  );

  return Object.values(groupedData);
}

function parseRawText(text: string): RowData[] {
  // Decode URL-encoded text
  const decodedText = decodeURIComponent(text);

  // Split into lines and remove empty lines
  const lines = decodedText.split(/[\r\n]+/).filter((line) => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  const groupedData: { [key: string]: any } = {};

  dataLines.forEach((line) => {
    // Split by tab or comma
    const parts = line.split(/[\t,]+/).map((part) => part.trim());

    // Map array indices to expected columns based on header
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

    if (!shipmentNumber) return; // Skip empty rows

    if (!groupedData[shipmentNumber]) {
      groupedData[shipmentNumber] = {
        shipmentNumber,
        plant,
        trailerNumber,
        parts: [],
      };
    }

    // Use mgQty if available, otherwise fall back to qty
    const quantity = parseInt(mgQty || qty || "0");

    if (delphiPN) {
      groupedData[shipmentNumber].parts.push({
        partNumber: delphiPN,
        quantity,
      });
    }
  });

  return Object.values(groupedData);
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

  // First verify the user exists
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
      // Calculate total pallet count based on all parts
      const totalPalletCount = row.parts.reduce((acc, part) => {
        return acc + Math.ceil(part.quantity / 24); // 24 pieces per pallet
      }, 0);

      await prisma.mustGoRequest.create({
        data: {
          shipmentNumber: row.shipmentNumber,
          plant: row.plant,
          trailerNumber: row.trailerNumber,
          palletCount: totalPalletCount,
          createdBy: userId,
          partDetails: {
            create: row.parts.map((part) => ({
              partNumber: part.partNumber,
              quantity: part.quantity,
            })),
          },
        },
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

    let rows: RowData[] = [];

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      rows = parseExcelBuffer(buffer);
    } else if (text) {
      rows = parseRawText(text);
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
