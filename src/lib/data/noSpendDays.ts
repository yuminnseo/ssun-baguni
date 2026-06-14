import { getSupabaseClient } from "../supabase/client";
import type {
  NoSpendDay,
  NoSpendDayInsert,
  NoSpendDayUpdate,
} from "../supabase/types";

export const listNoSpendDaysInDateRange = async (
  userId: string,
  startDate: string,
  endDate: string,
): Promise<NoSpendDay[]> => {
  const { data, error } = await getSupabaseClient()
    .from("no_spend_days")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
};

export const getNoSpendDay = async (
  userId: string,
  date: string,
): Promise<NoSpendDay | null> => {
  const { data, error } = await getSupabaseClient()
    .from("no_spend_days")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const createNoSpendDay = async (
  noSpendDay: NoSpendDayInsert,
): Promise<NoSpendDay> => {
  const { data, error } = await getSupabaseClient()
    .from("no_spend_days")
    .insert(noSpendDay)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const upsertNoSpendDay = async (
  noSpendDay: NoSpendDayInsert,
): Promise<NoSpendDay> => {
  const { data, error } = await getSupabaseClient()
    .from("no_spend_days")
    .upsert(noSpendDay, { onConflict: "user_id,date" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateNoSpendDay = async (
  noSpendDayId: string,
  noSpendDay: NoSpendDayUpdate,
): Promise<NoSpendDay> => {
  const { data, error } = await getSupabaseClient()
    .from("no_spend_days")
    .update(noSpendDay)
    .eq("id", noSpendDayId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteNoSpendDay = async (
  userId: string,
  date: string,
): Promise<void> => {
  const { error } = await getSupabaseClient()
    .from("no_spend_days")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);

  if (error) {
    throw error;
  }
};
