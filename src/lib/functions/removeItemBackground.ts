import { getSupabaseClient } from "../supabase/client";
import type { Item } from "../supabase/types";

export type RemoveItemBackgroundResponse = {
  item?: Item;
  removed_bg_image_url?: string;
  skipped?: boolean;
};

export type RemoveItemBackgroundPayload =
  | {
      item_id: string;
    }
  | {
      date: string;
      image_url: string;
      temp_key: string;
      user_id: string;
    };

export const removeItemBackground = async (
  payload: RemoveItemBackgroundPayload,
): Promise<RemoveItemBackgroundResponse> => {
  const { data, error } = await getSupabaseClient().functions.invoke(
    "remove-item-background",
    {
      body: payload,
    },
  );

  if (error) {
    throw error;
  }

  return data as RemoveItemBackgroundResponse;
};
