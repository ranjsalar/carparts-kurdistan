import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Route-level gate for the admin area. The admin layout also checks the
// session, but App Router renders layouts and pages in parallel, so a layout
// redirect alone is not a security boundary — this proxy rejects non-admin
// requests before any /admin page code runs. Server actions additionally
// call requireAdmin() themselves (defense in depth).
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const loginUrl = new URL("/login", request.url);
    const token = request.cookies.get("carparts_session")?.value;
    if (!token) return NextResponse.redirect(loginUrl);

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET!),
      );
      if (payload.role !== "ADMIN") return NextResponse.redirect(loginUrl);
    } catch {
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};
