import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const ITEM_IMAGES_BUCKET = "item-images";
const REPLICATE_BACKGROUND_REMOVER_VERSION =
  "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

type Item = {
  date: string;
  id: string;
  original_image_url: string | null;
  removed_bg_image_url: string | null;
  user_id: string;
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

const isRemovedBackgroundUrl = (item: Item) =>
  Boolean(
    item.original_image_url &&
      item.removed_bg_image_url &&
      item.removed_bg_image_url !== item.original_image_url &&
      item.removed_bg_image_url.includes("/removed-bg/"),
  );

const getPredictionOutputUrl = (output: unknown): string | null => {
  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    const firstUrl = output.find((entry) => typeof entry === "string");
    return typeof firstUrl === "string" ? firstUrl : null;
  }

  if (output && typeof output === "object") {
    const values = Object.values(output);
    const firstUrl = values.find((entry) => typeof entry === "string");
    return typeof firstUrl === "string" ? firstUrl : null;
  }

  return null;
};

const removeBackgroundToStorage = async ({
  imageUrl,
  storagePath,
  supabase,
}: {
  imageUrl: string;
  storagePath: string;
  supabase: ReturnType<typeof createClient>;
}) => {
  const prediction = await createReplicatePrediction(imageUrl);
  const completedPrediction = await waitForReplicatePrediction(prediction);
  const replicateImageUrl = getPredictionOutputUrl(completedPrediction.output);

  if (!replicateImageUrl) {
    throw new Error("Replicate prediction did not return an image URL.");
  }

  const imageResponse = await fetch(replicateImageUrl);

  if (!imageResponse.ok) {
    throw new Error(
      `Failed to download Replicate output: ${imageResponse.status}`,
    );
  }

  const imageBytes = await imageResponse.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .upload(storagePath, imageBytes, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  return publicUrlData.publicUrl;
};

const createReplicatePrediction = async (imageUrl: string) => {
  const replicateToken = getRequiredEnv("REPLICATE_API_TOKEN");
  const response = await fetch(
    "https://api.replicate.com/v1/predictions",
    {
      body: JSON.stringify({
        version: REPLICATE_BACKGROUND_REMOVER_VERSION,
        input: {
          background_type: "rgba",
          image: imageUrl,
        },
      }),
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate prediction failed: ${response.status} ${errorText}`);
  }

  return response.json();
};

const waitForReplicatePrediction = async (
  prediction: Record<string, unknown>,
) => {
  const replicateToken = getRequiredEnv("REPLICATE_API_TOKEN");
  let currentPrediction = prediction;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const status = currentPrediction.status;

    if (status === "succeeded") return currentPrediction;
    if (status === "failed" || status === "canceled") {
      throw new Error(`Replicate prediction ended with status: ${status}`);
    }

    const getUrl =
      currentPrediction.urls &&
      typeof currentPrediction.urls === "object" &&
      "get" in currentPrediction.urls
        ? currentPrediction.urls.get
        : null;

    if (typeof getUrl !== "string") {
      throw new Error("Replicate prediction did not include a polling URL.");
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const response = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${replicateToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Replicate polling failed: ${response.status} ${errorText}`);
    }

    currentPrediction = await response.json();
  }

  throw new Error("Replicate prediction timed out.");
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

    const requestBody = await request.json();
    const { date, image_url, item_id, temp_key, user_id } = requestBody;

    if (typeof image_url === "string" && image_url.includes("/removed-bg/")) {
      return jsonResponse({
        removed_bg_image_url: image_url,
        skipped: true,
      });
    }

    if (typeof image_url === "string" && typeof item_id !== "string") {
      if (typeof user_id !== "string" || user_id !== user.id) {
        return jsonResponse({ error: "user_id must match the signed-in user." }, 403);
      }

      if (typeof date !== "string" || date.length === 0) {
        return jsonResponse({ error: "date is required." }, 400);
      }

      if (typeof temp_key !== "string" || temp_key.length === 0) {
        return jsonResponse({ error: "temp_key is required." }, 400);
      }

      const storagePath = `${user.id}/${date}/removed-bg/pending-${temp_key}.png`;
      const removedBgImageUrl = await removeBackgroundToStorage({
        imageUrl: image_url,
        storagePath,
        supabase,
      });

      return jsonResponse({
        removed_bg_image_url: removedBgImageUrl,
        skipped: false,
      });
    }

    if (typeof item_id !== "string" || item_id.length === 0) {
      return jsonResponse({ error: "item_id or image_url is required." }, 400);
    }

    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("id,user_id,date,original_image_url,removed_bg_image_url")
      .eq("id", item_id)
      .eq("user_id", user.id)
      .single();

    if (itemError || !itemData) {
      return jsonResponse({ error: "Item not found." }, 404);
    }

    const item = itemData as Item;

    if (!item.original_image_url) {
      return jsonResponse({ error: "Item does not have an original image." }, 400);
    }

    if (isRemovedBackgroundUrl(item)) {
      return jsonResponse({
        item,
        removed_bg_image_url: item.removed_bg_image_url,
        skipped: true,
      });
    }

    const storagePath = `${user.id}/${item.date}/removed-bg/${item.id}.png`;
    const removedBgImageUrl = await removeBackgroundToStorage({
      imageUrl: item.original_image_url,
      storagePath,
      supabase,
    });

    const { data: updatedItem, error: updateError } = await supabase
      .from("items")
      .update({
        removed_bg_image_url: removedBgImageUrl,
      })
      .eq("id", item.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({
      item: updatedItem,
      removed_bg_image_url: removedBgImageUrl,
      skipped: false,
    });
  } catch (error) {
    console.error("remove-item-background failed", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove item background.",
      },
      500,
    );
  }
});
