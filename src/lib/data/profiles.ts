import { getSupabaseClient } from "../supabase/client";
import type { Profile, ProfileInsert, ProfileUpdate } from "../supabase/types";

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const upsertProfile = async (
  profile: ProfileInsert,
): Promise<Profile> => {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .upsert(profile)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateProfile = async (
  userId: string,
  profile: ProfileUpdate,
): Promise<Profile> => {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .update(profile)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const markProfileTermsAgreed = async (
  userId: string,
): Promise<Profile> => {
  const agreedAt = new Date().toISOString();
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .upsert(
      {
        id: userId,
        terms_agreed_at: agreedAt,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};
