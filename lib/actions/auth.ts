"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const magicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function signUp(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    fullName: formData.get("fullName") as string,
  };

  const validation = signUpSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { email, password, fullName } = validation.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Handle signup link token if present
  const signupToken = formData.get("signupToken") as string | null;
  if (signupToken && data.user) {
    const { completeSignupLinkRegistration } = await import("@/lib/actions/signup-links");
    try {
      await completeSignupLinkRegistration(signupToken, data.user.id);
    } catch (err) {
      console.error("[Auth] Failed to complete signup link registration:", err);
    }
  }

  // Send welcome email (Phase 7)
  if (data.user) {
    const { sendWelcomeEmail } = await import("@/lib/email/actions");
    const { data: siteNameSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "site_name")
      .single();
    
    const siteName = (siteNameSetting?.value as string) || "Community Platform";
    
    sendWelcomeEmail({
      userId: data.user.id,
      userEmail: email,
      fullName,
      siteName,
    }).catch((err) => {
      console.error("[Auth] Failed to send welcome email:", err);
    });
  }

  revalidatePath("/", "layout");
  redirect("/auth/onboarding");
}

export async function signIn(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const validation = signInSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { email, password } = validation.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signInWithMagicLink(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
  };

  const validation = magicLinkSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { email } = validation.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Check your email for the magic link!" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function resetPasswordForEmail(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
  };

  const validation = magicLinkSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { email } = validation.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Check your email for the password reset link!" };
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
