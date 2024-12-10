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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    console.log("User role:", user.role); // Debug log

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Base where clause
    const where: Prisma.MustGoRequestWhereInput = {
      ...(status && { status: status as RequestStatus }),
      ...(!includeDeleted && { deleted: false }),
    };

    // Add search conditions if search param exists
    if (search) {
      where.OR = [
        {
          shipmentNumber: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          partDetails: {
            some: {
              partNumber: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          trailers: {
            some: {
              trailer: {
                trailerNumber: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        },
      ];
    }

    // Add role-based filtering
    if (user.role === "CUSTOMER_SERVICE") {
      where.createdBy = user.id;
    }
    // Admin sees all requests

    console.log("Query where clause:", where); // Debug log

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
        trailers: {
          include: {
            trailer: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("Found requests:", requests.length); // Debug log

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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    const authUser: AuthUser = {
      id: user.id,
      role: user.role,
    };

    if (!isCustomerService(authUser) && !isAdmin(authUser)) {
      return NextResponse.json(
        { error: "Only customer service can create requests" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as FormData & {
      parts: Array<{ partNumber: string; quantity: number }>;
      trailerNumber: string;
    };

    const {
      shipmentNumber,
      plant,
      parts,
      palletCount,
      routeInfo,
      additionalNotes,
      trailerNumber,
    } = body;

    // Validate required fields
    if (!shipmentNumber || !parts?.length || !palletCount || !trailerNumber) {
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

    // Create everything in a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create or find the trailer first
      const trailer = await tx.trailer.upsert({
        where: {
          trailerNumber,
        },
        create: {
          trailerNumber,
        },
        update: {},
      });

      // Create the request
      const request = await tx.mustGoRequest.create({
        data: {
          shipmentNumber,
          plant,
          palletCount,
          routeInfo,
          additionalNotes,
          createdBy: user.id,
          trailers: {
            create: {
              trailer: {
                connect: {
                  id: trailer.id,
                },
              },
            },
          },
          logs: {
            create: {
              action: `Request created with ${parts.length} part number(s)`,
              performedBy: user.id,
            },
          },
        },
      });

      // Create part details with both request and trailer connections
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

      // Return complete request with all relations
      return tx.mustGoRequest.findUnique({
        where: { id: request.id },
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
          },
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error in POST:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
