"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface OnboardingQuestion {
  id: string;
  text: string;
  required: boolean;
  include_in_bio: boolean;
  private: boolean;
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const answersJson = formData.get("answers") as string;
    const questionsJson = formData.get("questions") as string;
    const profilePicture = formData.get("profilePicture") as File | null;

    const answers = JSON.parse(answersJson) as Record<string, string>;
    const questions = JSON.parse(questionsJson) as OnboardingQuestion[];

    // Build bio from answers to questions marked for inclusion
    const bioSegments: string[] = [];
    for (const question of questions) {
      if (question.include_in_bio && answers[question.id]) {
        bioSegments.push(answers[question.id]);
      }
    }
    const bio = bioSegments.join("\n\n");

    // Upload profile picture if provided
    let avatarUrl: string | null = null;
    if (profilePicture && profilePicture.size > 0) {
      const fileExt = profilePicture.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, profilePicture, {
          upsert: true,
          contentType: profilePicture.type,
        });

      if (uploadError) {
        console.error("Failed to upload avatar:", uploadError);
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }
    }

    // Update user record
    const updateData: {
      onboarding_completed: boolean;
      onboarding_responses: Record<string, string>;
      bio?: string;
      avatar_url?: string;
    } = {
      onboarding_completed: true,
      onboarding_responses: answers,
    };

    if (bio) {
      updateData.bio = bio;
    }

    if (avatarUrl) {
      updateData.avatar_url = avatarUrl;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update user:", updateError);
      return { error: "Failed to save your profile. Please try again." };
    }

    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Onboarding error:", error);
    return { error: "An unexpected error occurred" };
  }

  redirect("/dashboard");
}
