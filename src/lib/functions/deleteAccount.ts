import { getSupabaseClient } from "../supabase/client";

export type DeleteAccountResponse = {
  success: boolean;
};

export const deleteCurrentAccount = async (): Promise<DeleteAccountResponse> => {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error("No active Supabase session.");
  }

  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: {},
  });

  if (error) {
    throw error;
  }

  return data as DeleteAccountResponse;
};
