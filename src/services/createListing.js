
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

export async function submitListingForReview({ details, photos, meetupAreaIds }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Please sign in again to submit your listing.");
  }

  if (photos.length < 1 || photos.length > 8) {
    throw new Error("Choose between 1 and 8 photos.");
  }

  if (photos.some((file) => !ACCEPTED_TYPES[file.type] || file.size > MAX_FILE_SIZE)) {
    throw new Error("Photos must be JPG, PNG, or WebP and no larger than 5 MB each.");
  }

  const whatsapp = details.whatsapp.trim();
  const phone = details.phone.trim();
  const contactEmail = details.contactEmail.trim();

  if (!whatsapp && !phone && !contactEmail) {
    throw new Error("Add at least one contact method.");
  }

  if (contactEmail && (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) {
    throw new Error("Enter a valid contact email address.");
  }

  const selectedAreas = details.meetupPolicy === "selected_areas"
    ? meetupAreaIds.map(Number)
    : [];

  if (details.meetupPolicy === "selected_areas" && !selectedAreas.length) {
    throw new Error("Choose at least one meetup area.");
  }

  const userId = authData.user.id;
  let submissionId = null;
  const uploadedPaths = [];

  try {
    const { data: submission, error: submissionError } = await supabase
      .from("listing_submissions")
      .insert({
        seller_id: userId,
        kind: "new",
        status: "draft",
        title: details.title.trim(),
        description: details.description.trim(),
        price: Number(details.price),
        category: details.category,
        condition: details.condition,
        locality_id: Number(details.localityId),
        meetup_policy: details.meetupPolicy,
        travel_note: details.travelNote.trim() || null,
        meetup_area_ids: selectedAreas,
        whatsapp_number: whatsapp || null,
        call_number: phone || null,
        contact_email: contactEmail || null,
      })
      .select("id")
      .single();

    if (submissionError) throw submissionError;
    submissionId = submission.id;

    for (const photo of photos) {
      const extension = ACCEPTED_TYPES[photo.type];
      const path = `${userId}/${submissionId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("review-images")
        .upload(path, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
    }

    const { error: imagesError } = await supabase
      .from("submission_images")
      .insert(
        uploadedPaths.map((storage_path, position) => ({
          submission_id: submissionId,
          storage_path,
          position,
        }))
      );

    if (imagesError) throw imagesError;

    const { error: submitError } = await supabase.rpc("submit_listing_for_review", {
      p_submission_id: submissionId,
    });

    if (submitError) throw submitError;

    return submissionId;
  } catch (error) {
    if (submissionId) {
      const { data: stored } = await supabase
        .from("listing_submissions")
        .select("status")
        .eq("id", submissionId)
        .maybeSingle();

      if (stored?.status === "pending_review") {
        return submissionId;
      }

      if (stored?.status === "draft") {
        if (uploadedPaths.length) {
          await supabase.storage.from("review-images").remove(uploadedPaths);
        }

        await supabase
          .from("listing_submissions")
          .delete()
          .eq("id", submissionId)
          .eq("status", "draft");
      }
    }

    throw error;
  }
}
