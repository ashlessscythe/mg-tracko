import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { RequestStatus } from "@prisma/client";

// GET /api/requests/[id] - Get a single request by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mustGoRequest = await prisma.mustGoRequest.findUnique({
      where: {
        id: params.id,
        ...(session.user.role !== "ADMIN" &&
          session.user.role === "CUSTOMER_SERVICE" && {
            createdBy: session.user.id,
          }),
      },
      include: {
        partNumber: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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

    return NextResponse.json(mustGoRequest);
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

// PATCH /api/requests/[id] - Update request status
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is warehouse staff or admin
    if (session.user.role !== "WAREHOUSE" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only warehouse staff can update request status" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, note } = body;

    if (!status || !Object.values(RequestStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status provided" },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.mustGoRequest.update({
      where: { id: params.id },
      data: {
        status,
        logs: {
          create: {
            action: `Status updated to ${status}${note ? `: ${note}` : ""}`,
            performedBy: session.user.id,
          },
        },
      },
      include: {
        partNumber: true,
        creator: {
          select: {
            name: true,
            email: true,
            role: true,
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
