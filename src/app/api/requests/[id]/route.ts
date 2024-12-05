import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

const prisma = new PrismaClient();

// Get a single MustGo request by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getAuthUser(); // Ensure user is authenticated
    const { id } = params;

    const request = await prisma.mustGoRequest.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: {
            timestamp: "desc",
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error: unknown) {
    console.error("Get request error:", error);

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

// Delete a MustGo request
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser();
    const { id } = params;

    // First, check if the request exists
    const request = await prisma.mustGoRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Delete associated logs first (due to foreign key constraint)
    await prisma.requestLog.deleteMany({
      where: { mustGoRequestId: id },
    });

    // Then delete the request
    await prisma.mustGoRequest.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Request deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Delete request error:", error);

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
