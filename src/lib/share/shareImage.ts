import { toPng } from "html-to-image";
import type { SlotItem } from "../../components/CartSlotItems";

export type ShareImageView = "cart" | "receipt";

export type ShareImageCart = {
  accentBgColor: string;
  cardBgColor: string;
  dateKey: string;
  id: string;
  imageAlt: string;
  imageSrc: string;
  receiptColor?: string;
};

export type ShareImagePayload = {
  cart: ShareImageCart;
  hasNoSpendDay: boolean;
  items: SlotItem[];
  targetElement: HTMLElement;
  totalAmount: number;
  view: ShareImageView;
};

export type ShareImageResult = {
  blob: Blob;
  dataUrl: string;
  fileName: string;
};

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;
const DESIGN_WIDTH = 375;
const EXPORT_SCALE = EXPORT_WIDTH / DESIGN_WIDTH;
const BRAND_BOTTOM = 36 * EXPORT_SCALE;
const BRAND_FONT_SIZE = 14 * EXPORT_SCALE;
const BRAND_LINE_HEIGHT = 16 * EXPORT_SCALE;
const RECEIPT_MIN_TOP = 100 * EXPORT_SCALE;

const toFileDate = (dateKey: string) => dateKey.replaceAll(".", "-");

export const getShareImageFileName = (view: ShareImageView, dateKey: string) =>
  `ssun-baguni-${view}-${toFileDate(dateKey)}.png`;

const waitForFonts = async () => {
  if (!("fonts" in document)) return;

  await document.fonts.load(`500 ${BRAND_FONT_SIZE}px Satoshi`, "@ssun_baguni");
  await document.fonts.ready;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load captured image."));
    image.src = src;
  });

const blobFromCanvas = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create PNG blob."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });

const getCanvasContext = () => {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  return { canvas, context };
};

const drawBrand = (context: CanvasRenderingContext2D) => {
  context.save();
  context.fillStyle = "#27272A";
  context.font = `500 ${BRAND_FONT_SIZE}px "Satoshi", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    "@ssun_baguni",
    EXPORT_WIDTH / 2,
    EXPORT_HEIGHT - BRAND_BOTTOM - BRAND_LINE_HEIGHT / 2,
  );
  context.restore();
};

const drawReceiptGradient = (context: CanvasRenderingContext2D) => {
  const gradientHeight = 106 * EXPORT_SCALE;
  const gradient = context.createLinearGradient(
    0,
    EXPORT_HEIGHT - gradientHeight,
    0,
    EXPORT_HEIGHT,
  );

  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(0.5, "#FFFFFF");
  context.fillStyle = gradient;
  context.fillRect(0, EXPORT_HEIGHT - gradientHeight, EXPORT_WIDTH, gradientHeight);
};

const getTargetPlacement = ({
  image,
  view,
}: {
  image: HTMLImageElement;
  view: ShareImageView;
}) => {
  const maxWidth = view === "receipt" ? 930 : 900;
  const maxHeight =
    view === "receipt"
      ? EXPORT_HEIGHT - RECEIPT_MIN_TOP - BRAND_BOTTOM - BRAND_LINE_HEIGHT - 48
      : EXPORT_HEIGHT - BRAND_BOTTOM - BRAND_LINE_HEIGHT - 120;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1.85);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (EXPORT_WIDTH - width) / 2;
  let y = (EXPORT_HEIGHT - height) / 2;

  if (view === "receipt") {
    y = Math.max(RECEIPT_MIN_TOP, y);
  }

  return { height, width, x, y };
};

const captureTarget = async (targetElement: HTMLElement) => {
  const rect = targetElement.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error("Share target is not visible.");
  }

  return toPng(targetElement, {
    backgroundColor: "transparent",
    cacheBust: true,
    pixelRatio: 3,
    skipFonts: false,
  });
};

export const createShareImage = async ({
  cart,
  targetElement,
  view,
}: ShareImagePayload): Promise<ShareImageResult> => {
  if (typeof document === "undefined") {
    throw new Error("Document is not available.");
  }

  await waitForFonts();

  const capturedDataUrl = await captureTarget(targetElement);
  const capturedImage = await loadImage(capturedDataUrl);
  const { canvas, context } = getCanvasContext();
  const placement = getTargetPlacement({ image: capturedImage, view });

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  context.drawImage(
    capturedImage,
    placement.x,
    placement.y,
    placement.width,
    placement.height,
  );

  if (view === "receipt") {
    drawReceiptGradient(context);
  }
  drawBrand(context);

  const blob = await blobFromCanvas(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL("image/png"),
    fileName: getShareImageFileName(view, cart.dateKey),
  };
};
