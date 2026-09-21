"use client";

import { useEffect, useState } from "react";
import { Images, Inbox, Trash2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Reveal from "@/components/Reveal";
import FileDropzone from "@/components/FileDropzone";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";
import { uploadToCloudinary } from "@/lib/cloudinary";

function GalleryContent() {
  const { authedFetch } = useAuth();
  const [images, setImages] = useState(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    authedFetch("/api/admin/gallery").then((d) => setImages(d.images || []));
  }

  useEffect(load, [authedFetch]);

  async function submitUpload(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!file) {
      setError("Please choose a photo to upload.");
      return;
    }
    setSubmitting(true);
    try {
      const imageUrl = await uploadToCloudinary(file, "gallery");
      await authedFetch("/api/admin/gallery", { method: "POST", body: JSON.stringify({ imageUrl, caption }) });
      setMessage("Photo added to the gallery.");
      setCaption("");
      setFile(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authedFetch(`/api/admin/gallery/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Images className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
          <p className="text-sm text-gray-500">Photos shown in the "Our Activities" section on the homepage.</p>
        </div>
      </div>

      {message && <p className="mt-4 animate-fade-in-up text-sm text-green-700">{message}</p>}
      {error && !deleteTarget && <p className="mt-4 animate-fade-in-up text-sm text-red-600">{error}</p>}

      <Reveal>
        <h2 className="mt-8 text-lg font-semibold text-gray-900">Add a Photo</h2>
        <form onSubmit={submitUpload} className="mt-3 space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <FileDropzone file={file} onChange={setFile} label="Click to upload or drag and drop a photo" />
          <input
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
          <Button type="submit" loading={submitting}>
            Add to Gallery
          </Button>
        </form>
      </Reveal>

      <h2 className="mt-10 text-lg font-semibold text-gray-900">All Photos</h2>
      {images === null && (
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      )}
      {images?.length === 0 && (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border bg-white py-16 text-gray-400 shadow-sm">
          <Inbox className="h-8 w-8" />
          No photos yet
        </div>
      )}
      {images && images.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <Reveal key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.imageUrl} alt={img.caption || "Gallery photo"} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setDeleteTarget(img)}
                  className="ml-auto flex items-center justify-center rounded-full bg-white/90 p-1.5 text-red-600 shadow hover:bg-white"
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <p className="truncate text-xs text-white">{formatDate(img.createdAt)}</p>
              </div>
              {img.caption && (
                <p className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-xs text-white group-hover:hidden">
                  {img.caption}
                </p>
              )}
            </Reveal>
          ))}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete photo"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">This photo will be removed from the homepage gallery. This can't be undone.</p>
      </Modal>
    </main>
  );
}

export default function AdminGallery() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <GalleryContent />
    </ProtectedRoute>
  );
}
