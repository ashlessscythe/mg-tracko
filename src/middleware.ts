import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Routes that don't require authentication
const publicRoutes = [
  "/",
  "/signin",
  "/signup",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/session",
];

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/api/parts",
  "/api/requests",
  "/api/users",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const requiresAuth = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    // If accessing an API route, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // Otherwise redirect to signin
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  try {
    // Verify the JWT token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );
    const { payload } = await jwtVerify(token, secret);

    // Check for pending users
    if (payload.role === "PENDING" && pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    // For API routes, add user info to headers
    if (pathname.startsWith("/api/")) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", payload.userId as string);
      requestHeaders.set("x-user-role", payload.role as string);

      // Role-based access control for specific API routes
      const warehouseOnlyPaths = ["/api/warehouse"];
      const adminOnlyPaths = ["/api/admin", "/api/users"];

      if (
        warehouseOnlyPaths.some((path) => pathname.startsWith(path)) &&
        payload.role !== "WAREHOUSE" &&
        payload.role !== "ADMIN"
      ) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      if (
        adminOnlyPaths.some((path) => pathname.startsWith(path)) &&
        payload.role !== "ADMIN"
      ) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      return NextResponse.next({
        headers: requestHeaders,
      });
    }

    return NextResponse.next();
  } catch {
    // If token is invalid
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/signin", request.url));
  }
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
