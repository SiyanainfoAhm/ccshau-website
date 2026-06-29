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

  if (!env) {
    if (pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = pathname === "/admin/login";

  if (!user && !isLogin) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

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
