"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileCheck2 } from "lucide-react";

/** Styled file picker with drag-and-drop, used for payment proofs / loan documents. */
export default function FileDropzone({ file, onChange, required, label = "Click to upload or drag and drop" }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList) {
    const f = fileList?.[0];
    if (f) onChange(f);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
        dragOver ? "border-brand-400 bg-brand-50" : file ? "border-accent-300 bg-accent-50" : "border-gray-300 hover:border-brand-300 hover:bg-gray-50"
      }`}
    >
      {file ? (
        <>
          <FileCheck2 className="h-6 w-6 text-accent-600" />
          <p className="text-sm font-medium text-gray-700">{file.name}</p>
          <p className="text-xs text-gray-400">Click to replace</p>
        </>
      ) : (
        <>
          <UploadCloud className="h-6 w-6 text-gray-400" />
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xs text-gray-400">Image or PDF</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        required={required && !file}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
