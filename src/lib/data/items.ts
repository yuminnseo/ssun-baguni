import { getSupabaseClient } from "../supabase/client";
import type { Item, ItemInsert, ItemUpdate } from "../supabase/types";

export type ItemsByDate = Record<string, Item[]>;

export const listItemsByDate = async (
  userId: string,
  date: string,
): Promise<Item[]> => {
  const { data, error } = await getSupabaseClient()
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
};

export const listItemsInDateRange = async (
  userId: string,
  startDate: string,
  endDate: string,
): Promise<ItemsByDate> => {
  const { data, error } = await getSupabaseClient()
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data.reduce<ItemsByDate>((itemsByDate, item) => {
    itemsByDate[item.date] = [...(itemsByDate[item.date] ?? []), item];
    return itemsByDate;
  }, {});
};

export const createItem = async (item: ItemInsert): Promise<Item> => {
  const { data, error } = await getSupabaseClient()
    .from("items")
    .insert(item)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateItem = async (
  itemId: string,
  item: ItemUpdate,
): Promise<Item> => {
  const { data, error } = await getSupabaseClient()
    .from("items")
    .update(item)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteItem = async (itemId: string): Promise<Item> => {
  const { data, error } = await getSupabaseClient()
    .from("items")
    .delete()
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};
