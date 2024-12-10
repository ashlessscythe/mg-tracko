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
    console.log("User role:", user.role);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const where: Prisma.MustGoRequestWhereInput = {
      ...(status && { status: status as RequestStatus }),
      ...(!includeDeleted && { deleted: false }),
    };

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

    if (user.role === "CUSTOMER_SERVICE") {
      where.createdBy = user.id;
    }

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

    const body = (await req.json()) as FormData;

    const {
      shipmentNumber,
      plant,
      trailers,
      palletCount,
      routeInfo,
      additionalNotes,
    } = body;

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

    // Validate trailers and parts
    for (const trailer of trailers) {
      if (!trailer.trailerNumber) {
        return NextResponse.json(
          { error: "All trailer numbers are required" },
          { status: 400 }
        );
      }
      if (!trailer.parts?.length) {
        return NextResponse.json(
          {
            error: `Trailer ${trailer.trailerNumber} must have at least one part number`,
          },
          { status: 400 }
        );
      }
    }

    // Create everything in a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the request first
      const request = await tx.mustGoRequest.create({
        data: {
          shipmentNumber,
          plant,
          palletCount,
          routeInfo,
          additionalNotes,
          createdBy: user.id,
          logs: {
            create: {
              action: `Request created with ${trailers.length} trailer(s)`,
              performedBy: user.id,
            },
          },
        },
      });

      // Process each trailer and its parts
      for (const trailerData of trailers) {
        // Create or find the trailer
        const trailer = await tx.trailer.upsert({
          where: {
            trailerNumber: trailerData.trailerNumber,
          },
          create: {
            trailerNumber: trailerData.trailerNumber,
          },
          update: {},
        });

        // Link trailer to request
        await tx.requestTrailer.create({
          data: {
            requestId: request.id,
            trailerId: trailer.id,
          },
        });

        // Create part details for this trailer
        await Promise.all(
          trailerData.parts.map((part) =>
            tx.partDetail.create({
              data: {
                partNumber: part.partNumber,
                quantity: part.quantity,
                requestId: request.id,
                trailerId: trailer.id,
              },
            })
          )
        );
      }

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
