import { redirect } from "next/navigation";
import { getSignupLinkByToken } from "@/lib/actions/signup-links";
import { getThemeSettings } from "@/lib/settings/get-theme";
import { getSiteName } from "@/lib/settings/get-site-name";
import { JoinLandingPage } from "@/components/auth/JoinLandingPage";

export default async function JoinTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await getSignupLinkByToken(token);

  if (result.error || !result.link) {
    redirect("/auth/signup");
  }

  const theme = await getThemeSettings();
  const siteName = await getSiteName();

  return (
    <JoinLandingPage
      token={token}
      linkName={result.link.name}
      groupName={result.link.access_groups?.name}
      theme={theme}
      siteName={siteName}
    />
  );
}
