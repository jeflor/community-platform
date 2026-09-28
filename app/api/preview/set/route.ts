import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PREVIEW_COOKIE_NAME = "admin_preview_state";

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin role using admin client
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { groupSlugs } = body;

    if (!Array.isArray(groupSlugs)) {
      return NextResponse.json(
        { error: "Invalid groupSlugs" },
        { status: 400 }
      );
    }

    // Set preview cookie
    const previewState = {
      active: true,
      groupSlugs,
    };

    const cookieStore = await cookies();
    cookieStore.set(PREVIEW_COOKIE_NAME, JSON.stringify(previewState), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Preview set error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
