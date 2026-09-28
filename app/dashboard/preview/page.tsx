import { requireAdmin } from "@/lib/auth/require-admin";
import { getAccessGroups } from "@/lib/preview/preview-helpers";
import { PreviewModeSelector } from "@/components/preview/PreviewModeSelector";

export default async function PreviewPage() {
  await requireAdmin();
  
  const groups = await getAccessGroups();
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Preview Mode</h1>
        <p className="mt-2 text-gray-600">
          Test the community as a member with specific access groups
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <PreviewModeSelector groups={groups} />
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          How Preview Mode Works
        </h2>
        <ul className="space-y-2 text-blue-800">
          <li>• Select an access group to preview the site as a member of that group</li>
          <li>• Navigation and content will be filtered based on group permissions</li>
          <li>• Selecting "Paid Students" automatically includes "Free Members" access</li>
          <li>• A blue banner will appear at the top while previewing</li>
          <li>• Admin navigation remains accessible so you can exit or adjust settings</li>
          <li>• Click "Exit Preview" in the banner to return to full admin view</li>
        </ul>
      </div>
    </div>
  );
}
