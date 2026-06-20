import type { SlotItem } from "../../components/CartSlotItems";
import {
  CART_ARTICLE_LAYOUT,
  PRICE_TAG_LAYOUT,
  RECEIPT_CONTENT_LAYOUT,
  SHARE_BASE_WIDTH,
  SHARE_TYPOGRAPHY,
} from "./cartShareLayout";
import type { ShareImagePayload, ShareImageResult } from "./shareImage";

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;
const SCALE = EXPORT_WIDTH / SHARE_BASE_WIDTH;
const LOGICAL_HEIGHT = EXPORT_HEIGHT / SCALE;
const ARTICLE_X = (SHARE_BASE_WIDTH - CART_ARTICLE_LAYOUT.width) / 2;
const ARTICLE_Y = (LOGICAL_HEIGHT - CART_ARTICLE_LAYOUT.height) / 2;
const BRAND_BOTTOM = 36 * SCALE;
const BRAND_FONT_SIZE = 14 * SCALE;
const BRAND_LINE_HEIGHT = 16 * SCALE;
const IMAGE_TIMEOUT_MS = 8000;
const FONT_TIMEOUT_MS = 1600;
const NO_SPEND_STICKER_SRC = "/sticker/no-spend-day.svg";
const PRICE_TAG_SHAPE_PATH =
  "M79 20C79 22.2091 77.2091 24 75 24L4 24C1.79086 24 0 22.2091 0 20L0 4C0 1.79086 1.79086 0 4 0L75 0C77.2091 0 79 1.79086 79 4V20ZM8 10C6.89543 10 6 10.8954 6 12C6 13.1046 6.89543 14 8 14C9.10457 14 10 13.1046 10 12C10 10.8954 9.10457 10 8 10Z";

type LoadedImage = {
  image: HTMLImageElement;
  ok: true;
};

type FailedImage = {
  ok: false;
};

type Point = {
  x: number;
  y: number;
};

const toFileDate = (dateKey: string) => dateKey.replaceAll(".", "-");

const getFallbackFileName = (dateKey: string) =>
  `ssun-baguni-cart-${toFileDate(dateKey)}.png`;

const formatWonAmount = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const resolveImageUrl = (src: string) => new URL(src, window.location.href).href;

const satoshiFont = (weight: number, size: number) =>
  `${weight} ${size * SCALE}px Satoshi, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;

const pretendardFont = (weight: number, size: number) =>
  `${weight} ${size * SCALE}px Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;

const logicalSatoshiFont = (weight: number, size: number) =>
  `${weight} ${size}px Satoshi, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;

const waitForCanvasFonts = async () => {
  if (!("fonts" in document)) return;

  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, FONT_TIMEOUT_MS);
  });
  const fonts = Promise.all([
    document.fonts.load(
      `${SHARE_TYPOGRAPHY.captionMedium.weight} ${SHARE_TYPOGRAPHY.captionMedium.size * SCALE}px Satoshi`,
      "* * * * *",
    ),
    document.fonts.load(
      `${SHARE_TYPOGRAPHY.headline.weight} ${SHARE_TYPOGRAPHY.headline.size * SCALE}px Satoshi`,
      "₩10,000",
    ),
    document.fonts.load("500 42px Satoshi", "@ssun_baguni"),
    document.fonts.load("500 52px Pretendard", "무지출 DAY"),
  ]).then(() => undefined);

  await Promise.race([fonts, timeout]).catch((error) => {
    console.warn("Share canvas font readiness failed.", error);
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
      console.error(`Share canvas ${label} image timed out.`, { src });
      resolve({ ok: false });
    }, IMAGE_TIMEOUT_MS);

    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      window.clearTimeout(timeoutId);

      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        console.error(`Share canvas ${label} image has no natural size.`, { src });
        resolve({ ok: false });
        return;
      }

      image.decode().catch(() => undefined).finally(() => {
        resolve({ image, ok: true });
      });
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      console.error(`Share canvas ${label} image failed to load.`, { src });
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

const rotatePoint = (point: Point, angle: number) => {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

const getArticlePoint = (x: number, y: number) => ({
  x: (ARTICLE_X + x) * SCALE,
  y: (ARTICLE_Y + y) * SCALE,
});

const getCartPoint = (x: number, y: number) =>
  getArticlePoint(
    CART_ARTICLE_LAYOUT.cartX + x,
    CART_ARTICLE_LAYOUT.cartTop + y,
  );

const getPriceTagWidth = (amount: number) => {
  const price = formatWonAmount(amount);
  const measurer = document.createElement("canvas").getContext("2d");

  if (!measurer) return PRICE_TAG_LAYOUT.minWidth;

  measurer.font = satoshiFont(
    SHARE_TYPOGRAPHY.labelSmall.weight,
    SHARE_TYPOGRAPHY.labelSmall.size,
  );

  const textWidth =
    measurer.measureText("₩").width / SCALE +
    2 +
    measurer.measureText(price).width / SCALE;

  return Math.max(
    PRICE_TAG_LAYOUT.minWidth,
    PRICE_TAG_LAYOUT.paddingLeft +
      PRICE_TAG_LAYOUT.paddingRight +
      Math.max(PRICE_TAG_LAYOUT.textMinWidth, textWidth),
  );
};

const getTagBasePosition = (item: SlotItem) => {
  const tagWidthForClamp = Math.max(
    PRICE_TAG_LAYOUT.width,
    39 + formatWonAmount(item.amount).length * 8,
  );

  return {
    x: clamp(
      item.x + item.tagOffset.x,
      16,
      CART_ARTICLE_LAYOUT.cartWidth - tagWidthForClamp - 4,
    ),
    y: clamp(
      item.y + item.tagOffset.y,
      2,
      CART_ARTICLE_LAYOUT.cartHeight - PRICE_TAG_LAYOUT.height - 2,
    ),
  };
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

const drawReceiptCard = (
  context: CanvasRenderingContext2D,
  cardBgColor: string,
  totalAmount: number,
) => {
  const receipt = getArticlePoint(
    CART_ARTICLE_LAYOUT.receiptX,
    CART_ARTICLE_LAYOUT.receiptY,
  );
  const receiptWidth = CART_ARTICLE_LAYOUT.receiptWidth * SCALE;
  const receiptHeight = CART_ARTICLE_LAYOUT.receiptHeight * SCALE;
  const contentX = receipt.x + RECEIPT_CONTENT_LAYOUT.paddingX * SCALE;
  const contentY = receipt.y + RECEIPT_CONTENT_LAYOUT.paddingTop * SCALE;
  const contentWidth = RECEIPT_CONTENT_LAYOUT.width * SCALE;
  const rowY =
    contentY +
    (RECEIPT_CONTENT_LAYOUT.starHeight + RECEIPT_CONTENT_LAYOUT.gap) * SCALE;
  const price = formatWonAmount(totalAmount);

  context.save();
  context.shadowColor = "rgba(17, 17, 17, 0.18)";
  context.shadowBlur = 6 * SCALE;
  context.shadowOffsetY = 1 * SCALE;
  context.fillStyle = cardBgColor || "#FFF8C7";
  context.fillRect(receipt.x, receipt.y, receiptWidth, receiptHeight);
  context.shadowColor = "transparent";
  context.fillStyle = "#27272A";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = satoshiFont(
    SHARE_TYPOGRAPHY.captionMedium.weight,
    SHARE_TYPOGRAPHY.captionMedium.size,
  );
  context.fillText("* * * * * * * * * * * * * * *", contentX, contentY - 1 * SCALE);
  context.font = satoshiFont(
    SHARE_TYPOGRAPHY.captionSmall.weight,
    SHARE_TYPOGRAPHY.captionSmall.size,
  );
  context.fillText("TOTAL", contentX, rowY + 2 * SCALE);

  context.font = satoshiFont(
    SHARE_TYPOGRAPHY.headline.weight,
    SHARE_TYPOGRAPHY.headline.size,
  );
  const wonWidth = context.measureText("₩").width;
  const priceWidth = context.measureText(price).width;
  const priceX =
    contentX +
    contentWidth -
    wonWidth -
    RECEIPT_CONTENT_LAYOUT.priceGap * SCALE -
    priceWidth;

  context.fillText("₩", priceX, rowY - 1 * SCALE);
  context.fillText(
    price,
    priceX + wonWidth + RECEIPT_CONTENT_LAYOUT.priceGap * SCALE,
    rowY - 1 * SCALE,
  );
  context.restore();
};

const drawImageCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
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

const drawCartPlaceholder = (
  context: CanvasRenderingContext2D,
  accentBgColor: string,
) => {
  const cart = getArticlePoint(
    CART_ARTICLE_LAYOUT.cartX,
    CART_ARTICLE_LAYOUT.cartTop,
  );
  const width = CART_ARTICLE_LAYOUT.cartWidth * SCALE;
  const height = CART_ARTICLE_LAYOUT.cartHeight * SCALE;

  context.save();
  context.fillStyle = accentBgColor || "#FFE36E";
  context.globalAlpha = 0.72;
  roundedRect(context, cart.x, cart.y, width, height, 32 * SCALE);
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = "rgba(17, 17, 17, 0.56)";
  context.font = pretendardFont(500, 18);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("장바구니", cart.x + width / 2, cart.y + height / 2);
  context.restore();
};

const drawPriceTag = (
  context: CanvasRenderingContext2D,
  amount: number,
  x: number,
  y: number,
  rotation: number,
) => {
  const price = formatWonAmount(amount);
  const width = getPriceTagWidth(amount);
  const tagCanvas = document.createElement("canvas");
  tagCanvas.width = Math.ceil(width * SCALE);
  tagCanvas.height = Math.ceil(PRICE_TAG_LAYOUT.height * SCALE);

  const tagContext = tagCanvas.getContext("2d");
  if (!tagContext) return;

  const shapePath = new Path2D(PRICE_TAG_SHAPE_PATH);

  tagContext.imageSmoothingEnabled = true;
  tagContext.imageSmoothingQuality = "high";
  tagContext.scale(SCALE, SCALE);
  tagContext.save();
  tagContext.scale(width / PRICE_TAG_LAYOUT.width, 1);
  tagContext.fillStyle = "#FFFFFF";
  tagContext.fill(shapePath, "evenodd");
  tagContext.strokeStyle = PRICE_TAG_LAYOUT.outlineColor;
  tagContext.lineWidth = 1;
  tagContext.stroke(shapePath);
  tagContext.restore();
  tagContext.fillStyle = "#111111";
  tagContext.fillRect(
    0,
    PRICE_TAG_LAYOUT.holeCenterY - PRICE_TAG_LAYOUT.stemHeight / 2,
    PRICE_TAG_LAYOUT.stemWidth,
    PRICE_TAG_LAYOUT.stemHeight,
  );
  tagContext.fillStyle = PRICE_TAG_LAYOUT.textColor;
  tagContext.font = logicalSatoshiFont(
    SHARE_TYPOGRAPHY.labelSmall.weight,
    SHARE_TYPOGRAPHY.labelSmall.size,
  );
  tagContext.textAlign = "left";
  tagContext.textBaseline = "middle";
  tagContext.fillText("₩", PRICE_TAG_LAYOUT.paddingLeft, 12.5);
  tagContext.fillText(
    price,
    PRICE_TAG_LAYOUT.paddingLeft +
      tagContext.measureText("₩").width +
      2,
    12.5,
  );

  context.save();
  context.translate(x, y);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(tagCanvas, 0, 0);
  context.restore();
};

const drawConnector = (
  context: CanvasRenderingContext2D,
  item: SlotItem,
  tagBase: Point,
) => {
  const tagRotation = item.tagRotation;
  const rotatedStem = rotatePoint(
    { x: PRICE_TAG_LAYOUT.stemWidth, y: 0 },
    tagRotation,
  );
  const tagLeftCenter = {
    x:
      tagBase.x * SCALE +
      rotatedStem.x * SCALE,
    y:
      (tagBase.y + PRICE_TAG_LAYOUT.height / 2) * SCALE +
      rotatedStem.y * SCALE,
  };
  const itemAnchor = {
    x: (item.x + item.size * 0.5) * SCALE,
    y: (item.y + item.size * 0.5) * SCALE,
  };
  const bend = 8;
  const controlA = {
    x: tagLeftCenter.x - 22 * SCALE,
    y: tagLeftCenter.y + bend * SCALE,
  };
  const controlB = {
    x: itemAnchor.x,
    y: itemAnchor.y - bend * SCALE,
  };
  const cart = getArticlePoint(
    CART_ARTICLE_LAYOUT.cartX,
    CART_ARTICLE_LAYOUT.cartTop,
  );

  context.save();
  context.translate(cart.x, cart.y);
  context.strokeStyle = "#111111";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 1 * SCALE;
  context.beginPath();
  context.moveTo(tagLeftCenter.x, tagLeftCenter.y);
  context.bezierCurveTo(
    controlA.x,
    controlA.y,
    controlB.x,
    controlB.y,
    itemAnchor.x,
    itemAnchor.y,
  );
  context.stroke();
  context.restore();
};

const drawItemPlaceholder = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
) => {
  context.save();
  context.translate(x + size / 2, y + size / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.fillStyle = "rgba(17, 17, 17, 0.08)";
  roundedRect(context, -size / 2, -size / 2, size, size, 18 * SCALE);
  context.fill();
  context.fillStyle = "rgba(17, 17, 17, 0.48)";
  context.font = pretendardFont(500, 14);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("ITEM", 0, 0);
  context.restore();
};

const drawItems = async (
  context: CanvasRenderingContext2D,
  payload: ShareImagePayload,
) => {
  const renderedItems = await Promise.all(
    payload.items.map(async (item) => ({
      item,
      loadedItem: await loadCanvasImage(item.imageSrc, "item"),
      tagBase: getTagBasePosition(item),
    })),
  );
  const cart = getArticlePoint(
    CART_ARTICLE_LAYOUT.cartX,
    CART_ARTICLE_LAYOUT.cartTop,
  );

  renderedItems.forEach(({ item, tagBase }) => {
    drawConnector(context, item, tagBase);
  });

  renderedItems.forEach(({ item, tagBase }) => {
    drawPriceTag(
      context,
      item.amount,
      cart.x + tagBase.x * SCALE,
      cart.y + tagBase.y * SCALE,
      item.tagRotation,
    );
  });

  renderedItems.forEach(({ item, loadedItem }) => {
    const itemX = cart.x + item.x * SCALE;
    const itemY = cart.y + item.y * SCALE;
    const itemSize = item.size * SCALE;

    if (loadedItem.ok) {
      context.save();
      context.translate(itemX + itemSize / 2, itemY + itemSize / 2);
      context.rotate((item.rotation * Math.PI) / 180);
      drawImageContain(
        context,
        loadedItem.image,
        -itemSize * 0.56,
        -itemSize * 0.56,
        itemSize * 1.12,
        itemSize * 1.12,
      );
      context.restore();
    } else {
      drawItemPlaceholder(context, itemX, itemY, itemSize, item.rotation);
    }
  });
};

const drawNoSpend = async (context: CanvasRenderingContext2D) => {
  const loadedSticker = await loadCanvasImage(NO_SPEND_STICKER_SRC, "no-spend sticker");
  const size = 132 * SCALE;
  const cart = getArticlePoint(
    CART_ARTICLE_LAYOUT.cartX,
    CART_ARTICLE_LAYOUT.cartTop,
  );
  const x = cart.x + (CART_ARTICLE_LAYOUT.cartWidth * SCALE) / 2 - size / 2;
  const y = cart.y + (CART_ARTICLE_LAYOUT.cartHeight * SCALE) / 2 - size / 2;

  if (loadedSticker.ok) {
    drawImageContain(context, loadedSticker.image, x, y, size, size);
    return;
  }

  context.save();
  context.fillStyle = "#111111";
  roundedRect(context, x - 8 * SCALE, y + 42 * SCALE, 148 * SCALE, 44 * SCALE, 12 * SCALE);
  context.fill();
  context.fillStyle = "#FFFFFF";
  context.font = pretendardFont(500, 18);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("무지출 DAY", x + size / 2, y + 64 * SCALE);
  context.restore();
};

export const createShareCanvasFallback = async (
  payload: ShareImagePayload,
): Promise<ShareImageResult> => {
  await waitForCanvasFonts();

  const { canvas, context } = createExportCanvas();
  const loadedCart = await loadCanvasImage(payload.cart.imageSrc, "cart");
  const cart = getArticlePoint(
    CART_ARTICLE_LAYOUT.cartX,
    CART_ARTICLE_LAYOUT.cartTop,
  );
  const cartWidth = CART_ARTICLE_LAYOUT.cartWidth * SCALE;
  const cartHeight = CART_ARTICLE_LAYOUT.cartHeight * SCALE;

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  drawReceiptCard(context, payload.cart.cardBgColor, payload.totalAmount);

  if (loadedCart.ok) {
    drawImageCover(context, loadedCart.image, cart.x, cart.y, cartWidth, cartHeight);
  } else {
    drawCartPlaceholder(context, payload.cart.accentBgColor);
  }

  if (payload.hasNoSpendDay && payload.items.length === 0) {
    await drawNoSpend(context);
  } else {
    await drawItems(context, payload);
  }

  drawBrand(context);

  const blob = await blobFromCanvas(canvas);
  const dataUrl = canvas.toDataURL("image/png");

  if (blob.size <= 0 || !dataUrl.startsWith("data:image/png")) {
    throw new Error("Failed to create share image data.");
  }

  return {
    blob,
    dataUrl,
    fileName: getFallbackFileName(payload.cart.dateKey),
  };
};
