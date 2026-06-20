export const SHARE_BASE_WIDTH = 375;

export const CART_ARTICLE_LAYOUT = {
  cartHeight: 410,
  cartTop: 50,
  cartWidth: 316,
  cartX: 0,
  height: 460,
  receiptHeight: 78,
  receiptWidth: 172,
  receiptX: 72,
  receiptY: 0,
  width: 316,
} as const;

export const RECEIPT_CONTENT_LAYOUT = {
  gap: 8,
  height: 46,
  paddingBottom: 20,
  paddingTop: 12,
  paddingX: 20,
  priceGap: 4,
  starHeight: 10,
  width: 132,
} as const;

export const PRICE_TAG_LAYOUT = {
  height: 24,
  holeCenterX: 8,
  holeCenterY: 12,
  holeRadius: 2,
  minWidth: 79,
  outlineColor: "rgba(113, 113, 122, 0.16)",
  paddingBottom: 4,
  paddingLeft: 16,
  paddingRight: 10,
  paddingTop: 4,
  stemHeight: 1,
  stemWidth: 6,
  textColor: "rgba(17, 17, 17, 0.8)",
  textMinWidth: 44,
  width: 79,
} as const;

export const SHARE_TYPOGRAPHY = {
  captionMedium: { lineHeight: 16, size: 13, weight: 400 },
  captionSmall: { lineHeight: 12, size: 12, weight: 500 },
  headline: { lineHeight: 20, size: 17, weight: 600 },
  labelSmall: { lineHeight: 16, size: 13, weight: 500 },
} as const;
