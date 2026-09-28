import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always allow /auth/callback (OAuth flow needs this)
  if (request.nextUrl.pathname === "/auth/callback") {
    return supabaseResponse;
  }

  // Always allow /auth/deactivated page
  if (request.nextUrl.pathname === "/auth/deactivated") {
    return supabaseResponse;
  }

  // Protected routes - redirect unauthenticated users to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    const redirectResponse = NextResponse.redirect(url);
    
    // Preserve cookies on redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
  }

  // Check if authenticated user is deactivated or needs onboarding
  if (user) {
    // Check protected routes: /dashboard, /pulse, /courses, /resources, /chat, /search, /support
    const protectedPaths = ["/dashboard", "/pulse", "/courses", "/resources", "/chat", "/search", "/support"];
    const isProtectedRoute = protectedPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    );

    if (isProtectedRoute) {
      // Query user's is_active and onboarding status
      const { data: userData } = await supabase
        .from("users")
        .select("is_active, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (userData && !userData.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/deactivated";
        const redirectResponse = NextResponse.redirect(url);
        
        // Preserve cookies on redirect
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        
        return redirectResponse;
      }

      // Redirect to onboarding if not completed
      if (userData && !userData.onboarding_completed) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/onboarding";
        const redirectResponse = NextResponse.redirect(url);
        
        // Preserve cookies on redirect
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        
        return redirectResponse;
      }
    }
  }

  // Redirect authenticated users away from auth pages (except callback and onboarding)
  if (
    user &&
    (request.nextUrl.pathname === "/auth/login" ||
      request.nextUrl.pathname === "/auth/signup")
  ) {
    // Check if user needs onboarding
    const { data: userData } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = userData?.onboarding_completed ? "/dashboard" : "/auth/onboarding";
    const redirectResponse = NextResponse.redirect(url);
    
    // Preserve cookies on redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
  }

  return supabaseResponse;
}
