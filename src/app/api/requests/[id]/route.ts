import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { RequestStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth-config";
import type { AuthUser, SessionUser, UpdateRequestData } from "@/lib/types";
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

// PATCH /api/requests/[id] - Update request status or add note
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

    const body = (await req.json()) as UpdateRequestData;
    const { status, note } = body;

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
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
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
