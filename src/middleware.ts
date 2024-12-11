import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Check for pending users first - they should only access the pending page
    if (token?.role === "PENDING" && pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }

    // Role-based access control
    if (
      pathname.startsWith("/api/warehouse") ||
      pathname.startsWith("/warehouse")
    ) {
      if (token?.role !== "WAREHOUSE" && token?.role !== "ADMIN") {
        return new NextResponse("Access Denied", { status: 403 });
      }
    }

    if (pathname.startsWith("/api/admin") || pathname.startsWith("/admin")) {
      if (token?.role !== "ADMIN") {
        return new NextResponse("Access Denied", { status: 403 });
      }
    }

    // Reports access control
    if (pathname.startsWith("/reports")) {
      if (token?.role !== "ADMIN" && token?.role !== "REPORT_RUNNER") {
        return new NextResponse("Access Denied", { status: 403 });
      }
    }

    // Only allow active users (non-pending) to access protected routes
    if (token?.role === "PENDING") {
      return new NextResponse("Access Denied", { status: 403 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/requests/:path*",
    "/reports/:path*",
    "/api/requests/:path*",
    "/api/warehouse/:path*",
    "/api/admin/:path*",
    "/warehouse/:path*",
    "/admin/:path*",
  ],
};
