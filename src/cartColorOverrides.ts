export type CartColorOption = {
  accentBgColor: string;
  cardBgColor: string;
  cardBgClassName: string;
  id: string;
  imageAlt: string;
  imageSrc: string;
  receiptColor: string;
  swatchColor: string;
};

export const cartColorOptions: CartColorOption[] = [
  {
    id: "red",
    swatchColor: "#FF4A42",
    cardBgColor: "#fde8e8",
    cardBgClassName: "bg-[#fde8e8]",
    accentBgColor: "#FF4A42",
    receiptColor: "#FBC9C9",
    imageAlt: "Red cart",
    imageSrc: "/cart/Red.png?v=high",
  },
  {
    id: "cool-pink",
    swatchColor: "#FDC1E1",
    cardBgColor: "#fff2f9",
    cardBgClassName: "bg-[#fff2f9]",
    accentBgColor: "#FDC1E1",
    receiptColor: "#FDC1E1",
    imageAlt: "Cool pink cart",
    imageSrc: "/cart/CoolPink.png?v=high",
  },
  {
    id: "warm-pink",
    swatchColor: "#FFB4CB",
    cardBgColor: "#fff2f9",
    cardBgClassName: "bg-[#fff2f9]",
    accentBgColor: "#FF7AB6",
    receiptColor: "#FFB4CB",
    imageAlt: "Warm pink cart",
    imageSrc: "/cart/WarmPink.png?v=high",
  },
  {
    id: "purple",
    swatchColor: "#D6BBFA",
    cardBgColor: "#eef2ff",
    cardBgClassName: "bg-[#eef2ff]",
    accentBgColor: "#A276FF",
    receiptColor: "#CDB8FF",
    imageAlt: "Purple cart",
    imageSrc: "/cart/Purple.png?v=high",
  },
  {
    id: "yellow",
    swatchColor: "#FFE771",
    cardBgColor: "#fff6c8",
    cardBgClassName: "bg-[#fff6c8]",
    accentBgColor: "#FFE771",
    receiptColor: "#FFE771",
    imageAlt: "Yellow cart",
    imageSrc: "/cart/Yellow.png?v=high",
  },
  {
    id: "green",
    swatchColor: "#9CEAC0",
    cardBgColor: "#c8f3dc",
    cardBgClassName: "bg-[#c8f3dc]",
    accentBgColor: "#7EF092",
    receiptColor: "#9CEAC0",
    imageAlt: "Green cart",
    imageSrc: "/cart/Green.png?v=high",
  },
  {
    id: "mint",
    swatchColor: "#96F1EF",
    cardBgColor: "#ccfbf1",
    cardBgClassName: "bg-[#ccfbf1]",
    accentBgColor: "#5BE7DE",
    receiptColor: "#A8F3EA",
    imageAlt: "Mint cart",
    imageSrc: "/cart/Mint.png?v=high",
  },
  {
    id: "grey",
    swatchColor: "#F4F4F5",
    cardBgColor: "#f4f4f5",
    cardBgClassName: "bg-[#f4f4f5]",
    accentBgColor: "#E4E4E7",
    receiptColor: "#E4E4E7",
    imageAlt: "Grey cart",
    imageSrc: "/cart/Grey.png?v=high",
  },
];

const STORAGE_KEY = "sseunbaguni.cartColorOverrides.v1";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

const readOverrides = (): Record<string, string> => {
  if (!canUseStorage()) return {};

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const writeOverrides = (overrides: Record<string, string>) => {
  if (!canUseStorage()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
};

export const getCartColorOption = (id: string | null | undefined) =>
  cartColorOptions.find((option) => option.id === id) ?? null;

export const getCartColorOverride = (dateKey: string) =>
  getCartColorOption(readOverrides()[dateKey]);

export const saveCartColorOverride = (dateKey: string, colorId: string) => {
  writeOverrides({
    ...readOverrides(),
    [dateKey]: colorId,
  });
};

export const resetCartColorOverride = (dateKey: string) => {
  const overrides = readOverrides();
  delete overrides[dateKey];
  writeOverrides(overrides);
};

export const applyCartColorOverride = <
  T extends {
    accentBgColor: string;
    cardBgClassName: string;
    dateKey: string;
    imageAlt: string;
    imageSrc: string;
    receiptColor?: string;
  },
>(
  cart: T,
) => {
  const override = getCartColorOverride(cart.dateKey);

  return override
    ? {
        ...cart,
        accentBgColor: override.accentBgColor,
        cardBgClassName: override.cardBgClassName,
        imageAlt: override.imageAlt,
        imageSrc: override.imageSrc,
        receiptColor: override.receiptColor,
      }
    : cart;
};
