import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, RequestStatus, Role } from "@prisma/client";
import { getAuthUser, hasPermission } from "@/lib/auth";

const prisma = new PrismaClient();

// Create a new MustGo request
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    const {
      shipmentNumber,
      partNumber,
      palletCount,
      routeInfo,
      additionalNotes,
    } = await req.json();

    // Validate required fields
    if (!shipmentNumber || !partNumber || !palletCount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create request
    const request = await prisma.mustGoRequest.create({
      data: {
        shipmentNumber,
        partNumber,
        palletCount,
        routeInfo,
        additionalNotes,
        createdBy: authUser.id,
      },
    });

    // Log the creation action
    await prisma.requestLog.create({
      data: {
        mustGoRequestId: request.id,
        action: "REQUEST_CREATED",
        performedBy: authUser.id,
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error: unknown) {
    console.error("Create request error:", error);

    if (error instanceof Error && error.message === "User not authenticated") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all MustGo requests with filtering
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") as RequestStatus | null;
    const search = searchParams.get("search");

    let whereClause: any = {};

    // Apply status filter if provided
    if (status && Object.values(RequestStatus).includes(status)) {
      whereClause.status = status;
    }

    // Apply search filter if provided
    if (search) {
      whereClause.OR = [
        { shipmentNumber: { contains: search, mode: "insensitive" } },
        { partNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const requests = await prisma.mustGoRequest.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        logs: {
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
      },
    });

    return NextResponse.json(requests);
  } catch (error: unknown) {
    console.error("Get requests error:", error);

    if (error instanceof Error && error.message === "User not authenticated") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update request status (PATCH is used for partial updates)
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    // Only warehouse staff and admins can update request status
    if (!hasPermission(authUser, [Role.WAREHOUSE, Role.ADMIN])) {
      return NextResponse.json(
        { error: "Unauthorized: Warehouse access required" },
        { status: 403 }
      );
    }

    const { id, status, additionalNotes } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Request ID and status are required" },
        { status: 400 }
      );
    }

    // Validate status is a valid enum value
    if (!Object.values(RequestStatus).includes(status as RequestStatus)) {
      return NextResponse.json(
        { error: "Invalid status specified" },
        { status: 400 }
      );
    }

    // Update request
    const updatedRequest = await prisma.mustGoRequest.update({
      where: { id },
      data: {
        status: status as RequestStatus,
        additionalNotes: additionalNotes || undefined,
      },
    });

    // Log the status update
    await prisma.requestLog.create({
      data: {
        mustGoRequestId: id,
        action: `STATUS_UPDATED_TO_${status}`,
        performedBy: authUser.id,
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error: unknown) {
    console.error("Update request error:", error);

    if (error instanceof Error && error.message === "User not authenticated") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
