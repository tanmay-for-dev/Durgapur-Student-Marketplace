
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

export async function getHomepageListings(limit = 8) {
  const safeLimit = Math.min(
    8,
    Math.max(1, Math.floor(Number(limit) || 8))
  );

  const { data, error } = await supabase
    .from("listings")
    .select(listingFields)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  return (data ?? []).map(normalizeListing);
}

export async function getMarketplaceLocalities() {
  const { data, error } = await supabase
    .from("localities")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function getMarketplaceListings({
  search = "",
  category = "All",
  localityIds = [],
  conditions = [],
  minPrice = null,
  maxPrice = null,
  sort = "newest",
  availableOnly = true,
  page = 1,
  pageSize = 12,
} = {}) {
  const safePage = Math.max(
    1,
    Math.floor(Number(page) || 1)
  );

  const safePageSize = Math.min(
    24,
    Math.max(1, Math.floor(Number(pageSize) || 12))
  );

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from("listings")
    .select(listingFields, { count: "exact" });

  query = availableOnly
    ? query.eq("status", "available")
    : query.in("status", ["available", "reserved", "sold"]);

  const term = String(search ?? "").trim();

  if (term) {
    query = query.ilike("title", `%${term}%`);
  }

  if (
    category &&
    !["All", "Everything", "All finds"].includes(category)
  ) {
    query = query.eq("category", category);
  }

  if (localityIds.length) {
    const ids = localityIds.map(Number);

    if (
      ids.some(
        (id) => !Number.isSafeInteger(id) || id < 1
      )
    ) {
      throw new Error("Invalid locality filter.");
    }

    query = query.in("locality_id", ids);
  }

  if (conditions.length) {
    query = query.in("condition", conditions);
  }

  if (minPrice !== null && minPrice !== "") {
    const minimum = Number(minPrice);

    if (!Number.isFinite(minimum) || minimum < 0) {
      throw new Error("Invalid minimum price.");
    }

    query = query.gte("price", minimum);
  }

  if (maxPrice !== null && maxPrice !== "") {
    const maximum = Number(maxPrice);

    if (!Number.isFinite(maximum) || maximum < 0) {
      throw new Error("Invalid maximum price.");
    }

    query = query.lte("price", maximum);
  }

  if (sort === "price_low") {
    query = query.order("price", { ascending: true });
  } else if (sort === "price_high") {
    query = query.order("price", { ascending: false });
  } else if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  }

  if (sort !== "oldest") {
    query = query.order("created_at", { ascending: false });
  }

  query = query
    .order("id", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) throw error;

  const items = (data ?? []).map(normalizeListing);
  const totalCount = count ?? 0;

  return {
    items,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    hasMore: from + items.length < totalCount,
  };
}

export async function getHeroFeaturedListings() {
  const { data, error } = await supabase
    .from("listings")
    .select(listingFields)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(30);

  if (error) throw error;

  const candidates = (data ?? []).map(normalizeListing);
  const featured = [];
  const pickedIds = new Set();
  const pickedCategories = new Set();

  for (const listing of candidates) {
    const category = String(
      listing.category ?? "Other"
    ).trim().toLowerCase();

    if (pickedCategories.has(category)) continue;

    featured.push(listing);
    pickedIds.add(listing.id);
    pickedCategories.add(category);

    if (featured.length === 3) return featured;
  }

  for (const listing of candidates) {
    if (pickedIds.has(listing.id)) continue;

    featured.push(listing);
    pickedIds.add(listing.id);

    if (featured.length === 3) break;
  }

  return featured;
}
