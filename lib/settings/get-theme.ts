"use server";

import { createClient } from "@/lib/supabase/server";

export interface ThemeSettings {
  primary_color: string;
  background_color: string;
  gradient_start: string;
  gradient_end: string;
  sidebar_gradient: boolean;
  logo_url: string;
}

const DEFAULT_THEME: ThemeSettings = {
  primary_color: "#1E3A7A",
  background_color: "#FFFFFF",
  gradient_start: "#EAF0FB",
  gradient_end: "#FBF5D6",
  sidebar_gradient: true,
  logo_url: "",
};

export async function getThemeSettings(): Promise<ThemeSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["theme", "logo_url"]);

  if (error || !data) {
    return DEFAULT_THEME;
  }

  const settings = data.reduce(
    (acc, row) => {
      acc[row.key] = row.value;
      return acc;
    },
    {} as Record<string, string>
  );

  let theme = DEFAULT_THEME;

  if (settings.theme) {
    try {
      const parsedTheme = JSON.parse(settings.theme);
      theme = { ...DEFAULT_THEME, ...parsedTheme };
    } catch {
      // Use default if parsing fails
    }
  }

  if (settings.logo_url) {
    try {
      const parsedLogoUrl = JSON.parse(settings.logo_url);
      theme.logo_url = parsedLogoUrl;
    } catch {
      // Use default if parsing fails
    }
  }

  return theme;
}
