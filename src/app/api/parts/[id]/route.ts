import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

const prisma = new PrismaClient();

// Get a single part by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getAuthUser();
    const { id } = params;

    const part = await prisma.partInfo.findUnique({
      where: { id },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    return NextResponse.json(part);
  } catch (error: unknown) {
    console.error("Get part error:", error);

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

// Delete a part
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getAuthUser();
    const { id } = params;

    // Check if part exists
    const part = await prisma.partInfo.findUnique({
      where: { id },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Check if part is referenced by any MustGo requests
    const requests = await prisma.mustGoRequest.findFirst({
      where: { partNumber: part.partNumber },
    });

    if (requests) {
      return NextResponse.json(
        {
          error:
            "Cannot delete part: It is referenced by existing MustGo requests",
        },
        { status: 400 }
      );
    }

    // Delete the part
    await prisma.partInfo.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Part deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Delete part error:", error);

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
