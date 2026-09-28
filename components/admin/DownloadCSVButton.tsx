"use client";

import { useState } from "react";
import { exportMembersCSV } from "@/lib/actions/admin";

export function DownloadCSVButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportMembersCSV();
      if (result.success && result.csv && result.filename) {
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Failed to export CSV:", result.error);
        alert("Failed to export CSV. Please try again.");
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("An error occurred while exporting. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {exporting ? "Downloading..." : "Download CSV"}
    </button>
  );
}
