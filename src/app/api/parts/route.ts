import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthUser, hasPermission } from "@/lib/auth";

const prisma = new PrismaClient();

// Create a new part
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    const { partNumber, description, weight, dimensions } = await req.json();

    // Validate required fields
    if (!partNumber) {
      return NextResponse.json(
        { error: "Part number is required" },
        { status: 400 }
      );
    }

    // Check if part already exists
    const existingPart = await prisma.partInfo.findUnique({
      where: { partNumber },
    });

    if (existingPart) {
      return NextResponse.json(
        { error: "Part number already exists" },
        { status: 400 }
      );
    }

    // Create part
    const part = await prisma.partInfo.create({
      data: {
        partNumber,
        description,
        weight,
        dimensions,
      },
    });

    return NextResponse.json(part, { status: 201 });
  } catch (error: unknown) {
    console.error("Create part error:", error);

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

// Get all parts with filtering
export async function GET(req: NextRequest) {
  try {
    await getAuthUser();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search");
    let whereClause: any = {};

    // Apply search filter if provided
    if (search) {
      whereClause.OR = [
        { partNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const parts = await prisma.partInfo.findMany({
      where: whereClause,
      orderBy: {
        partNumber: "asc",
      },
    });

    return NextResponse.json(parts);
  } catch (error: unknown) {
    console.error("Get parts error:", error);

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

// Update part information
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser();

    const { id, partNumber, description, weight, dimensions } =
      await req.json();

    if (!id || !partNumber) {
      return NextResponse.json(
        { error: "Part ID and part number are required" },
        { status: 400 }
      );
    }

    // Check if updated part number already exists (excluding current part)
    const existingPart = await prisma.partInfo.findFirst({
      where: {
        partNumber,
        NOT: {
          id,
        },
      },
    });

    if (existingPart) {
      return NextResponse.json(
        { error: "Part number already exists" },
        { status: 400 }
      );
    }

    // Update part
    const updatedPart = await prisma.partInfo.update({
      where: { id },
      data: {
        partNumber,
        description,
        weight,
        dimensions,
      },
    });

    return NextResponse.json(updatedPart);
  } catch (error: unknown) {
    console.error("Update part error:", error);

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
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
