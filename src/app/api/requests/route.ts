import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { RequestStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth-config";
import { isCustomerService, isAdmin } from "@/lib/auth";
import type { AuthUser, SessionUser, FormData } from "@/lib/types";

// GET /api/requests - List all requests with optional filters
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Debug session
    console.log("Session in GET:", {
      sessionUser: session?.user,
      fullSession: session,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Debug search params
    console.log("Search params:", { status, search });

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
            partNumbers: {
              hasSome: [search],
            },
          },
        ],
      }),
      ...(user.role !== "ADMIN" &&
        user.role === "CUSTOMER_SERVICE" && {
          createdBy: user.id,
        }),
    };

    // Debug where clause
    console.log("Where clause:", where);

    const requests = await prisma.mustGoRequest.findMany({
      where,
      include: {
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

    // Debug results
    console.log("Found requests:", requests.length);

    return NextResponse.json(requests);
  } catch (error) {
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
    const session = await getServerSession(authOptions);

    // Debug session
    console.log("Session in POST:", {
      sessionUser: session?.user,
      fullSession: session,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    const authUser: AuthUser = {
      id: user.id,
      role: user.role,
    };

    // Debug permission check
    console.log("Permission check:", {
      userRole: user.role,
      isCs: isCustomerService(authUser),
      isAdm: isAdmin(authUser),
      authUser,
    });

    if (!isCustomerService(authUser) && !isAdmin(authUser)) {
      return NextResponse.json(
        { error: "Only customer service can create requests" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as FormData;
    const {
      shipmentNumber,
      partNumbers,
      palletCount,
      routeInfo,
      additionalNotes,
    } = body;

    // Debug request body
    console.log("Request body:", body);

    // Validate required fields
    if (!shipmentNumber || !partNumbers?.length || !palletCount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the request
    const request = await prisma.mustGoRequest.create({
      data: {
        shipmentNumber,
        partNumbers,
        palletCount,
        routeInfo,
        additionalNotes,
        createdBy: user.id,
        logs: {
          create: {
            action: `Request created with ${partNumbers.length} part number(s)`,
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
    // Debug any errors
    console.error("Error in POST:", error);

    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
