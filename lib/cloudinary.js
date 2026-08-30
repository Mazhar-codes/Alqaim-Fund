"use client";

/**
 * Uploads a file straight from the browser to Cloudinary using an unsigned
 * upload preset — no secret key ever touches the client. Returns the
 * resulting secure_url, which is all our API routes store (payment proofs,
 * loan/emergency supporting documents).
 */
export async function uploadToCloudinary(file, folder) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured (missing NEXT_PUBLIC_CLOUDINARY_* env vars)");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  if (folder) formData.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");

  return data.secure_url;
}
