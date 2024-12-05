import { NextRequest } from "next/server";
import { Role, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  let client;
  try {
    client = new PrismaClient();

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await client.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return Response.json({ error: "User already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with PENDING role
    const user = await client.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: Role.PENDING,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return Response.json(
      {
        success: true,
        message: "User created successfully",
        userId: user.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  } finally {
    if (client) {
      await client.$disconnect();
    }
  }
}
