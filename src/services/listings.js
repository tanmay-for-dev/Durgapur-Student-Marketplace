
import { supabase } from "../lib/supabase.js";

const listingFields = `
  id,
  title,
  description,
  price,
  category,
  condition,
  status,
  created_at,
  whatsapp_number,
  call_number,
  meetup_policy,
  travel_note,
  locality:localities!listings_locality_id_fkey(name),
  seller:profiles!listings_seller_id_fkey(username, display_name, avatar_path),
  images:listing_images(storage_path, position)
`;

function formatPosted(date) {
  const hours = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 3600000)
  );

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 30) return `${days}d ago`;

  return new Date(date).toLocaleDateString("en-IN");
}

function normalizeListing(listing) {
  const images = [...(listing.images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) =>
      supabase.storage
        .from("listing-images")
        .getPublicUrl(image.storage_path).data.publicUrl
    );

  return {
    id: listing.id,
    name: listing.title,
    description: listing.description,
    price: Number(listing.price),
    category: listing.category,
    condition: listing.condition,
    status: listing.status,
    location: listing.locality?.name ?? "Durgapur",
    exactLocation: listing.locality?.name ?? "Durgapur",
    posted: formatPosted(listing.created_at),
    createdAt: listing.created_at,
    username: listing.seller?.username ?? "Member",
    sellerName: listing.seller?.display_name ?? "DGP Finds Member",
    sellerAvatar: listing.seller?.avatar_path
  ? supabase.storage
      .from("avatars")
      .getPublicUrl(listing.seller.avatar_path).data.publicUrl
  : null,
    image: images[0] ?? null,
    images,
    whatsapp: listing.whatsapp_number,
    phone: listing.call_number,
    meetupPolicy: listing.meetup_policy,
    travelNote: listing.travel_note,
  };
}

export async function getListings() {
  const { data, error } = await supabase
    .from("listings")
    .select(listingFields)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;

  return (data ?? []).map(normalizeListing);
}

export async function getListingById(id) {
  const { data, error } = await supabase
    .from("listings")
    .select(listingFields)
    .eq("id", id)
    .in("status", ["available", "reserved", "sold"])
    .maybeSingle();

  if (error) throw error;

  return data ? normalizeListing(data) : null;
}
