import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const ITEM_IMAGES_BUCKET = "item-images";

type StorageEntry = {
  id: string | null;
  metadata: Record<string, unknown> | null;
  name: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const listStoragePaths = async (
  supabase: ReturnType<typeof createClient>,
  prefix: string,
): Promise<string[]> => {
  const bucket = supabase.storage.from(ITEM_IMAGES_BUCKET);
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw error;
    }

    const entries = (data ?? []) as StorageEntry[];
    if (entries.length === 0) break;

    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      const isFolder = entry.id === null || entry.metadata === null;

      if (isFolder) {
        paths.push(...(await listStoragePaths(supabase, path)));
      } else {
        paths.push(path);
      }
    }

    if (entries.length < 1000) break;
    offset += entries.length;
  }

  return paths;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = getRequiredEnv("APP_SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("APP_SUPABASE_SERVICE_ROLE_KEY");
    const authorizationHeader = request.headers.get("Authorization") ?? "";
    const jwt = authorizationHeader.replace(/^Bearer\s+/i, "");

    if (!jwt) {
      return jsonResponse({ error: "Missing authorization token." }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const storagePaths = await listStoragePaths(supabase, user.id);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(ITEM_IMAGES_BUCKET)
        .remove(storagePaths);

      if (storageError) {
        throw storageError;
      }
    }

    const { error: itemError } = await supabase
      .from("items")
      .delete()
      .eq("user_id", user.id);
    if (itemError) throw itemError;

    const { error: noSpendError } = await supabase
      .from("no_spend_days")
      .delete()
      .eq("user_id", user.id);
    if (noSpendError) throw noSpendError;

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (profileError) throw profileError;

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      user.id,
    );
    if (authDeleteError) throw authDeleteError;

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("delete-account failed", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete account.",
      },
      500,
    );
  }
});
