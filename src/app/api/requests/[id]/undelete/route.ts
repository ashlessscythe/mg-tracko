import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import type { SessionUser } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can undelete requests" },
        { status: 403 }
      );
    }

    const request = await prisma.mustGoRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const undeletedRequest = await prisma.mustGoRequest.update({
      where: { id: params.id },
      data: {
        deleted: false,
        deletedAt: null,
        logs: {
          create: {
            action: "Request restored from deleted state",
            performedBy: user.id,
          },
        },
      },
    });

    return NextResponse.json(undeletedRequest);
  } catch (error) {
    console.error("Error undeleting request:", error);
    return NextResponse.json(
      { error: "Failed to undelete request" },
      { status: 500 }
    );
  }
}
