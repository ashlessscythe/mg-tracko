import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, isCustomerService } from "@/lib/auth";
import { RequestStatus, Prisma } from "@prisma/client";

// GET /api/requests - List all requests with optional filters
export async function GET(req: Request) {
  try {
    const user = await getAuthUser();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Prisma.MustGoRequestWhereInput = {
      ...(status && { status: status as RequestStatus }),
      ...(search && {
        OR: [
          {
            shipmentNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            partNumber: {
              partNumber: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        ],
      }),
      ...(user.role !== "ADMIN" &&
        user.role === "CUSTOMER_SERVICE" && {
          createdBy: user.id,
        }),
    };

    const requests = await prisma.mustGoRequest.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    if (error instanceof Error && error.message === "User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST /api/requests - Create a new request
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();

    if (!isCustomerService(user)) {
      return NextResponse.json(
        { error: "Only customer service can create requests" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      shipmentNumber,
      partNumberId,
      palletCount,
      routeInfo,
      additionalNotes,
    } = body;

    // Validate required fields
    if (!shipmentNumber || !partNumberId || !palletCount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the request
    const request = await prisma.mustGoRequest.create({
      data: {
        shipmentNumber,
        partNumberId,
        palletCount,
        routeInfo,
        additionalNotes,
        createdBy: user.id,
        logs: {
          create: {
            action: "Request created",
            performedBy: user.id,
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
        },
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "User not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating request:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
