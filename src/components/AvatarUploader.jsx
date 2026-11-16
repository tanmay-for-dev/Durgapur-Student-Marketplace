
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const allowedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export default function AvatarUploader({ userId, displayName }) {
  const [avatarPath, setAvatarPath] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAvatar() {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_path")
        .eq("id", userId)
        .single();

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setAvatarPath(data.avatar_path);
      }
    }

    loadAvatar();

    return () => {
      active = false;
    };
  }, [userId]);

  const avatarUrl = avatarPath
    ? supabase.storage
        .from("avatars")
        .getPublicUrl(avatarPath).data.publicUrl
    : null;

  async function handleUpload() {
    if (!file || uploading) return;

    setError("");
    setMessage("");

    if (!allowedTypes[file.type]) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Your image must be smaller than 2 MB.");
      return;
    }

    setUploading(true);

    const extension = allowedTypes[file.type];
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", userId)
        .select("avatar_path")
        .single();

      if (updateError) {
        await supabase.storage.from("avatars").remove([path]);
        throw updateError;
      }

      const previousPath = avatarPath;

      setAvatarPath(path);
      setFile(null);
      setMessage("Profile picture updated successfully.");

      if (previousPath && previousPath !== path) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }
    } catch (err) {
      setError(err.message || "Couldn't upload your picture.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mb-8 rounded-[26px] bg-[#FFF5ED] p-5 sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#FFE1CC] text-4xl font-black text-[#D9733D] shadow-[4px_6px_15px_#EBC8B0]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Your profile"
              className="h-full w-full object-cover"
            />
          ) : (
            (displayName || "D").charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h3 className="text-lg font-black text-[#342720]">
            Profile picture
          </h3>

          <p className="mt-1 text-sm text-[#957A69]">
            Give your DGP Finds storefront a personal touch.
          </p>

          <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#C46D3C] shadow-sm transition hover:bg-[#FFE9DB]">
            Choose photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
                setMessage("");
              }}
              className="sr-only"
            />
          </label>

          {file && (
            <p className="mt-2 break-all text-xs text-[#9B8172]">
              {file.name}
            </p>
          )}

          <p className="mt-2 text-xs text-[#A48D80]">
            JPG, PNG or WebP. Maximum 2 MB.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm font-semibold text-[#A76840]">
          {message}
        </p>
      )}

      {file && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="orange-button mt-5 w-full justify-center disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload profile picture"}
        </button>
      )}
    </section>
  );
}
