import { getItemCategoryLabel } from "../data/itemCategories";
import type { ShareImagePayload, ShareImageResult } from "./shareImage";

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;
const BASE_WIDTH = 375;
const SCALE = EXPORT_WIDTH / BASE_WIDTH;
const LOGICAL_HEIGHT = EXPORT_HEIGHT / SCALE;
const BRAND_BOTTOM = 36 * SCALE;
const BRAND_FONT_SIZE = 14 * SCALE;
const BRAND_LINE_HEIGHT = 16 * SCALE;
const IMAGE_TIMEOUT_MS = 8000;
const FONT_TIMEOUT_MS = 1600;
const NO_SPEND_STICKER_SRC = "/sticker/no-spend-day.svg";
const PERFORATION_TEXT = "* * * * * * * * * * * * * * * * * * * * * * * * * * *";
const ITEM_TIMES = ["09:12", "10:11", "12:14", "21:21"];
const PRINTER_BORDER = "rgba(113, 113, 122, 0.08)";
const PRINTER_FRAME_BOTTOM = "#E5E5E8";
const PRINTER_FRAME_TOP = "#FDFDFF";
const PRINTER_PAPER = "#F4F4F5";
const PRINTER_SHADOW = "rgba(17, 17, 17, 0.13)";
const PRINTER_SLOT_BOTTOM = "#FFFFFF";
const PRINTER_SLOT_INNER_BOTTOM = "#BCBCC0";
const PRINTER_SLOT_INNER_TOP = "#4C4C50";
const PRINTER_SLOT_TOP = "#DCDCE1";

const RECEIPT_LAYOUT = {
  contentWidth: 240,
  itemImageSize: 52,
  itemListGap: 16,
  itemListPaddingY: 12,
  itemTextWidth: 122,
  paperPaddingX: 20,
  paperPaddingY: 32,
  printerHeight: 80,
  printerPaperHeight: 68,
  printerPaperWidth: 312,
  printerRadius: 12,
  printerSlotHeight: 10,
  printerSlotPadding: 2,
  printerSlotWidth: 296,
  printerWidth: 324,
  receiptWidth: 280,
} as const;

type LoadedImage = {
  image: HTMLImageElement;
  ok: true;
};

type FailedImage = {
  ok: false;
};

const toFileDate = (dateKey: string) => dateKey.replaceAll(".", "-");

const getFallbackFileName = (dateKey: string) =>
  `ssun-baguni-receipt-${toFileDate(dateKey)}.png`;

const formatWonAmount = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

const resolveImageUrl = (src: string) => new URL(src, window.location.href).href;

const satoshiFont = (weight: number, size: number) =>
  `${weight} ${size * SCALE}px Satoshi, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;

const pretendardFont = (weight: number, size: number) =>
  `${weight} ${size * SCALE}px Pretendard, Satoshi, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;

const waitForCanvasFonts = async () => {
  if (!("fonts" in document)) return;

  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, FONT_TIMEOUT_MS);
  });
  const fonts = Promise.all([
    document.fonts.load("600 80px Satoshi", "₩10,000"),
    document.fonts.load("600 40px Pretendard", "카페·간식"),
    document.fonts.load("400 38px Satoshi", PERFORATION_TEXT),
    document.fonts.load("500 42px Satoshi", "@ssun_baguni"),
  ]).then(() => undefined);

  await Promise.race([fonts, timeout]).catch((error) => {
    console.warn("Share receipt canvas font readiness failed.", error);
  });
};

const loadCanvasImage = async (
  src: string,
  label: string,
): Promise<LoadedImage | FailedImage> => {
  if (!src) return { ok: false };

  return new Promise((resolve) => {
    const image = new Image();
    const timeoutId = window.setTimeout(() => {
      console.error(`Share receipt canvas ${label} image timed out.`, { src });
      resolve({ ok: false });
    }, IMAGE_TIMEOUT_MS);

    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      window.clearTimeout(timeoutId);

      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        console.error(`Share receipt canvas ${label} image has no natural size.`, { src });
        resolve({ ok: false });
        return;
      }

      image.decode().catch(() => undefined).finally(() => {
        resolve({ image, ok: true });
      });
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      console.error(`Share receipt canvas ${label} image failed to load.`, { src });
      resolve({ ok: false });
    };
    image.src = resolveImageUrl(src);
  });
};

const createExportCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  return { canvas, context };
};

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

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const drawBrand = (context: CanvasRenderingContext2D) => {
  context.save();
  context.fillStyle = "#27272A";
  context.font =
    `500 ${BRAND_FONT_SIZE}px Satoshi, Pretendard, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    "@ssun_baguni",
    EXPORT_WIDTH / 2,
    EXPORT_HEIGHT - BRAND_BOTTOM - BRAND_LINE_HEIGHT / 2,
  );
  context.restore();
};

const drawImageContain = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
};

const drawPrinter = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
) => {
  const width = RECEIPT_LAYOUT.printerWidth * SCALE;
  const height = RECEIPT_LAYOUT.printerHeight * SCALE;
  const framePadding = 6 * SCALE;
  const paperWidth = RECEIPT_LAYOUT.printerPaperWidth * SCALE;
  const paperHeight = RECEIPT_LAYOUT.printerPaperHeight * SCALE;
  const slotWidth = RECEIPT_LAYOUT.printerSlotWidth * SCALE;
  const slotHeight =
    (RECEIPT_LAYOUT.printerSlotHeight + RECEIPT_LAYOUT.printerSlotPadding * 2) *
    SCALE;
  const slotX = x + (width - slotWidth) / 2;
  const slotY = y + 33 * SCALE;
  const paperX = x + framePadding;
  const paperY = y + framePadding;

  context.save();
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.filter = "none";
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  const frameGradient = context.createLinearGradient(0, y, 0, y + height);
  frameGradient.addColorStop(0, PRINTER_FRAME_TOP);
  frameGradient.addColorStop(1, PRINTER_FRAME_BOTTOM);
  context.shadowColor = PRINTER_SHADOW;
  context.shadowBlur = 6 * SCALE;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 2 * SCALE;
  context.fillStyle = frameGradient;
  roundedRect(context, x, y, width, height, RECEIPT_LAYOUT.printerRadius * SCALE);
  context.fill();
  context.shadowColor = "transparent";
  context.strokeStyle = PRINTER_BORDER;
  context.lineWidth = 1 * SCALE;
  roundedRect(
    context,
    x + 0.5 * SCALE,
    y + 0.5 * SCALE,
    width - SCALE,
    height - SCALE,
    RECEIPT_LAYOUT.printerRadius * SCALE,
  );
  context.stroke();
  context.fillStyle = PRINTER_PAPER;
  roundedRect(
    context,
    paperX,
    paperY,
    paperWidth,
    paperHeight,
    8 * SCALE,
  );
  context.fill();

  const slotGradient = context.createLinearGradient(0, slotY, 0, slotY + slotHeight);
  slotGradient.addColorStop(0, PRINTER_SLOT_TOP);
  slotGradient.addColorStop(1, PRINTER_SLOT_BOTTOM);
  context.fillStyle = slotGradient;
  roundedRect(context, slotX, slotY, slotWidth, slotHeight, 999 * SCALE);
  context.fill();

  const slotInnerGradient = context.createLinearGradient(
    0,
    slotY + RECEIPT_LAYOUT.printerSlotPadding * SCALE,
    0,
    slotY +
      (RECEIPT_LAYOUT.printerSlotPadding + RECEIPT_LAYOUT.printerSlotHeight) *
        SCALE,
  );
  slotInnerGradient.addColorStop(0, PRINTER_SLOT_INNER_TOP);
  slotInnerGradient.addColorStop(1, PRINTER_SLOT_INNER_BOTTOM);
  context.fillStyle = slotInnerGradient;
  roundedRect(
    context,
    slotX + RECEIPT_LAYOUT.printerSlotPadding * SCALE,
    slotY + RECEIPT_LAYOUT.printerSlotPadding * SCALE,
    (RECEIPT_LAYOUT.printerSlotWidth - RECEIPT_LAYOUT.printerSlotPadding * 2) *
      SCALE,
    RECEIPT_LAYOUT.printerSlotHeight * SCALE,
    999 * SCALE,
  );
  context.fill();
  context.restore();
};

const getReceiptPaperHeight = (itemCount: number, isNoSpend: boolean) => {
  const baseContent =
    40 +
    10 +
    40 +
    10 +
    RECEIPT_LAYOUT.itemListPaddingY * 2;
  const itemRows = Math.max(itemCount, 1) * RECEIPT_LAYOUT.itemImageSize;
  const gaps = Math.max(itemCount - 1, 0) * RECEIPT_LAYOUT.itemListGap;
  const emptyHeight = isNoSpend ? 168 : 128;

  return (
    RECEIPT_LAYOUT.paperPaddingY * 2 +
    baseContent +
    (itemCount > 0 ? itemRows + gaps : emptyHeight)
  );
};

const drawPerforation = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) => {
  context.save();
  context.fillStyle = "rgba(17, 17, 17, 0.44)";
  context.font = satoshiFont(400, 13);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(PERFORATION_TEXT, x + width / 2, y);
  context.restore();
};

const drawDefinitionRow = (
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) => {
  context.save();
  context.font = satoshiFont(400, 13);
  context.textBaseline = "top";
  context.textAlign = "left";
  context.fillStyle = "rgba(17, 17, 17, 0.44)";
  context.fillText(label, x, y);
  context.textAlign = "right";
  context.fillStyle = "#27272A";
  context.fillText(value, x + width, y);
  context.restore();
};

const drawItemPlaceholder = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  context.save();
  context.fillStyle = "rgba(17, 17, 17, 0.08)";
  roundedRect(context, x, y, size, size, 12 * SCALE);
  context.fill();
  context.fillStyle = "rgba(17, 17, 17, 0.48)";
  context.font = satoshiFont(500, 11);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("ITEM", x + size / 2, y + size / 2);
  context.restore();
};

const drawReceiptItems = async (
  context: CanvasRenderingContext2D,
  payload: ShareImagePayload,
  x: number,
  y: number,
  width: number,
) => {
  const loadedItems = await Promise.all(
    payload.items.map(async (item) => ({
      item,
      loadedImage: await loadCanvasImage(item.imageSrc, "item"),
    })),
  );

  loadedItems.forEach(({ item, loadedImage }, index) => {
    const rowY =
      y +
      index *
        (RECEIPT_LAYOUT.itemImageSize + RECEIPT_LAYOUT.itemListGap) *
        SCALE;
    const imageSize = RECEIPT_LAYOUT.itemImageSize * SCALE;
    const textX = x + (RECEIPT_LAYOUT.itemImageSize + 12) * SCALE;
    const price = formatWonAmount(item.amount);

    if (loadedImage.ok) {
      drawImageContain(context, loadedImage.image, x, rowY, imageSize, imageSize);
    } else {
      drawItemPlaceholder(context, x, rowY, imageSize);
    }

    context.save();
    context.textBaseline = "top";
    context.textAlign = "left";
    context.fillStyle = "rgba(17, 17, 17, 0.44)";
    context.font = satoshiFont(400, 13);
    context.fillText(ITEM_TIMES[index] ?? "21:21", textX, rowY - 1 * SCALE);
    context.fillStyle = "#27272A";
    context.font = pretendardFont(600, 14);
    context.fillText(
      getItemCategoryLabel(item.category),
      textX,
      rowY + 20 * SCALE,
      RECEIPT_LAYOUT.itemTextWidth * SCALE,
    );
    context.textAlign = "right";
    context.font = satoshiFont(500, 14);
    context.fillText(price, x + width, rowY + 16 * SCALE);
    context.restore();
  });
};

const drawNoSpend = async (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) => {
  const loadedSticker = await loadCanvasImage(NO_SPEND_STICKER_SRC, "no-spend sticker");
  const size = 120 * SCALE;
  const stickerX = x + width / 2 - size / 2;
  const stickerY = y + 24 * SCALE;

  if (loadedSticker.ok) {
    drawImageContain(context, loadedSticker.image, stickerX, stickerY, size, size);
    return;
  }

  context.save();
  context.fillStyle = "#111111";
  roundedRect(context, x + 46 * SCALE, y + 62 * SCALE, 148 * SCALE, 44 * SCALE, 12 * SCALE);
  context.fill();
  context.fillStyle = "#FFFFFF";
  context.font = pretendardFont(500, 18);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("무지출 DAY", x + width / 2, y + 84 * SCALE);
  context.restore();
};

const drawEmptyReceipt = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) => {
  context.save();
  context.fillStyle = "rgba(17, 17, 17, 0.48)";
  context.font = pretendardFont(500, 14);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("구매 기록이 없어요", x + width / 2, y + 64 * SCALE);
  context.restore();
};

const drawReceiptTopShadow = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  paperHeight: number,
) => {
  const shadowHeight = Math.max(2 * SCALE, paperHeight * 0.0244);
  const shadow = context.createLinearGradient(0, y, 0, y + shadowHeight);

  shadow.addColorStop(0, "rgba(17, 17, 17, 0.78)");
  shadow.addColorStop(1, "rgba(165, 165, 168, 0)");

  context.save();
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.filter = "none";
  context.shadowColor = "transparent";
  context.beginPath();
  context.rect(x, y, width, shadowHeight);
  context.clip();
  context.fillStyle = shadow;
  context.fillRect(x, y, width, shadowHeight);
  context.restore();
};

export const createReceiptCanvasFallback = async (
  payload: ShareImagePayload,
): Promise<ShareImageResult> => {
  await waitForCanvasFonts();

  const { canvas, context } = createExportCanvas();
  const isNoSpend = payload.hasNoSpendDay && payload.items.length === 0;
  const paperHeight = getReceiptPaperHeight(payload.items.length, isNoSpend);
  const clusterHeight = RECEIPT_LAYOUT.printerHeight + paperHeight;
  const printerX = (BASE_WIDTH - RECEIPT_LAYOUT.printerWidth) / 2;
  const printerY = (LOGICAL_HEIGHT - clusterHeight) / 2;
  const paperX =
    printerX + (RECEIPT_LAYOUT.printerWidth - RECEIPT_LAYOUT.receiptWidth) / 2;
  const paperY = printerY + 35;
  const contentX = paperX + RECEIPT_LAYOUT.paperPaddingX;
  const contentY = paperY + RECEIPT_LAYOUT.paperPaddingY;
  const contentWidth = RECEIPT_LAYOUT.contentWidth;

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  drawPrinter(context, printerX * SCALE, printerY * SCALE);

  context.save();
  context.shadowColor = "rgba(17, 17, 17, 0.12)";
  context.shadowBlur = 16 * SCALE;
  context.shadowOffsetX = 1 * SCALE;
  context.shadowOffsetY = 6 * SCALE;
  context.fillStyle = payload.cart.receiptColor ?? payload.cart.accentBgColor;
  context.fillRect(
    paperX * SCALE,
    paperY * SCALE,
    RECEIPT_LAYOUT.receiptWidth * SCALE,
    paperHeight * SCALE,
  );
  context.restore();
  drawReceiptTopShadow(
    context,
    paperX * SCALE,
    paperY * SCALE,
    RECEIPT_LAYOUT.receiptWidth * SCALE,
    paperHeight * SCALE,
  );

  context.save();
  context.fillStyle = "#27272A";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = satoshiFont(600, 28);
  context.fillText(`₩${formatWonAmount(payload.totalAmount)}`, contentX * SCALE, contentY * SCALE);
  context.restore();

  let cursorY = contentY + 40;
  drawPerforation(
    context,
    contentX * SCALE,
    cursorY * SCALE,
    contentWidth * SCALE,
  );
  cursorY += 26;
  drawDefinitionRow(
    context,
    "DATE",
    payload.cart.dateKey,
    contentX * SCALE,
    cursorY * SCALE,
    contentWidth * SCALE,
  );
  cursorY += 20;
  drawDefinitionRow(
    context,
    "ITEM COUNT",
    String(payload.items.length).padStart(2, "0"),
    contentX * SCALE,
    cursorY * SCALE,
    contentWidth * SCALE,
  );
  cursorY += 24;
  drawPerforation(
    context,
    contentX * SCALE,
    cursorY * SCALE,
    contentWidth * SCALE,
  );
  cursorY += 28;

  if (payload.items.length > 0) {
    await drawReceiptItems(
      context,
      payload,
      contentX * SCALE,
      cursorY * SCALE,
      contentWidth * SCALE,
    );
  } else if (isNoSpend) {
    await drawNoSpend(
      context,
      contentX * SCALE,
      cursorY * SCALE,
      contentWidth * SCALE,
    );
  } else {
    drawEmptyReceipt(
      context,
      contentX * SCALE,
      cursorY * SCALE,
      contentWidth * SCALE,
    );
  }

  drawBrand(context);

  const blob = await blobFromCanvas(canvas);
  const dataUrl = canvas.toDataURL("image/png");

  if (blob.size <= 0 || !dataUrl.startsWith("data:image/png")) {
    throw new Error("Failed to create receipt share image data.");
  }

  return {
    blob,
    dataUrl,
    fileName: getFallbackFileName(payload.cart.dateKey),
  };
};
