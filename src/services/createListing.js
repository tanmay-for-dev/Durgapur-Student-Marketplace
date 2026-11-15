
import { supabase } from "../lib/supabase.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function getLocalities() {
  const { data, error } = await supabase
    .from("localities")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function publishListing({ details, photos, meetupAreaIds }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Please sign in again to publish your listing.");
  }

  if (photos.length < 1 || photos.length > 8) {
    throw new Error("Choose between 1 and 8 photos.");
  }

  if (
    photos.some(
      (file) => !ACCEPTED_TYPES[file.type] || file.size > MAX_FILE_SIZE
    )
  ) {
    throw new Error(
      "Photos must be JPG, PNG, or WebP and no larger than 5 MB each."
    );
  }

  const userId = authData.user.id;
  let listingId = null;
  const uploadedPaths = [];

  try {
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert({
        seller_id: userId,
        title: details.title.trim(),
        description: details.description.trim(),
        price: Number(details.price),
        category: details.category,
        condition: details.condition,
        locality_id: Number(details.localityId),
        meetup_policy: details.meetupPolicy,
        travel_note: details.travelNote.trim() || null,
        whatsapp_number: details.whatsapp.trim() || null,
        call_number: details.phone.trim() || null,
        status: "draft",
      })
      .select("id")
      .single();

    if (listingError) throw listingError;
    listingId = listing.id;

    for (const photo of photos) {
      const extension = ACCEPTED_TYPES[photo.type];
      const path = `${userId}/${listingId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedPaths.push(path);
    }

    const { error: imagesError } = await supabase
      .from("listing_images")
      .insert(
        uploadedPaths.map((storage_path, position) => ({
          listing_id: listingId,
          storage_path,
          position,
        }))
      );

    if (imagesError) throw imagesError;

    if (details.meetupPolicy === "selected_areas") {
      const { error: meetupError } = await supabase
        .from("listing_meetup_areas")
        .insert(
          meetupAreaIds.map((locality_id) => ({
            listing_id: listingId,
            locality_id: Number(locality_id),
          }))
        );

      if (meetupError) throw meetupError;
    }

    const { data: published, error: publishError } = await supabase
      .from("listings")
      .update({ status: "available" })
      .eq("id", listingId)
      .eq("seller_id", userId)
      .select("id")
      .single();

    if (publishError) throw publishError;

    return published.id;
  } catch (error) {
    if (listingId) {
      const { error: removalError } = uploadedPaths.length
        ? await supabase.storage.from("listing-images").remove(uploadedPaths)
        : { error: null };

      if (!removalError) {
        await supabase
          .from("listings")
          .delete()
          .eq("id", listingId)
          .eq("seller_id", userId);
      }
    }

    throw error;
  }
}
