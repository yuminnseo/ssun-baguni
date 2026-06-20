import html2canvas from "html2canvas";
import { toPng } from "html-to-image";
import type { SlotItem } from "../../components/CartSlotItems";
import { createShareCanvasFallback } from "./shareImageCanvasFallback";
import { createReceiptCanvasFallback } from "./shareReceiptCanvasFallback";

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
const FONT_READY_TIMEOUT_MS = 3000;
const IMAGE_READY_TIMEOUT_MS = 8000;
const SAFARI_CAPTURE_MAX_ATTEMPTS = 2;
const SAFARI_CAPTURE_SETTLE_MS = 100;

const toFileDate = (dateKey: string) => dateKey.replaceAll(".", "-");

export const getShareImageFileName = (view: ShareImageView, dateKey: string) =>
  `ssun-baguni-${view}-${toFileDate(dateKey)}.png`;

const withTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
) =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });

const waitForFonts = async () => {
  if (!("fonts" in document)) return;

  try {
    await withTimeout(
      Promise.all([
        document.fonts.load(`500 ${BRAND_FONT_SIZE}px Satoshi`, "@ssun_baguni"),
        document.fonts.load(`400 17px Pretendard`, "₩"),
        document.fonts.ready,
      ]),
      FONT_READY_TIMEOUT_MS,
      "Timed out waiting for share image fonts.",
    );
  } catch (error) {
    console.warn("Share image font readiness timed out.", error);
  }
};

const isWebKitCaptureBrowser = () => {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent;
  const isIOS = /iP(ad|hone|od)/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|Chromium|Edg|OPR/.test(userAgent);

  return isIOS || isSafari;
};

type RestoreCaptureMutation = () => void;

const runRestoreCallbacks = (restoreCallbacks: RestoreCaptureMutation[]) => {
  [...restoreCallbacks].reverse().forEach((restore) => restore());
};

const getUrlsFromCssImage = (value: string) =>
  Array.from(value.matchAll(/url\((['"]?)(.*?)\1\)/g))
    .map((match) => match[2])
    .filter((url) => url && !url.startsWith("data:"));

const removeSafariCaptureEffects = (targetElement: HTMLElement) => {
  const restoreCallbacks: RestoreCaptureMutation[] = [];
  const elements = [
    targetElement,
    ...Array.from(targetElement.querySelectorAll<HTMLElement>("*")),
  ];

  elements.forEach((element) => {
    const computedStyle = window.getComputedStyle(element);
    const hasBackdropFilter = computedStyle.backdropFilter !== "none";
    const hasBoxShadow = computedStyle.boxShadow !== "none";
    const hasFilter = computedStyle.filter !== "none";
    const hasWebkitBackdropFilter = computedStyle.webkitBackdropFilter !== "none";

    if (!hasBackdropFilter && !hasBoxShadow && !hasFilter && !hasWebkitBackdropFilter) {
      return;
    }

    const originalBackdropFilter = element.style.backdropFilter;
    const originalBoxShadow = element.style.boxShadow;
    const originalFilter = element.style.filter;
    const originalWebkitBackdropFilter = element.style.webkitBackdropFilter;

    restoreCallbacks.push(() => {
      element.style.backdropFilter = originalBackdropFilter;
      element.style.boxShadow = originalBoxShadow;
      element.style.filter = originalFilter;
      element.style.webkitBackdropFilter = originalWebkitBackdropFilter;
    });

    if (hasBackdropFilter) element.style.backdropFilter = "none";
    if (hasBoxShadow) element.style.boxShadow = "none";
    if (hasFilter) element.style.filter = "none";
    if (hasWebkitBackdropFilter) element.style.webkitBackdropFilter = "none";
  });

  return () => runRestoreCallbacks(restoreCallbacks);
};

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const waitForAnimationFrames = async (count: number) => {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

const waitForSafariCaptureSettle = async (targetElement: HTMLElement) => {
  await waitForTargetImages(targetElement);
  await waitForAnimationFrames(3);
  await delay(SAFARI_CAPTURE_SETTLE_MS);
};

const preloadImageSource = async (src: string) => {
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const image = new Image();
      const url = new URL(src, window.location.href);

      if (url.origin !== window.location.origin) {
        image.crossOrigin = "anonymous";
      }
      image.decoding = "async";
      image.onload = () => {
        if (image.naturalWidth <= 0) {
          reject(new Error(`Share target image has no natural size: ${src}`));
          return;
        }

        image.decode().then(resolve).catch(resolve);
      };
      image.onerror = () =>
        reject(new Error(`Failed to load share target image: ${src}`));
      image.src = src;
    }),
    IMAGE_READY_TIMEOUT_MS,
    `Timed out waiting for share target image: ${src}`,
  );
};

const waitForImageElement = async (image: HTMLImageElement) => {
  const src = image.currentSrc || image.src;

  if (!src) return;

  image.loading = "eager";

  if (image.complete && image.naturalWidth > 0) {
    await image.decode().catch(() => undefined);
    return;
  }

  await preloadImageSource(src);

  if (image.complete && image.naturalWidth > 0) return;

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

const waitForTargetImages = async (targetElement: HTMLElement) => {
  const images = Array.from(targetElement.querySelectorAll("img"));

  await Promise.all(images.map(waitForImageElement));
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load captured image."));
    image.src = src;
  });

const assertCaptureIsNotBlank = async (dataUrl: string) => {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.min(image.width, 96));
  const height = Math.max(1, Math.min(image.height, 96));
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) return { nonWhitePixelRatio: 1, visiblePixelRatio: 1 };

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height).data;
  let visiblePixelCount = 0;
  let nonWhitePixelCount = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];

    if (alpha > 8) {
      visiblePixelCount += 1;
    }

    if (alpha > 8 && (red < 245 || green < 245 || blue < 245)) {
      nonWhitePixelCount += 1;
    }
  }

  const totalPixels = width * height;
  const nonWhitePixelRatio = nonWhitePixelCount / totalPixels;
  const visiblePixelRatio = visiblePixelCount / totalPixels;

  if (visiblePixelRatio < 0.01 || nonWhitePixelRatio < 0.01) {
    throw new Error(
      `Safari capture produced blank image. visible=${visiblePixelRatio.toFixed(
        4,
      )}, nonWhite=${nonWhitePixelRatio.toFixed(4)}`,
    );
  }

  return { nonWhitePixelRatio, visiblePixelRatio };
};

const captureTargetWithHtml2Canvas = async (
  targetElement: HTMLElement,
  rect: DOMRect,
) => {
  const canvas = await html2canvas(targetElement, {
    allowTaint: false,
    backgroundColor: null,
    foreignObjectRendering: false,
    height: Math.ceil(rect.height),
    imageTimeout: 10000,
    logging: false,
    removeContainer: true,
    scale: Math.min(window.devicePixelRatio || 1, 2),
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    useCORS: true,
    width: Math.ceil(rect.width),
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
  });

  return canvas.toDataURL("image/png");
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

  if (!isWebKitCaptureBrowser()) {
    await waitForTargetImages(targetElement);

    return toPng(targetElement, {
      backgroundColor: "transparent",
      cacheBust: true,
      fetchRequestInit: {
        cache: "no-cache",
        credentials: "omit",
        mode: "cors",
      },
      includeQueryParams: true,
      pixelRatio: 3,
      skipFonts: false,
    });
  }

  const restoreCaptureEffects = removeSafariCaptureEffects(targetElement);
  let lastCaptureError: unknown = null;

  try {
    for (let attempt = 1; attempt <= SAFARI_CAPTURE_MAX_ATTEMPTS; attempt += 1) {
      try {
        await waitForSafariCaptureSettle(targetElement);

        const dataUrl = await captureTargetWithHtml2Canvas(targetElement, rect);
        const metrics = await assertCaptureIsNotBlank(dataUrl);

        if (attempt > 1) {
          console.warn("Safari share capture succeeded after retry.", {
            attempt,
            browserPath: "safari-html2canvas",
            ...metrics,
          });
        }

        return dataUrl;
      } catch (error) {
        lastCaptureError = error;
        console.warn("Safari share capture attempt failed.", {
          attempt,
          browserPath: "safari-html2canvas",
          error,
          backgroundImageCount: Array.from(
            targetElement.querySelectorAll<HTMLElement>("*"),
          ).filter((element) =>
            getUrlsFromCssImage(window.getComputedStyle(element).backgroundImage)
              .length > 0,
          ).length,
          imgCount: targetElement.querySelectorAll("img").length,
          targetHeight: rect.height,
          targetWidth: rect.width,
        });
      }
    }

    console.error("Safari share capture failed after retries.", {
      attempts: SAFARI_CAPTURE_MAX_ATTEMPTS,
      browserPath: "safari-html2canvas",
      error: lastCaptureError,
      backgroundImageCount: Array.from(
        targetElement.querySelectorAll<HTMLElement>("*"),
      ).filter((element) =>
        getUrlsFromCssImage(window.getComputedStyle(element).backgroundImage).length >
        0,
      ).length,
      imgCount: targetElement.querySelectorAll("img").length,
      targetHeight: rect.height,
      targetWidth: rect.width,
    });
    throw lastCaptureError ?? new Error("Safari share capture failed.");
  } finally {
    restoreCaptureEffects();
  }
};

export const createShareImage = async (
  payload: ShareImagePayload,
): Promise<ShareImageResult> => {
  if (typeof document === "undefined") {
    throw new Error("Document is not available.");
  }

  const { cart, targetElement, view } = payload;

  if (isWebKitCaptureBrowser() && view === "cart") {
    return createShareCanvasFallback(payload);
  }

  if (isWebKitCaptureBrowser() && view === "receipt") {
    return createReceiptCanvasFallback(payload);
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
  const dataUrl = canvas.toDataURL("image/png");

  if (blob.size <= 0 || !dataUrl.startsWith("data:image/png")) {
    throw new Error("Failed to create share image data.");
  }

  return {
    blob,
    dataUrl,
    fileName: getShareImageFileName(view, cart.dateKey),
  };
};
