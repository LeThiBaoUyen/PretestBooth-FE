import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "refreshToken";

const protectedPrefixes = [
  "/dashboard",
  "/admin",
  "/exams",
  "/exam",
  "/practice",
  "/problems",
  "/question-bank",
  "/questions",
  "/quiz",
  "/submissions",
  "/leaderboard",
  "/booths/booking",
  "/booth/check-in",
];

const guestOnlyRoutes = ["/login", "/register", "/forgot", "/reset"];

function pathStartsWith(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const forceGuestAccess = request.nextUrl.searchParams.get("force") === "1";

  const requiresAuth = protectedPrefixes.some((prefix) =>
    pathStartsWith(pathname, prefix),
  );

  if (requiresAuth && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const isGuestOnly = guestOnlyRoutes.some((route) => pathStartsWith(pathname, route));
  if (isGuestOnly && hasSession && !forceGuestAccess) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
