import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { RequestStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth-config";
import type {
  AuthUser,
  SessionUser,
  UpdateRequestData,
  PartDetail,
} from "@/lib/types";
import { isWarehouse, isAdmin, isCustomerService } from "@/lib/auth";

interface Part {
  partNumber: string;
  quantity: number;
}

interface TrailerWithParts {
  trailerNumber: string;
  parts: Part[];
}

type DbPartDetail = Omit<PartDetail, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

interface PartChange {
  key: string;
  part: Part;
  trailerNumber: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const authUser: AuthUser = {
      id: user.id,
      role: user.role,
    };

    const mustGoRequest = await prisma.mustGoRequest.findUnique({
      where: {
        id: params.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        trailers: {
          include: {
            trailer: true,
          },
        },
        partDetails: {
          include: {
            trailer: true,
          },
        },
        logs: {
          include: {
            performer: {
              select: {
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            timestamp: "desc",
          },
        },
      },
    });

    if (!mustGoRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Add canEdit flag based on user permissions
    const canEdit =
      isAdmin(authUser) ||
      isWarehouse(authUser) ||
      (isCustomerService(authUser) && mustGoRequest.createdBy === user.id);

    return NextResponse.json({
      ...mustGoRequest,
      canEdit,
    });
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const body = await req.json();

    // Check if this is a status update
    if (body.status || body.note) {
      const authUser: AuthUser = {
        id: user.id,
        role: user.role,
      };

      const hasPermission = isWarehouse(authUser);

      if (!hasPermission) {
        return NextResponse.json(
          { error: "Only warehouse staff can update request status" },
          { status: 403 }
        );
      }

      const { status, note } = body as UpdateRequestData;

      if (status && !Object.values(RequestStatus).includes(status)) {
        return NextResponse.json(
          { error: "Invalid status provided" },
          { status: 400 }
        );
      }

      const currentRequest = await prisma.mustGoRequest.findUnique({
        where: { id: params.id },
        select: { notes: true },
      });

      if (!currentRequest) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }

      const updateData: any = {};
      if (status) {
        updateData.status = status;
      }
      if (note) {
        updateData.notes = [...(currentRequest.notes || []), note];
      }

      const updatedRequest = await prisma.mustGoRequest.update({
        where: { id: params.id },
        data: {
          ...updateData,
          logs: {
            create: {
              action: status
                ? `Status updated to ${status}${note ? `: ${note}` : ""}`
                : `Note added: ${note}`,
              performedBy: user.id,
            },
          },
        },
        include: {
          creator: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
          trailers: {
            include: {
              trailer: true,
            },
          },
          partDetails: {
            include: {
              trailer: true,
            },
          },
          logs: {
            include: {
              performer: {
                select: {
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: {
              timestamp: "desc",
            },
          },
        },
      });

      const authUser2: AuthUser = {
        id: user.id,
        role: user.role,
      };

      return NextResponse.json({
        ...updatedRequest,
        canEdit:
          isAdmin(authUser2) ||
          isWarehouse(authUser2) ||
          (isCustomerService(authUser2) &&
            updatedRequest.createdBy === user.id),
      });
    }

    // This is a request edit
    const request = await prisma.mustGoRequest.findUnique({
      where: { id: params.id },
      include: {
        creator: true,
        trailers: {
          include: {
            trailer: true,
          },
        },
        partDetails: {
          include: {
            trailer: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const authUser: AuthUser = {
      id: user.id,
      role: user.role,
    };

    // Check if user has permission to edit
    if (
      !isAdmin(authUser) &&
      !isWarehouse(authUser) &&
      !(isCustomerService(authUser) && request.createdBy === user.id)
    ) {
      return NextResponse.json(
        { error: "You don't have permission to edit this request" },
        { status: 403 }
      );
    }

    const {
      shipmentNumber,
      plant,
      trailers,
      palletCount,
      routeInfo,
      additionalNotes,
    } = body as {
      shipmentNumber: string;
      plant?: string;
      trailers: TrailerWithParts[];
      palletCount: number;
      routeInfo?: string;
      additionalNotes?: string;
    };

    // Validate required fields
    if (!shipmentNumber || !trailers?.length || !palletCount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate plant format if provided
    if (plant && !/^[a-zA-Z0-9]{4}$/.test(plant)) {
      return NextResponse.json(
        { error: "Plant must be exactly 4 alphanumeric characters" },
        { status: 400 }
      );
    }

    // Create a changes log message
    const changes: string[] = [];
    if (shipmentNumber !== request.shipmentNumber) {
      changes.push(
        `shipment number from ${request.shipmentNumber} to ${shipmentNumber}`
      );
    }
    if (plant !== request.plant && (plant || request.plant)) {
      changes.push(
        `plant from ${request.plant || "none"} to ${plant || "none"}`
      );
    }
    if (palletCount !== request.palletCount) {
      changes.push(
        `pallet count from ${request.palletCount} to ${palletCount}`
      );
    }
    if (routeInfo !== request.routeInfo && (routeInfo || request.routeInfo)) {
      changes.push(
        `route info from ${request.routeInfo || "none"} to ${
          routeInfo || "none"
        }`
      );
    }
    if (
      additionalNotes !== request.additionalNotes &&
      (additionalNotes || request.additionalNotes)
    ) {
      changes.push(
        `additional notes from ${request.additionalNotes || "none"} to ${
          additionalNotes || "none"
        }`
      );
    }

    // Create a map of current trailer numbers to their new numbers
    const trailerMap = new Map<string, string>();
    const currentTrailers = new Set(
      request.trailers.map((t) => t.trailer.trailerNumber)
    );
    const newTrailers = new Set(trailers.map((t) => t.trailerNumber));

    // Find trailer number changes by matching parts
    request.partDetails.forEach((currentPart) => {
      const currentTrailerNum = currentPart.trailer.trailerNumber;
      if (!newTrailers.has(currentTrailerNum)) {
        // Look for the same part in new trailers
        for (const trailer of trailers) {
          const matchingPart = trailer.parts.find(
            (p) => p.partNumber === currentPart.partNumber
          );
          if (matchingPart) {
            trailerMap.set(currentTrailerNum, trailer.trailerNumber);
            break;
          }
        }
      }
    });

    // Track part number changes
    const currentParts = request.partDetails.reduce<
      Record<string, DbPartDetail>
    >((acc, part) => {
      // Use mapped trailer number if it exists
      const trailerNumber =
        trailerMap.get(part.trailer.trailerNumber) ||
        part.trailer.trailerNumber;
      const key = `${part.partNumber}-${trailerNumber}`;
      acc[key] = part as DbPartDetail;
      return acc;
    }, {});

    const newParts: PartChange[] = trailers.flatMap((trailer) =>
      trailer.parts.map((part) => ({
        key: `${part.partNumber}-${trailer.trailerNumber}`,
        part,
        trailerNumber: trailer.trailerNumber,
      }))
    );

    // Compare parts and log changes
    const partChanges: string[] = [];

    // Log trailer number changes first
    trailerMap.forEach((newNum, oldNum) => {
      partChanges.push(`moved parts from trailer ${oldNum} to ${newNum}`);
    });

    // Then log part changes
    newParts.forEach(({ key, part, trailerNumber }) => {
      const currentPart = currentParts[key];
      if (!currentPart) {
        // Only log as new if the part isn't in any mapped trailer
        const isMovedPart = Array.from(trailerMap.values()).includes(
          trailerNumber
        );
        if (!isMovedPart) {
          partChanges.push(
            `updated part ${part.partNumber} quantity to ${part.quantity} in trailer ${trailerNumber}`
          );
        }
      } else if (currentPart.quantity !== part.quantity) {
        partChanges.push(
          `updated part ${part.partNumber} quantity from ${currentPart.quantity} to ${part.quantity} in trailer ${trailerNumber}`
        );
      }
      delete currentParts[key];
    });

    // Log truly removed parts (not just moved to different trailer)
    Object.values(currentParts).forEach((part) => {
      const oldTrailerNum = part.trailer.trailerNumber;
      // Only log removal if the trailer wasn't remapped
      if (!trailerMap.has(oldTrailerNum)) {
        partChanges.push(
          `removed part ${part.partNumber} from trailer ${oldTrailerNum}`
        );
      }
    });

    // Update the request in a transaction
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Delete existing trailers and parts
      await tx.requestTrailer.deleteMany({
        where: { requestId: params.id },
      });
      await tx.partDetail.deleteMany({
        where: { requestId: params.id },
      });

      // Update the request
      const request = await tx.mustGoRequest.update({
        where: { id: params.id },
        data: {
          shipmentNumber,
          plant,
          palletCount,
          routeInfo,
          additionalNotes,
          logs: {
            create: [
              ...(changes.length > 0
                ? [
                    {
                      action: `Request details changed: ${changes.join(", ")}`,
                      performedBy: user.id,
                    },
                  ]
                : []),
              ...(partChanges.length > 0
                ? [
                    {
                      action: `Part changes: ${partChanges.join("; ")}`,
                      performedBy: user.id,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      // Create new trailers and parts
      for (const trailerData of trailers) {
        const trailer = await tx.trailer.upsert({
          where: { trailerNumber: trailerData.trailerNumber },
          create: { trailerNumber: trailerData.trailerNumber },
          update: {},
        });

        await tx.requestTrailer.create({
          data: {
            request: { connect: { id: request.id } },
            trailer: { connect: { id: trailer.id } },
          },
        });

        await Promise.all(
          trailerData.parts.map((part: Part) =>
            tx.partDetail.create({
              data: {
                partNumber: part.partNumber,
                quantity: part.quantity,
                request: { connect: { id: request.id } },
                trailer: { connect: { id: trailer.id } },
              },
            })
          )
        );
      }

      return tx.mustGoRequest.findUnique({
        where: { id: params.id },
        include: {
          creator: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
          trailers: {
            include: {
              trailer: true,
            },
          },
          partDetails: {
            include: {
              trailer: true,
            },
          },
          logs: {
            include: {
              performer: {
                select: {
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: {
              timestamp: "desc",
            },
          },
        },
      });
    });

    const authUser2: AuthUser = {
      id: user.id,
      role: user.role,
    };

    return NextResponse.json({
      ...updatedRequest,
      canEdit:
        isAdmin(authUser2) ||
        isWarehouse(authUser2) ||
        (isCustomerService(authUser2) && updatedRequest?.createdBy === user.id),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete requests" },
        { status: 403 }
      );
    }

    const request = await prisma.mustGoRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const deletedRequest = await prisma.mustGoRequest.update({
      where: { id: params.id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        logs: {
          create: {
            action: "Request marked as deleted",
            performedBy: user.id,
          },
        },
      },
    });

    return NextResponse.json(deletedRequest);
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
