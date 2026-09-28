"use client";

import { useRef, useState, useEffect } from "react";

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function SimpleRichTextEditor({
  value,
  onChange,
  placeholder = "Enter content here...",
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (editorRef.current && isClient && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, isClient]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  if (!isClient) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 min-h-[300px] bg-gray-50">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-semibold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm underline"
          title="Underline"
        >
          U
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "<h2>")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "<h3>")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
          title="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "<p>")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
          title="Paragraph"
        >
          P
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
          title="Numbered List"
        >
          1. List
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={insertLink}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
          title="Insert Link"
        >
          🔗 Link
        </button>
      </div>

      {/* Content editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-4 min-h-[300px] max-h-[600px] overflow-y-auto focus:outline-none prose prose-sm max-w-none"
        data-placeholder={placeholder}
        style={{
          whiteSpace: "pre-wrap",
        }}
        suppressContentEditableWarning
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
