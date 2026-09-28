"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { DocumentWithAccess } from "@/lib/actions/documents";
import {
  createDocument,
  updateDocument,
  getAccessGroups,
  uploadDocumentAsset,
} from "@/lib/actions/documents";
import { SimpleRichTextEditor } from "./SimpleRichTextEditor";

interface DocumentEditorProps {
  document: DocumentWithAccess | null;
}

export function DocumentEditor({ document }: DocumentEditorProps) {
  const router = useRouter();
  const isNew = !document;

  const [title, setTitle] = useState(document?.title || "");
  const [slug, setSlug] = useState(document?.slug || "");
  const [body, setBody] = useState(document?.body || "");
  const [coverUrl, setCoverUrl] = useState(document?.cover_url || "");
  const [videoUrl, setVideoUrl] = useState(document?.video_url || "");
  const [isPublished, setIsPublished] = useState(document?.is_published ?? true);
  const [lockedMessage, setLockedMessage] = useState(
    document?.locked_message || ""
  );
  const [visibility, setVisibility] = useState<"show_locked" | "hide">(
    document?.visibility || "show_locked"
  );
  const [attachments, setAttachments] = useState<
    Array<{ name: string; url: string; type: string }>
  >(document?.attachments || []);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    document?.groups?.map((g) => g.id) || []
  );

  const [availableGroups, setAvailableGroups] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Load available groups
  useEffect(() => {
    getAccessGroups().then(setAvailableGroups);
  }, []);

  // Auto-generate slug from title for new documents
  useEffect(() => {
    if (isNew && title && !slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generatedSlug);
    }
  }, [title, slug, isNew]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        // Create new document
        const result = await createDocument({
          slug,
          title,
          body,
          cover_url: coverUrl || undefined,
          video_url: videoUrl || undefined,
          attachments,
          is_published: isPublished,
          locked_message: lockedMessage || undefined,
          visibility,
          group_ids: selectedGroupIds,
        });

        if (result.success) {
          router.push(`/resources/${slug}`);
          router.refresh();
        } else {
          setError(result.error || "Failed to create document");
        }
      } else {
        // Update existing document
        const result = await updateDocument(document!.id, {
          title,
          body,
          cover_url: coverUrl || undefined,
          video_url: videoUrl || undefined,
          attachments,
          is_published: isPublished,
          locked_message: lockedMessage || undefined,
          visibility,
          group_ids: selectedGroupIds,
        });

        if (result.success) {
          router.push(`/resources/${slug}`);
          router.refresh();
        } else {
          setError(result.error || "Failed to update document");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      setError("Cover must be an image file");
      return;
    }

    // Use document ID if editing, or generate a temp ID if creating
    const uploadDocId = document?.id || `temp-${Date.now()}`;

    setUploadingCover(true);
    setError(null);

    try {
      const result = await uploadDocumentAsset(uploadDocId, file, "cover");
      if (result.success && result.url) {
        setCoverUrl(result.url);
      } else {
        setError(result.error || "Failed to upload cover");
      }
    } catch (err) {
      setError("An error occurred while uploading");
      console.error(err);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  };

  const handleAttachmentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use document ID if editing, or generate a temp ID if creating
    const uploadDocId = document?.id || `temp-${Date.now()}`;

    setUploadingAttachment(true);
    setError(null);

    try {
      const result = await uploadDocumentAsset(uploadDocId, file, "attachment");
      if (result.success && result.url) {
        setAttachments([
          ...attachments,
          { name: file.name, url: result.url, type: file.type },
        ]);
      } else {
        setError(result.error || "Failed to upload attachment");
      }
    } catch (err) {
      setError("An error occurred while uploading");
      console.error(err);
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    }
  };

  const handleAddAttachmentUrl = () => {
    const name = prompt("Attachment name:");
    if (!name) return;

    const url = prompt("Attachment URL:");
    if (!url) return;

    const type = prompt("Attachment type (optional):");

    setAttachments([...attachments, { name, url, type: type || "" }]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <a
          href={isNew ? "/resources" : `/resources/${slug}`}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← {isNew ? "Back to Resources" : "Cancel"}
        </a>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {isNew ? "Create Document" : "Edit Document"}
        </h1>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="Enter document title"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slug * {!isNew && <span className="text-gray-500">(locked)</span>}
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!isNew}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
            placeholder="document-slug"
          />
          <p className="mt-1 text-sm text-gray-500">
            URL will be: /resources/{slug || "document-slug"}
          </p>
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Image
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileSelect}
                disabled={uploadingCover}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingCover ? "Uploading..." : "Choose File"}
              </button>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Or paste image URL"
              />
            </div>
            <p className="text-sm text-gray-500">
              Recommended: 16:9 aspect ratio (e.g., 1600×900px)
            </p>
            {coverUrl && (
              <div className="mt-2 rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: "16 / 9", maxWidth: "400px" }}>
                <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Video URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video URL (YouTube, Vimeo, Loom)
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <SimpleRichTextEditor
            value={body}
            onChange={setBody}
            placeholder="Enter document content..."
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments
          </label>
          <div className="space-y-2 mb-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-xl">📎</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {attachment.name}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {attachment.url}
                  </div>
                  {attachment.type && (
                    <div className="text-xs text-gray-400">{attachment.type}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              ref={attachmentInputRef}
              type="file"
              onChange={handleAttachmentFileSelect}
              disabled={uploadingAttachment}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={uploadingAttachment}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingAttachment ? "Uploading..." : "+ Upload File"}
            </button>
            <button
              type="button"
              onClick={handleAddAttachmentUrl}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              + Add URL
            </button>
          </div>
        </div>

        {/* Published Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
            Published (visible to members with access)
          </label>
        </div>

        {/* Locked Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Locked Message Override (optional)
          </label>
          <input
            type="text"
            value={lockedMessage}
            onChange={(e) => setLockedMessage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="This document is available to premium members."
          />
          <p className="mt-1 text-sm text-gray-500">
            Leave empty to use site default
          </p>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visibility for Non-Members
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="show_locked"
                checked={visibility === "show_locked"}
                onChange={() => setVisibility("show_locked")}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Show with locked message
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="hide"
                checked={visibility === "hide"}
                onChange={() => setVisibility("hide")}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Hide (404)</span>
            </label>
          </div>
        </div>

        {/* Access Groups */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Groups
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Leave unselected to allow all authenticated users. Select groups to
            restrict access.
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
            {availableGroups.length === 0 ? (
              <p className="text-sm text-gray-500">No groups available</p>
            ) : (
              availableGroups.map((group) => (
                <label key={group.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {group.name}{" "}
                    <span className="text-gray-500">({group.slug})</span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
