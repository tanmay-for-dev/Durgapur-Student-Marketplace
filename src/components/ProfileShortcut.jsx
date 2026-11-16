
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

export default function ProfileShortcut() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let active = true;

    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_path")
        .eq("id", user.id)
        .maybeSingle();

      if (active) setProfile(data);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!user) return null;

  const avatarUrl = profile?.avatar_path
    ? supabase.storage
        .from("avatars")
        .getPublicUrl(profile.avatar_path).data.publicUrl
    : null;

  const initial = (profile?.display_name || "D")
    .charAt(0)
    .toUpperCase();

  return (
    <Link
      to="/profile"
      title="My profile"
      aria-label="Open my profile"
      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#F4773D] bg-[#FFF0E5] text-lg font-black text-[#D9733D] shadow-[3px_5px_12px_#E8CCB9] transition hover:scale-105"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </Link>
  );
}
