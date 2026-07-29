import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { findActiveRedirect } from "@/lib/redirects/lookup";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

async function handleLegacyRedirect(request: NextRequest): Promise<NextResponse | null> {
  const env = getPublicSupabaseEnv();
  if (!env) return null;

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return null;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const redirect = await findActiveRedirect(supabase, pathname);
  if (!redirect) return null;

  return NextResponse.redirect(new URL(redirect.newPath, request.url), redirect.redirectType);
}

async function handleAdminAuth(request: NextRequest): Promise<NextResponse> {
  const env = getPublicSupabaseEnv();
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-pathname", pathname);

  const isPublicAuthPage =
    pathname === "/admin/login" ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password";

  const isRecoveryFlow = request.cookies.get("ccshau_recovery")?.value === "1";

  if (!env) {
    if (!isPublicAuthPage) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicAuthPage) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Recovery sessions may only use the reset-password page until password is updated.
  if (user && isRecoveryFlow && pathname !== "/admin/reset-password") {
    return NextResponse.redirect(new URL("/admin/reset-password", request.url));
  }

  // Do not redirect authenticated users away from /admin/login here.
  // Supabase auth alone does not imply CMS access; the login page checks
  // getAdminSession() and redirects only valid admin sessions.

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    const redirectResponse = await handleLegacyRedirect(request);
    if (redirectResponse) return redirectResponse;
    return NextResponse.next();
  }

  return handleAdminAuth(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
