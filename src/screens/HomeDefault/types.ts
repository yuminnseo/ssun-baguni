import type { SlotItemsByDate } from "../../lib/data/cartSlotAdapter";

export type RequiredAgreementKey = "age" | "privacy" | "terms";
export type ItemFlowStep = "price" | "details" | null;
export type WithdrawStep = "warning" | "final";
export type ProcessingBannerStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completing"
  | "completed"
  | "failed";

export type ProcessingBannerState = {
  imageUrl: string;
  progress: number;
  status: ProcessingBannerStatus;
};

export type PendingItemCreateSnapshot = {
  backgroundRemovalAlreadyFailed: boolean;
  backgroundRemovalPromise: Promise<string | null> | null;
  category: string;
  didChangeTime: boolean;
  elapsedMs: number | null;
  existingItemsCount: number;
  fallbackImageSrc: string;
  hadNoSpendDay: boolean;
  hasSelectedImageFile: boolean;
  imageFile: File | null;
  itemTime: string;
  originalImageUploadPromise: Promise<string> | null;
  pendingRemovedBgImageUrl: string;
  price: number;
  priceInput: string;
  reason: string;
  targetCart: {
    dateKey: string;
    id: string;
    imageAlt: string;
  };
  targetDate: string;
  uploadedOriginalImageUrl: string;
  userId: string;
};

export type HomeProcessingBannerProps = {
  imageSrc: string;
  progress: number;
  status: ProcessingBannerStatus;
};

export type ItemDetailMetadata = {
  categoryId: string;
  reasonId: string;
  time: string;
};

export type DetailOverlayState = {
  cartId: string;
  itemId: string;
  isClosing: boolean;
} | null;

export type EditingItemState = {
  cartId: string;
  itemId: string;
} | null;

export type DbReadStatus = "idle" | "loading" | "ready" | "error";

export type DbCartDataState = {
  loadedDateKeys: Set<string>;
  noSpendDateKeys: Set<string>;
  slotItemsByDate: SlotItemsByDate;
  status: DbReadStatus;
};
