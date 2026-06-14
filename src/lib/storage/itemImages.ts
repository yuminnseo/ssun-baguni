import { getSupabaseClient } from "../supabase/client";

export const ITEM_IMAGES_BUCKET = "item-images";

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "item-image";

export const createItemImagePath = ({
  date,
  fileName,
  timestamp = Date.now(),
  userId,
}: {
  date: string;
  fileName: string;
  timestamp?: number;
  userId: string;
}) => `${userId}/${date}/${timestamp}-${sanitizeFileName(fileName)}`;

export const uploadItemImage = async ({
  date,
  file,
  userId,
}: {
  date: string;
  file: File;
  userId: string;
}): Promise<string> => {
  const supabase = getSupabaseClient();
  const path = createItemImagePath({
    date,
    fileName: file.name,
    userId,
  });
  const { error } = await supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(ITEM_IMAGES_BUCKET).getPublicUrl(path);

  return data.publicUrl;
};

export const getItemImageObjectPathFromPublicUrl = (
  imageUrl: string | null | undefined,
) => {
  if (!imageUrl || imageUrl.startsWith("/items/")) return null;

  let url: URL;

  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }

  const publicPathPrefix = `/storage/v1/object/public/${ITEM_IMAGES_BUCKET}/`;
  const prefixIndex = url.pathname.indexOf(publicPathPrefix);

  if (prefixIndex === -1) return null;

  const objectPath = decodeURIComponent(
    url.pathname.slice(prefixIndex + publicPathPrefix.length),
  );

  return objectPath.length > 0 ? objectPath : null;
};

export const deleteItemImages = async ({
  originalImageUrl,
  removedBgImageUrl,
  userId,
}: {
  originalImageUrl: string | null | undefined;
  removedBgImageUrl: string | null | undefined;
  userId: string;
}) => {
  const paths = [
    getItemImageObjectPathFromPublicUrl(originalImageUrl),
    getItemImageObjectPathFromPublicUrl(removedBgImageUrl),
  ].filter((path): path is string =>
    Boolean(path && path.split("/")[0] === userId),
  );
  const uniquePaths = [...new Set(paths)];

  if (uniquePaths.length === 0) return;

  const { error } = await getSupabaseClient()
    .storage
    .from(ITEM_IMAGES_BUCKET)
    .remove(uniquePaths);

  if (error) {
    throw error;
  }
};
