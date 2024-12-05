import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  // Paths that don't require authentication
  const publicPaths = ["/api/auth/login", "/api/auth/register"];

  if (publicPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.headers.get("authorization")?.split(" ")[1];

  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    // Verify the JWT token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );

    const { payload } = await jwtVerify(token, secret);

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId as string);
    requestHeaders.set("x-user-role", payload.role as string);

    // Role-based access control
    const warehouseOnlyPaths = ["/api/warehouse"];
    const adminOnlyPaths = ["/api/admin"];

    if (
      warehouseOnlyPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
      ) &&
      payload.role !== "WAREHOUSE" &&
      payload.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (
      adminOnlyPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
      ) &&
      payload.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.next({
      headers: requestHeaders,
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

// Configure which routes use this middleware
export const config = {
  matcher: "/api/:path*",
};
