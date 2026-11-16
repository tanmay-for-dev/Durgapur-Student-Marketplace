
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import AvatarUploader from "../components/AvatarUploader.jsx";

export default function MyProfile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [localities, setLocalities] = useState([]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPageLoading(false);
      return;
    }

    let active = true;

    async function loadProfile() {
      setPageLoading(true);

      try {
        const [profileResult, localitiesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, display_name, bio, locality_id")
            .eq("id", user.id)
            .single(),
          supabase
            .from("localities")
            .select("id, name")
            .order("name"),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (localitiesResult.error) throw localitiesResult.error;

        if (!active) return;

        const profile = profileResult.data;

        setUsername(profile.username ?? "");
        setDisplayName(profile.display_name ?? "");
        setBio(profile.bio ?? "");
        setLocalityId(String(profile.locality_id ?? ""));
        setLocalities(localitiesResult.data ?? []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setPageLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id, authLoading]);

  async function handleSave(event) {
    event.preventDefault();

    const cleanUsername = username.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!/^[a-z][a-z0-9_]{2,39}$/.test(cleanUsername)) {
      setError(
        "Username must be 3–40 characters, start with a letter, and contain only lowercase letters, numbers or underscores."
      );
      return;
    }

    if (!cleanName || cleanName.length > 80) {
      setError("Display name must be between 1 and 80 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: cleanUsername,
        display_name: cleanName,
        bio: bio.trim() || null,
        locality_id: localityId ? Number(localityId) : null,
      })
      .eq("id", user.id)
      .select("id")
      .single();

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "That username is already taken. Try another."
          : updateError.message
      );
    } else {
      setUsername(cleanUsername);
      setDisplayName(cleanName);
      setMessage("Your profile has been updated successfully.");
    }

    setSaving(false);
  }

  async function handleLogout() {
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    navigate("/");
  }

  if (authLoading || pageLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFF9F5]">
        <p className="font-semibold text-[#B17D60]">Loading profile...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFF9F5] px-5">
        <div className="rounded-[30px] bg-white p-10 text-center">
          <h1 className="text-2xl font-black">Your profile awaits.</h1>
          <p className="mt-3 text-[#907769]">
            Sign in to manage your DGP Finds profile.
          </p>
          <Link
            to="/auth?mode=login&next=%2Fprofile"
            className="orange-button mt-6 inline-flex"
          >
            Continue to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] px-4 py-8 text-[#342720] md:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="back-pill"
        >
          ← Back to marketplace
        </Link>

        <div className="mt-8 overflow-hidden rounded-[32px] bg-white shadow-[10px_15px_35px_#ECD6C7]">
          <div className="bg-gradient-to-r from-[#FFE6D5] to-[#FFD0AC] px-6 py-9 md:px-10">
            <div className="flex items-center gap-5">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[26px] border-2 border-white bg-[#FFF6EF] text-4xl font-black text-[#D9723B] shadow-[5px_8px_18px_#E7B18E]">
                {displayName.charAt(0).toUpperCase() || "D"}
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-black md:text-3xl">
                  {displayName || "Your profile"}
                </h1>
                <p className="mt-1 break-all text-sm font-semibold text-[#9B694F]">
                  @{username}
                </p>
                <p className="mt-2 text-xs text-[#997760]">
                  Your DGP Finds account
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <div className="mb-8">
              <h2 className="text-xl font-black">Edit profile</h2>
              <p className="mt-2 text-sm text-[#907769]">
                Tell your neighborhood a little about yourself.
              </p>
            </div>
            <AvatarUploader
  userId={user.id}
  displayName={displayName}
/>
        
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase())
                  }
                  minLength={3}
                  maxLength={40}
                  required
                  className="w-full rounded-2xl border border-[#F1DCCE] bg-[#FFFBF8] px-4 py-4 outline-none focus:border-[#F4773D]"
                  placeholder="yourusername"
                />
                <p className="mt-2 text-xs text-[#A48D80]">
                  Your unique identity on DGP Finds.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  required
                  className="w-full rounded-2xl border border-[#F1DCCE] bg-[#FFFBF8] px-4 py-4 outline-none focus:border-[#F4773D]"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  About me
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-[#F1DCCE] bg-[#FFFBF8] px-4 py-4 outline-none focus:border-[#F4773D]"
                  placeholder="A little about yourself..."
                />
                <p className="mt-1 text-right text-xs text-[#A48D80]">
                  {bio.length}/300
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Your locality
                </label>
                <select
                  value={localityId}
                  onChange={(e) => setLocalityId(e.target.value)}
                  className="w-full rounded-2xl border border-[#F1DCCE] bg-[#FFFBF8] px-4 py-4 outline-none focus:border-[#F4773D]"
                >
                  <option value="">Select your area</option>
                  {localities.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </p>
              )}

              {message && (
                <p role="status" className="rounded-xl bg-[#FFF0E5] p-4 text-sm font-semibold text-[#98643D]">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="orange-button w-full justify-center disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save profile changes"}
              </button>
            </form>

            <div className="mt-10 border-t border-[#F3E5DC] pt-6">
              <p className="mb-4 break-all text-xs text-[#A48D80]">
                Signed in as {user.email}
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-bold text-[#B16D4A] hover:text-[#F4773D]"
              >
                Sign out →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
