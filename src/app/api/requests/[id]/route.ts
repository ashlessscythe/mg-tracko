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
import { isWarehouse } from "@/lib/auth";

// GET /api/requests/[id] - Get a single request by ID
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

    const mustGoRequest = await prisma.mustGoRequest.findUnique({
      where: {
        id: params.id,
        ...(user.role !== "ADMIN" &&
          user.role === "CUSTOMER_SERVICE" && {
            createdBy: user.id,
          }),
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
        partDetails: true,
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

    return NextResponse.json(mustGoRequest);
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

// PATCH /api/requests/[id] - Update request status, add note, or edit request details
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
          partDetails: true,
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

      return NextResponse.json(updatedRequest);
    }

    // This is a request edit
    const request = await prisma.mustGoRequest.findUnique({
      where: { id: params.id },
      include: { creator: true, partDetails: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check if user has permission to edit
    if (
      user.role !== "ADMIN" &&
      (user.role !== "CUSTOMER_SERVICE" || request.createdBy !== user.id)
    ) {
      return NextResponse.json(
        { error: "You don't have permission to edit this request" },
        { status: 403 }
      );
    }

    const {
      shipmentNumber,
      plant,
      trailerNumber,
      palletCount,
      routeInfo,
      additionalNotes,
      parts,
    } = body;

    // Validate required fields
    if (!shipmentNumber || !parts?.length || !palletCount) {
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
    if (shipmentNumber !== request.shipmentNumber)
      changes.push(
        `shipment number from ${request.shipmentNumber} to ${shipmentNumber}`
      );
    if (plant !== request.plant)
      changes.push(
        `plant from ${request.plant || "none"} to ${plant || "none"}`
      );
    if (trailerNumber !== request.trailerNumber)
      changes.push(
        `trailer number from ${request.trailerNumber || "none"} to ${
          trailerNumber || "none"
        }`
      );
    if (palletCount !== request.palletCount)
      changes.push(
        `pallet count from ${request.palletCount} to ${palletCount}`
      );
    if (routeInfo !== request.routeInfo)
      changes.push(
        `route info from ${request.routeInfo || "none"} to ${
          routeInfo || "none"
        }`
      );
    if (additionalNotes !== request.additionalNotes)
      changes.push(`additional notes`);

    // Compare parts
    const existingParts = new Set(
      request.partDetails.map(
        (p: PartDetail) => `${p.partNumber}:${p.quantity}`
      )
    );
    const newParts = new Set(
      parts.map(
        (p: { partNumber: string; quantity: number }) =>
          `${p.partNumber}:${p.quantity}`
      )
    );

    // Find removed parts
    const removedParts = request.partDetails.filter(
      (p: PartDetail) => !newParts.has(`${p.partNumber}:${p.quantity}`)
    );
    // Find added parts
    const addedParts = parts.filter(
      (p: { partNumber: string; quantity: number }) =>
        !existingParts.has(`${p.partNumber}:${p.quantity}`)
    );

    // Create part change logs
    const partLogs = [];
    if (removedParts.length > 0) {
      partLogs.push({
        action: `Removed part numbers: ${removedParts
          .map((p: PartDetail) => `${p.partNumber} (${p.quantity})`)
          .join(", ")}`,
        performedBy: user.id,
      });
    }
    if (addedParts.length > 0) {
      partLogs.push({
        action: `Added part numbers: ${addedParts
          .map(
            (p: { partNumber: string; quantity: number }) =>
              `${p.partNumber} (${p.quantity})`
          )
          .join(", ")}`,
        performedBy: user.id,
      });
    }

    // Update the request
    const updatedRequest = await prisma.mustGoRequest.update({
      where: { id: params.id },
      data: {
        shipmentNumber,
        plant,
        trailerNumber,
        palletCount,
        routeInfo,
        additionalNotes,
        partDetails: {
          deleteMany: {},
          create: parts.map(
            (part: { partNumber: string; quantity: number }) => ({
              partNumber: part.partNumber,
              quantity: part.quantity,
            })
          ),
        },
        logs: {
          create: [
            // Main changes log
            ...(changes.length > 0
              ? [
                  {
                    action: `Request edited: Changed ${changes.join(", ")}`,
                    performedBy: user.id,
                  },
                ]
              : []),
            // Part change logs
            ...partLogs,
          ],
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
        partDetails: true,
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

    return NextResponse.json(updatedRequest);
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

// DELETE /api/requests/[id] - Soft delete a request (admin only)
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
