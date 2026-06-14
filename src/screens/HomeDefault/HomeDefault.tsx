import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  addCartSlotItem,
  CartSlotItems,
  deleteCartSlotItem,
  formatWonAmount,
  getCartSlotItems,
  getCartSlotSummary,
  updateCartSlotItem,
  type SlotItem,
} from "../../components/CartSlotItems";
import { ColorMenuButton } from "../../components/ColorMenuButton";
import { DatePickerBottomSheet } from "../../components/DatePickerBottomSheet";
import { ReceiptRail } from "../../components/ReceiptRail";
import { applyCartColorOverride } from "../../cartColorOverrides";
import {
  getCartDates,
  getCartDatesWithLeadingHistory,
  getKoreaToday,
} from "../../dateSystem";
import {
  itemsToSlotItemsByDate,
  itemToSlotItem,
  toDatabaseDate,
  toDateKey,
  type SlotItemsByDate,
} from "../../lib/data/cartSlotAdapter";
import { getItemCategoryLabel } from "../../lib/data/itemCategories";
import {
  createItem,
  deleteItem,
  listItemsInDateRange,
  updateItem,
} from "../../lib/data/items";
import { removeItemBackground } from "../../lib/functions/removeItemBackground";
import {
  deleteNoSpendDay,
  listNoSpendDaysInDateRange,
  upsertNoSpendDay,
} from "../../lib/data/noSpendDays";
import { isSupabaseConfigured } from "../../lib/supabase/client";
import {
  deleteItemImages,
  uploadItemImage,
} from "../../lib/storage/itemImages";
import type {
  CartColor,
  ItemCategory,
  ItemReason,
} from "../../lib/supabase/types";
import { useAuth } from "../../lib/auth";
import {
  analyticsEvents,
  getFileSizeBucket,
  getPriceRange,
  identifyUser,
  resetAnalytics,
  trackEvent,
} from "../../lib/analytics/mixpanel";
import { useCartSwipe } from "../../useCartSwipe";

const tabs = [
  { id: "cart", label: "장바구니" },
  { id: "receipt", label: "영수증" },
];

const actionItems = [
  {
    id: "camera",
    label: "카메라",
    iconSrc: "/icons/CameraIcon.svg",
  },
  {
    id: "gallery",
    label: "갤러리",
    iconSrc: "/icons/GalleryIcon.svg",
  },
];

const VIEW_TRANSITION_MS = 1420;
const ADD_SHEET_ANIMATION_MS = 260;
const LOGIN_TOAST_MS = 3000;
const SUPABASE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TERMS_AGREEMENT_STORAGE_PREFIX = "ssun-baguni:terms-agreed:";

const DEFAULT_ITEM_TIME = "AM 11:00";
const itemTimePeriods = ["AM", "PM"] as const;
const itemTimeHours = Array.from({ length: 12 }, (_, index) =>
  String(index + 1),
);
const itemTimeMinutes = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);
type ItemTimePeriod = (typeof itemTimePeriods)[number];

const parseItemTime = (value: string) => {
  const match = /^(AM|PM)\s+(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return { period: "AM" as ItemTimePeriod, hour: "11", minute: "00" };
  }

  const period = match[1] as ItemTimePeriod;
  const hourNumber = Number(match[2]);
  const minuteNumber = Number(match[3]);
  const normalizedHour = Math.min(Math.max(hourNumber, 1), 12);
  const normalizedMinute = Math.min(Math.max(minuteNumber, 0), 59);
  const hour24 =
    period === "AM"
      ? normalizedHour % 12
      : normalizedHour === 12
        ? 12
        : normalizedHour + 12;
  const roundedTotalMinutes =
    Math.round((hour24 * 60 + normalizedMinute) / 5) * 5;
  const normalizedTotalMinutes = roundedTotalMinutes % (24 * 60);
  const roundedHour24 = Math.floor(normalizedTotalMinutes / 60);
  const roundedMinute = normalizedTotalMinutes % 60;
  const roundedPeriod: ItemTimePeriod = roundedHour24 < 12 ? "AM" : "PM";
  const roundedHour12 = roundedHour24 % 12 || 12;

  return {
    period: roundedPeriod,
    hour: String(roundedHour12),
    minute: String(roundedMinute).padStart(2, "0"),
  };
};

const formatItemTime = (
  period: ItemTimePeriod,
  hour: string,
  minute: string,
) => `${period} ${hour.padStart(2, "0")}:${minute}`;

const formatPriceInput = (value: string) =>
  value ? new Intl.NumberFormat("ko-KR").format(Number(value)) : "";

const getTermsAgreementStorageKey = (userId: string) =>
  `${TERMS_AGREEMENT_STORAGE_PREFIX}${userId}`;

const readTermsAgreement = (userId: string) => {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(getTermsAgreementStorageKey(userId)) === "true";
};

const writeTermsAgreement = (userId: string) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getTermsAgreementStorageKey(userId), "true");
};

type RequiredAgreementKey = "age" | "privacy" | "terms";
type ItemFlowStep = "price" | "details" | null;

const requiredAgreementItems: Array<{
  hasViewButton?: boolean;
  id: RequiredAgreementKey;
  label: string;
}> = [
  { id: "age", label: "(필수) 만 14세 이상입니다." },
  {
    id: "privacy",
    label: "(필수) 개인정보처리방침에 동의합니다",
    hasViewButton: true,
  },
  {
    id: "terms",
    label: "(필수) 이용약관에 동의합니다.",
    hasViewButton: true,
  },
];

const itemCategoryRows = [
  [
    {
      id: "food",
      label: "식비",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-----.svg",
    },
    {
      id: "cafe-snack",
      label: "카페·간식",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon--------.svg",
    },
    {
      id: "shopping",
      label: "쇼핑",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon---------1.svg",
    },
  ],
  [
    {
      id: "hobby-leisure",
      label: "취미·여가",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon------.svg",
    },
    {
      id: "daily-supplies",
      label: "생활용품",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon---------2.svg",
    },
    {
      id: "health",
      label: "건강",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-------1.svg",
    },
  ],
  [
    {
      id: "self-development",
      label: "자기계발",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-----------.svg",
    },
    {
      id: "gift",
      label: "선물",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-------2.svg",
    },
    {
      id: "etc",
      label: "기타",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-------.svg",
    },
  ],
];

const itemReasons = [
  { id: "necessary", label: "필요해서" },
  { id: "planned", label: "계획한 소비" },
  { id: "no-reason", label: "이유없이" },
  { id: "refresh", label: "기분 전환" },
  { id: "gift-purpose", label: "선물용" },
  { id: "hobby-fandom", label: "취미·덕질" },
  { id: "discount", label: "할인해서" },
  { id: "hungry", label: "배고파서" },
  { id: "other", label: "기타" },
];

const detailPictureGradients = [
  "linear-gradient(180deg, #FFECF6 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #FFE5ED 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #FFEBEB 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #CEF8F8 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #F6F0FE 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #D3F6E3 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #FCFBBE 33.42%, #FFF 100%)",
];

const itemDetailActions = [
  {
    id: "delete",
    label: "삭제",
    iconSrc: "https://c.animaapp.com/B1LZS6bG/img/--icon-variant--.svg",
  },
  {
    id: "edit",
    label: "수정",
    iconSrc: "https://c.animaapp.com/B1LZS6bG/img/--icon-variant---1.svg",
  },
];

type ItemDetailMetadata = {
  categoryId: string;
  reasonId: string;
  time: string;
};

type DetailOverlayState = {
  cartId: string;
  itemId: string;
  isClosing: boolean;
} | null;

type EditingItemState = {
  cartId: string;
  itemId: string;
} | null;

type DbReadStatus = "idle" | "loading" | "ready" | "error";

type DbCartDataState = {
  loadedDateKeys: Set<string>;
  noSpendDateKeys: Set<string>;
  slotItemsByDate: SlotItemsByDate;
  status: DbReadStatus;
};

const baseCarts = [
  {
    id: "warm-pink",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    cardBgClassName: "bg-[#fff2f9]",
    accentBgColor: "#FF7AB6",
    receiptColor: "#FFB4CB",
    imageAlt: "Warm pink cart",
    imageSrc: "/cart/WarmPink.png?v=high",
  },
  {
    id: "green",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    cardBgClassName: "bg-[#c8f3dc]",
    accentBgColor: "#7EF092",
    receiptColor: "#9CEAC0",
    imageAlt: "Green cart",
    imageSrc: "/cart/Green.png?v=high",
  },
  {
    id: "yellow",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    cardBgClassName: "bg-[#fff6c8]",
    accentBgColor: "#FFE771",
    receiptColor: "#FFE771",
    imageAlt: "Yellow cart",
    imageSrc: "/cart/Yellow.png?v=high",
  },
];

const emptyCartPalette = [
  {
    cardBgClassName: "bg-[#fde8e8]",
    accentBgColor: "#FF4A42",
    receiptColor: "#FBC9C9",
    imageAlt: "Red empty cart",
    imageSrc: "/cart/Red.png?v=high",
  },
  {
    cardBgClassName: "bg-[#fff2f9]",
    accentBgColor: "#FF7AB6",
    receiptColor: "#FFB4CB",
    imageAlt: "Warm pink empty cart",
    imageSrc: "/cart/WarmPink.png?v=high",
  },
  {
    cardBgClassName: "bg-[#eef2ff]",
    accentBgColor: "#A276FF",
    receiptColor: "#CDB8FF",
    imageAlt: "Purple empty cart",
    imageSrc: "/cart/Purple.png?v=high",
  },
  {
    cardBgClassName: "bg-[#f4f4f5]",
    accentBgColor: "#E4E4E7",
    receiptColor: "#E4E4E7",
    imageAlt: "Grey empty cart",
    imageSrc: "/cart/Grey.png?v=high",
  },
  {
    cardBgClassName: "bg-[#ccfbf1]",
    accentBgColor: "#5BE7DE",
    receiptColor: "#A8F3EA",
    imageAlt: "Mint empty cart",
    imageSrc: "/cart/Mint.png?v=high",
  },
];

const baseCartDates = getCartDates();
const initialCartDates = getCartDatesWithLeadingHistory();
const firstBaseDateIndex = initialCartDates.indexOf(baseCartDates[0]);

const getPaletteIndex = (dateKey: string) =>
  [...dateKey].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
  emptyCartPalette.length;

const isValidDateKey = (dateKey?: string | null) =>
  Boolean(dateKey && /^\d{4}\.\d{2}\.\d{2}$/.test(dateKey));

const createEmptyCart = (dateKey: string, paletteIndex?: number) => {
  const palette =
    emptyCartPalette[paletteIndex ?? getPaletteIndex(dateKey)];

  return {
    id: `empty-${dateKey.replaceAll(".", "-")}`,
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    ...palette,
  };
};

const createInitialDateCarts = (selectedDate?: string | null) => {
  const dateCarts = initialCartDates.map((dateKey, index) => {
    const baseIndex = baseCartDates.indexOf(dateKey);

    if (baseIndex >= 0) {
      return {
        ...baseCarts[baseIndex],
        dateKey,
      };
    }

    const daysBeforeBase = firstBaseDateIndex - index;

    return {
      ...createEmptyCart(
        dateKey,
        Math.max(daysBeforeBase - 1, 0) % emptyCartPalette.length,
      ),
      dateKey,
    };
  });
  const today = getKoreaToday();

  if (
    selectedDate &&
    selectedDate <= today &&
    !dateCarts.some((cart) => cart.dateKey === selectedDate)
  ) {
    dateCarts.push({ ...createEmptyCart(selectedDate), dateKey: selectedDate });
  }

  return dateCarts
    .sort((first, second) => first.dateKey.localeCompare(second.dateKey))
    .map(applyCartColorOverride);
};

const getCartColorValue = (cart: { id: string; imageAlt: string }): CartColor => {
  if (cart.id === "warm-pink") return "warm-pink";
  if (cart.id === "green") return "green";
  if (cart.id === "yellow") return "yellow";

  const normalizedAlt = cart.imageAlt.toLowerCase();

  if (normalizedAlt.includes("cool pink")) return "cool-pink";
  if (normalizedAlt.includes("warm pink")) return "warm-pink";
  if (normalizedAlt.includes("red")) return "red";
  if (normalizedAlt.includes("green")) return "green";
  if (normalizedAlt.includes("mint")) return "mint";
  if (normalizedAlt.includes("purple")) return "purple";
  if (normalizedAlt.includes("grey")) return "grey";

  return "yellow";
};

const navItems = [
  {
    id: "home",
    label: "홈",
    iconAlt: "Icon navigation home",
    iconSrc: "/navigation-icons/icon-home-fill.svg",
    active: true,
  },
  {
    id: "calendar",
    label: "캘린더",
    iconAlt: "Icon navigation",
    iconSrc: "/navigation-icons/icon-calendar-line.svg",
    active: false,
    disabled: true,
  },
  {
    id: "friends",
    label: "친구",
    iconAlt: "Icon navigation",
    iconSrc: "/navigation-icons/icon-social-line.svg",
    active: false,
    disabled: true,
  },
  {
    id: "my",
    label: "My",
    iconAlt: "Icon navigation my",
    iconSrc: "/navigation-icons/icon-my-line.svg",
    active: false,
    disabled: true,
  },
];

export const HomeDefault = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAuthReady, signInWithGoogle, signOut, user } =
    useAuth();
  const [activeView, setActiveView] = useState<"cart" | "receipt">("cart");
  const [transitionPhase, setTransitionPhase] = useState<
    "idle" | "receipt-prep" | "cart-to-receipt" | "receipt-to-cart"
  >("idle");
  const [isCartReturnReady, setIsCartReturnReady] = useState(true);
  const [frozenExitRailStyle, setFrozenExitRailStyle] =
    useState<CSSProperties | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isClosingAddSheet, setIsClosingAddSheet] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isItemDatePickerOpen, setIsItemDatePickerOpen] = useState(false);
  const [isBackgroundFailureToastVisible, setIsBackgroundFailureToastVisible] =
    useState(false);
  const [isItemFlowSaving, setIsItemFlowSaving] = useState(false);
  const [isLoginToastVisible, setIsLoginToastVisible] = useState(false);
  const [isPhotoPreparingToastVisible, setIsPhotoPreparingToastVisible] =
    useState(false);
  const [photoPreparingDotCount, setPhotoPreparingDotCount] = useState(1);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [actionFailureToastMessage, setActionFailureToastMessage] =
    useState("");
  const [isTermsSheetOpen, setIsTermsSheetOpen] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [itemFlowStep, setItemFlowStep] = useState<ItemFlowStep>(null);
  const [selectedItemImageFile, setSelectedItemImageFile] =
    useState<File | null>(null);
  const [uploadedOriginalImageUrl, setUploadedOriginalImageUrl] = useState("");
  const [pendingRemovedBgImageUrl, setPendingRemovedBgImageUrl] = useState("");
  const [hasBackgroundRemovalFailed, setHasBackgroundRemovalFailed] =
    useState(false);
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemReason, setItemReason] = useState("");
  const [itemDate, setItemDate] = useState(getKoreaToday());
  const [itemTime, setItemTime] = useState(DEFAULT_ITEM_TIME);
  const [isItemTimePickerOpen, setIsItemTimePickerOpen] = useState(false);
  const [draftItemTimePeriod, setDraftItemTimePeriod] =
    useState<ItemTimePeriod>("AM");
  const [draftItemTimeHour, setDraftItemTimeHour] = useState("11");
  const [draftItemTimeMinute, setDraftItemTimeMinute] = useState("00");
  const [cartDataVersion, setCartDataVersion] = useState(0);
  const [detailOverlay, setDetailOverlay] = useState<DetailOverlayState>(null);
  const [editingItem, setEditingItem] = useState<EditingItemState>(null);
  const [itemDetailMetadata, setItemDetailMetadata] = useState<
    Record<string, ItemDetailMetadata>
  >({});
  const [pendingAddIndex, setPendingAddIndex] = useState<number | null>(null);
  const [requiredAgreements, setRequiredAgreements] = useState<
    Record<RequiredAgreementKey, boolean>
  >({
    age: false,
    privacy: false,
    terms: false,
  });
  const [noSpendCartIds, setNoSpendCartIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [dbCartData, setDbCartData] = useState<DbCartDataState>({
    loadedDateKeys: new Set(),
    noSpendDateKeys: new Set(),
    slotItemsByDate: {},
    status: "idle",
  });
  const isLoggedOutStart = isAuthReady && !isAuthenticated;
  const transitionTimerRef = useRef<number | null>(null);
  const transitionFrameRef = useRef<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundFailureToastTimerRef = useRef<number | null>(null);
  const backgroundRemovalFailedRef = useRef(false);
  const backgroundRemovalPromiseRef = useRef<Promise<string | null> | null>(null);
  const imagePreparationRunRef = useRef(0);
  const originalImageUploadPromiseRef = useRef<Promise<string> | null>(null);
  const loginToastTimerRef = useRef<number | null>(null);
  const photoPreparingToastTimerRef = useRef<number | null>(null);
  const photoPreparingDotsTimerRef = useRef<number | null>(null);
  const actionFailureToastTimerRef = useRef<number | null>(null);
  const detailGradientRef = useRef<Record<string, string>>({});
  const detailSwipeRef = useRef<{ startX: number; startY: number } | null>(null);
  const appOpenedTrackedRef = useRef(false);
  const backgroundRemoveStartedAtRef = useRef<number | null>(null);
  const detailsStepViewedRef = useRef(false);
  const itemFlowEntryPointRef = useRef("unknown");
  const itemFlowImageSourceRef = useRef<string | null>(null);
  const itemFlowInitialTimeRef = useRef(DEFAULT_ITEM_TIME);
  const itemFlowStartedAtRef = useRef<number | null>(null);
  const loginCompletedUserIdRef = useRef<string | null>(null);
  const loginCtaViewedTrackedRef = useRef(false);
  const priceEnteredTrackedRef = useRef(false);
  const priceStepViewedRef = useRef(false);
  const termsSheetViewedRef = useRef(false);
  const queryParams = new URLSearchParams(location.search);
  const querySelectedIndex = Number(queryParams.get("selectedIndex"));
  const querySelectedDate = queryParams.get("selectedDate");
  const queryRailOffset = Number(queryParams.get("railOffset"));
  const stateSelectedDate =
    typeof location.state?.selectedDate === "string"
      ? location.state.selectedDate
      : null;
  const requestedSelectedDate =
    isValidDateKey(stateSelectedDate)
      ? stateSelectedDate
      : isValidDateKey(querySelectedDate)
        ? querySelectedDate
        : null;
  const [dateCarts, setDateCarts] = useState(() =>
    createInitialDateCarts(requestedSelectedDate),
  );
  const cartDates = dateCarts.map((cart) => cart.dateKey);
  const stateSelectedIndex =
    typeof location.state?.selectedIndex === "number"
      ? location.state.selectedIndex
      : null;
  const todayIndex = Math.max(cartDates.indexOf(getKoreaToday()), cartDates.length - 1);
  const initialSelectedIndex =
    requestedSelectedDate && cartDates.includes(requestedSelectedDate)
      ? cartDates.indexOf(requestedSelectedDate)
      : todayIndex;
  const initialRailOffset =
    typeof location.state?.railOffset === "number"
      ? location.state.railOffset
      : Number.isFinite(queryRailOffset)
        ? queryRailOffset
        : 0;
  const {
    dragHandleProps,
    railOffset,
    railRef,
    railStyle,
    selectIndex,
    selectedIndex,
    setItemRef,
    snapIndex,
    visibleIndexes,
  } =
    useCartSwipe(
      dateCarts.length,
      initialSelectedIndex,
      initialRailOffset,
      activeView,
    );
  const viewRailStyle =
    transitionPhase === "idle" ? railStyle : { ...railStyle, transition: "none" };
  const visibleDateKeys = useMemo(() => {
    const indexes = visibleIndexes.length > 0 ? visibleIndexes : [selectedIndex];

    return Array.from(
      new Set(
        indexes
          .map((index) => dateCarts[index]?.dateKey)
          .filter((dateKey): dateKey is string => Boolean(dateKey)),
      ),
    ).sort((first, second) => first.localeCompare(second));
  }, [dateCarts, selectedIndex, visibleIndexes]);
  const visibleDateRangeKey = visibleDateKeys.join("|");
  const isCartDataResolved = (dateKey: string) =>
    !isAuthReady
      ? false
      : !isAuthenticated ||
    dbCartData.loadedDateKeys.has(dateKey) ||
    dbCartData.status === "error";
  const dbItemsByCartId = useMemo(() => {
    if (!isAuthenticated) return undefined;

    return dateCarts.reduce<Record<string, SlotItem[]>>((itemsByCartId, cart) => {
      if (dbCartData.loadedDateKeys.has(cart.dateKey)) {
        itemsByCartId[cart.id] = dbCartData.slotItemsByDate[cart.dateKey] ?? [];
      }
      return itemsByCartId;
    }, {});
  }, [
    dateCarts,
    dbCartData.loadedDateKeys,
    dbCartData.slotItemsByDate,
    isAuthenticated,
  ]);
  const dbNoSpendCartIds = useMemo(() => {
    if (!isAuthenticated) return new Set<string>();

    return new Set(
      dateCarts
        .filter(
          (cart) =>
            dbCartData.loadedDateKeys.has(cart.dateKey) &&
            dbCartData.noSpendDateKeys.has(cart.dateKey),
        )
        .map((cart) => cart.id),
    );
  }, [
    dateCarts,
    dbCartData.loadedDateKeys,
    dbCartData.noSpendDateKeys,
    isAuthenticated,
  ]);
  const effectiveNoSpendCartIds = useMemo(() => {
    return new Set([...dbNoSpendCartIds, ...noSpendCartIds]);
  }, [dbNoSpendCartIds, noSpendCartIds]);
  const loadingCartIds = useMemo(
    () =>
      new Set(
        dateCarts
          .filter((cart) => !isCartDataResolved(cart.dateKey))
          .map((cart) => cart.id),
      ),
    [dateCarts, dbCartData.loadedDateKeys, dbCartData.status, isAuthenticated],
  );
  const getDisplayCartItems = (cartId: string, dateKey: string) =>
    !isAuthReady || (isAuthenticated && !dbCartData.loadedDateKeys.has(dateKey))
      ? []
      : dbCartData.loadedDateKeys.has(dateKey)
      ? dbCartData.slotItemsByDate[dateKey] ?? []
      : getCartSlotItems(cartId);
  const getDisplayCartSummary = (cartId: string, dateKey: string) => {
    if (!isAuthReady || (isAuthenticated && !dbCartData.loadedDateKeys.has(dateKey))) {
      return { itemCount: 0, totalAmount: 0 };
    }

    if (dbCartData.loadedDateKeys.has(dateKey)) {
      const dbItems = dbCartData.slotItemsByDate[dateKey] ?? [];

      return {
        itemCount: dbItems.length,
        totalAmount: dbItems.reduce((sum, item) => sum + item.amount, 0),
      };
    }

    return getCartSlotSummary(cartId);
  };
  const getSelectedCartSummary = () => {
    const selectedCart = dateCarts[selectedIndex];

    if (!selectedCart) {
      return { itemCount: 0, totalAmount: 0 };
    }

    return getDisplayCartSummary(selectedCart.id, selectedCart.dateKey);
  };
  const getCommonAnalyticsProperties = () => ({
    is_logged_in: isAuthenticated,
    is_terms_agreed: hasAcceptedTerms,
    item_count_for_date: getSelectedCartSummary().itemCount,
    selected_date: cartDates[selectedIndex],
  });
  const getDidChangeTime = () => itemTime !== itemFlowInitialTimeRef.current;
  const getItemFlowElapsedMs = () =>
    itemFlowStartedAtRef.current === null
      ? undefined
      : Math.round(performance.now() - itemFlowStartedAtRef.current);
  const getDateDirection = (fromDate: string, toDate: string) => {
    if (toDate > fromDate) return "next";
    if (toDate < fromDate) return "prev";

    return "manual";
  };
  const getFrozenRailStyle = () => {
    const rail = railRef.current;
    const computedTransform = rail
      ? window.getComputedStyle(rail).transform
      : null;

    return {
      transform:
        computedTransform && computedTransform !== "none"
          ? computedTransform
          : railStyle.transform,
      transition: "none",
    } satisfies CSSProperties;
  };
  const cartRailStyle =
    transitionPhase === "receipt-prep" || transitionPhase === "cart-to-receipt"
      ? frozenExitRailStyle ?? viewRailStyle
      : viewRailStyle;
  const receiptRailStyle =
    transitionPhase === "receipt-to-cart"
      ? frozenExitRailStyle ?? viewRailStyle
      : viewRailStyle;
  const isAllRequiredAgreed = requiredAgreementItems.every(
    (item) => requiredAgreements[item.id],
  );
  const showLoginToast = () => {
    if (loginToastTimerRef.current !== null) {
      window.clearTimeout(loginToastTimerRef.current);
    }

    setIsLoginToastVisible(false);
    window.requestAnimationFrame(() => {
      setIsLoginToastVisible(true);
      loginToastTimerRef.current = window.setTimeout(() => {
        setIsLoginToastVisible(false);
        loginToastTimerRef.current = null;
      }, LOGIN_TOAST_MS);
    });
  };
  const showBackgroundFailureToast = () => {
    if (backgroundFailureToastTimerRef.current !== null) {
      window.clearTimeout(backgroundFailureToastTimerRef.current);
    }

    setIsBackgroundFailureToastVisible(false);
    window.requestAnimationFrame(() => {
      setIsBackgroundFailureToastVisible(true);
      backgroundFailureToastTimerRef.current = window.setTimeout(() => {
        setIsBackgroundFailureToastVisible(false);
        backgroundFailureToastTimerRef.current = null;
      }, LOGIN_TOAST_MS);
    });
  };
  const showPhotoPreparingToast = () => {
    if (photoPreparingToastTimerRef.current !== null) {
      window.clearTimeout(photoPreparingToastTimerRef.current);
      photoPreparingToastTimerRef.current = null;
    }
    if (photoPreparingDotsTimerRef.current === null) {
      photoPreparingDotsTimerRef.current = window.setInterval(() => {
        setPhotoPreparingDotCount((currentCount) =>
          currentCount >= 3 ? 1 : currentCount + 1,
        );
      }, 420);
    }

    setPhotoPreparingDotCount(1);
    setIsPhotoPreparingToastVisible(true);
  };
  const hidePhotoPreparingToast = () => {
    if (photoPreparingToastTimerRef.current !== null) {
      window.clearTimeout(photoPreparingToastTimerRef.current);
      photoPreparingToastTimerRef.current = null;
    }
    if (photoPreparingDotsTimerRef.current !== null) {
      window.clearInterval(photoPreparingDotsTimerRef.current);
      photoPreparingDotsTimerRef.current = null;
    }

    setIsPhotoPreparingToastVisible(false);
    setPhotoPreparingDotCount(1);
  };
  const showActionFailureToast = (message: string) => {
    if (actionFailureToastTimerRef.current !== null) {
      window.clearTimeout(actionFailureToastTimerRef.current);
    }

    setActionFailureToastMessage("");
    window.requestAnimationFrame(() => {
      setActionFailureToastMessage(message);
      actionFailureToastTimerRef.current = window.setTimeout(() => {
        setActionFailureToastMessage("");
        actionFailureToastTimerRef.current = null;
      }, LOGIN_TOAST_MS);
    });
  };
  const showNavigationPendingToast = (navItem?: string) => {
    trackEvent(analyticsEvents.NOT_READY_NAV_CLICKED, {
      ...getCommonAnalyticsProperties(),
      nav_item: navItem,
    });
    showActionFailureToast("아직 준비 중이에요.");
  };
  const openLegalDocument = (
    path: "/privacy" | "/terms",
    location: "footer" | "terms_sheet" = "footer",
  ) => {
    trackEvent(analyticsEvents.TERMS_LINK_CLICKED, {
      ...getCommonAnalyticsProperties(),
      link_type: path === "/privacy" ? "privacy" : "terms",
      location,
    });
    setIsTermsSheetOpen(false);
    navigate(path);
  };
  const resetItemImagePreparation = () => {
    imagePreparationRunRef.current += 1;
    originalImageUploadPromiseRef.current = null;
    backgroundRemovalPromiseRef.current = null;
    backgroundRemovalFailedRef.current = false;
    setUploadedOriginalImageUrl("");
    setPendingRemovedBgImageUrl("");
    setHasBackgroundRemovalFailed(false);
  };
  const openTermsSheet = () => {
    setIsTermsSheetOpen(true);
  };
  const startGoogleLogin = () => {
    trackEvent(analyticsEvents.LOGIN_BUTTON_CLICKED, {
      ...getCommonAnalyticsProperties(),
      source: "login_cta",
    });

    if (!isSupabaseConfigured) {
      showLoginToast();
      return;
    }

    void signInWithGoogle().catch(() => {
      showLoginToast();
    });
  };
  const requireStorageAccess = () => {
    if (!isAuthReady || !user?.id || isLoggedOutStart) {
      showLoginToast();
      return false;
    }

    if (!hasAcceptedTerms) {
      openTermsSheet();
      return false;
    }

    return true;
  };
  const openItemTimePicker = () => {
    const parsedItemTime = parseItemTime(itemTime || DEFAULT_ITEM_TIME);
    trackEvent(analyticsEvents.ITEM_TIME_OPENED, {
      ...getCommonAnalyticsProperties(),
      selected_date: itemDate,
    });
    setDraftItemTimePeriod(parsedItemTime.period);
    setDraftItemTimeHour(parsedItemTime.hour);
    setDraftItemTimeMinute(parsedItemTime.minute);
    setIsItemTimePickerOpen(true);
  };
  const closeItemTimePicker = () => {
    setIsItemTimePickerOpen(false);
  };
  const confirmItemTimePicker = () => {
    const nextItemTime = formatItemTime(
      draftItemTimePeriod,
      draftItemTimeHour,
      draftItemTimeMinute,
    );

    if (nextItemTime !== itemTime) {
      trackEvent(analyticsEvents.ITEM_TIME_CHANGED, {
        ...getCommonAnalyticsProperties(),
        changed: true,
        selected_date: itemDate,
      });
    }

    setItemTime(nextItemTime);
    setIsItemTimePickerOpen(false);
  };
  const openItemFlow = (
    index = selectedIndex,
    imageFile: File | null = null,
    entryPoint = "unknown",
  ) => {
    const selectedFlowDate = cartDates[index] ?? getKoreaToday();

    itemFlowStartedAtRef.current = performance.now();
    itemFlowEntryPointRef.current = entryPoint;
    itemFlowInitialTimeRef.current = DEFAULT_ITEM_TIME;
    priceEnteredTrackedRef.current = false;
    priceStepViewedRef.current = false;
    detailsStepViewedRef.current = false;
    trackEvent(analyticsEvents.ITEM_ADD_STARTED, {
      ...getCommonAnalyticsProperties(),
      entry_point: entryPoint,
      selected_date: selectedFlowDate,
    });
    setEditingItem(null);
    resetItemImagePreparation();
    setSelectedItemImageFile(imageFile);
    setItemFlowStep("price");
    setItemPrice("");
    setItemCategory("");
    setItemReason("");
    setItemDate(selectedFlowDate);
    setItemTime(DEFAULT_ITEM_TIME);
    setDraftItemTimePeriod("AM");
    setDraftItemTimeHour("11");
    setDraftItemTimeMinute("00");
  };
  const closeItemFlow = () => {
    if (itemFlowStartedAtRef.current !== null && !editingItem) {
      trackEvent(analyticsEvents.ITEM_ADD_CANCELLED, {
        ...getCommonAnalyticsProperties(),
        elapsed_ms: getItemFlowElapsedMs(),
        selected_date: itemDate,
        step: itemFlowStep ?? "unknown",
      });
    }

    itemFlowStartedAtRef.current = null;
    setItemFlowStep(null);
    setIsItemDatePickerOpen(false);
    setIsItemTimePickerOpen(false);
    setEditingItem(null);
    setIsItemFlowSaving(false);
    hidePhotoPreparingToast();
    setActionFailureToastMessage("");
    setSelectedItemImageFile(null);
    resetItemImagePreparation();
  };
  const getItemDetailKey = (cartId: string, itemId: string) =>
    `${cartId}:${itemId}`;
  const getCategoryLabel = (categoryId: string) =>
    getItemCategoryLabel(categoryId);
  const getReasonLabel = (reasonId: string) =>
    itemReasons.find((reason) => reason.id === reasonId)?.label ?? "구매이유";
  const getDefaultItemMetadata = (itemId: string): ItemDetailMetadata => {
    if (itemId === "item-b") {
      return {
        categoryId: "cafe-snack",
        reasonId: "refresh",
        time: "AM 10:11",
      };
    }

    return {
      categoryId: "food",
      reasonId: "necessary",
      time: "AM 09:12",
    };
  };
  const getItemMetadata = (cartId: string, itemId: string) =>
    itemDetailMetadata[getItemDetailKey(cartId, itemId)] ??
    getDefaultItemMetadata(itemId);
  const getDetailGradient = (itemKey: string) => {
    if (!detailGradientRef.current[itemKey]) {
      let hash = 0;

      for (const character of itemKey) {
        hash += character.charCodeAt(0);
      }

      detailGradientRef.current[itemKey] =
        detailPictureGradients[hash % detailPictureGradients.length];
    }

    return detailGradientRef.current[itemKey];
  };
  const getDetailItems = (cartId: string) =>
    dbItemsByCartId?.[cartId] ?? getCartSlotItems(cartId);
  const openItemDetails = (cartId: string, itemId: string) => {
    const detailCart = dateCarts.find((cart) => cart.id === cartId);
    const metadata = getItemMetadata(cartId, itemId);

    trackEvent(analyticsEvents.ITEM_DETAIL_OPENED, {
      ...getCommonAnalyticsProperties(),
      category: metadata.categoryId,
      selected_date: detailCart?.dateKey,
    });
    setDetailOverlay({ cartId, itemId, isClosing: false });
  };
  const closeItemDetails = () => {
    if (!detailOverlay || detailOverlay.isClosing) return;

    setDetailOverlay({ ...detailOverlay, isClosing: true });
    window.setTimeout(() => {
      setDetailOverlay(null);
    }, ADD_SHEET_ANIMATION_MS);
  };
  const changeDetailItem = (direction: -1 | 1) => {
    if (!detailOverlay) return;

    const items = getDetailItems(detailOverlay.cartId);
    const currentIndex = items.findIndex((item) => item.id === detailOverlay.itemId);
    const nextItem = items[currentIndex + direction];

    if (!nextItem) return;

    setDetailOverlay({
      cartId: detailOverlay.cartId,
      itemId: nextItem.id,
      isClosing: false,
    });
  };
  const removeDbItemFromState = (
    cartId: string,
    dateKey: string,
    itemId: string,
  ) => {
    setDbCartData((currentData) => ({
      ...currentData,
      slotItemsByDate: {
        ...currentData.slotItemsByDate,
        [dateKey]: (currentData.slotItemsByDate[dateKey] ?? []).filter(
          (item) => item.id !== itemId,
        ),
      },
    }));
    deleteCartSlotItem(cartId, itemId);
    setItemDetailMetadata((currentMetadata) => {
      const nextMetadata = { ...currentMetadata };
      delete nextMetadata[getItemDetailKey(cartId, itemId)];
      return nextMetadata;
    });
    setCartDataVersion((version) => version + 1);
  };
  const deleteCurrentDetailItem = async () => {
    if (!detailOverlay) return;

    if (!requireStorageAccess()) return;
    const userId = user?.id;
    if (!userId) return;

    const detailCart = dateCarts.find((cart) => cart.id === detailOverlay.cartId);
    if (!detailCart) return;

    const currentItems = getDetailItems(detailOverlay.cartId);
    const currentIndex = currentItems.findIndex(
      (item) => item.id === detailOverlay.itemId,
    );
    const nextItems = currentItems.filter((item) => item.id !== detailOverlay.itemId);
    const dbItems = dbItemsByCartId?.[detailOverlay.cartId] ?? [];
    const isDbItem = dbItems.some((item) => item.id === detailOverlay.itemId);
    const metadata = getItemMetadata(detailOverlay.cartId, detailOverlay.itemId);
    let hadRemovedBg = false;

    try {
      if (isDbItem) {
        const deletedItem = await deleteItem(detailOverlay.itemId);
        hadRemovedBg =
          Boolean(deletedItem.removed_bg_image_url) &&
          deletedItem.removed_bg_image_url !== deletedItem.original_image_url;

        void deleteItemImages({
          originalImageUrl: deletedItem.original_image_url,
          removedBgImageUrl: deletedItem.removed_bg_image_url,
          userId,
        }).catch((storageError: unknown) => {
          console.error("Failed to delete item images from Storage.", storageError);
        });
      }

      removeDbItemFromState(
        detailOverlay.cartId,
        detailCart.dateKey,
        detailOverlay.itemId,
      );
      trackEvent(analyticsEvents.ITEM_DELETED, {
        ...getCommonAnalyticsProperties(),
        category: metadata.categoryId,
        had_removed_bg: hadRemovedBg,
        selected_date: detailCart.dateKey,
      });
    } catch (error) {
      console.error("Failed to delete item.", error);
      showActionFailureToast("삭제에 실패했어요. 다시 시도해주세요.");
      return;
    }

    if (nextItems.length === 0) {
      closeItemDetails();
      return;
    }

    const nextItem = nextItems[Math.min(currentIndex, nextItems.length - 1)];
    setDetailOverlay({
      cartId: detailOverlay.cartId,
      itemId: nextItem.id,
      isClosing: false,
    });
  };
  const openEditItemFlow = () => {
    if (!detailOverlay) return;

    const item = getDetailItems(detailOverlay.cartId).find(
      (entry) => entry.id === detailOverlay.itemId,
    );
    if (!item) return;

    const metadata = getItemMetadata(detailOverlay.cartId, detailOverlay.itemId);
    const cartDate =
      dateCarts.find((cart) => cart.id === detailOverlay.cartId)?.dateKey ??
      getKoreaToday();

    setEditingItem({
      cartId: detailOverlay.cartId,
      itemId: detailOverlay.itemId,
    });
    setItemFlowStep("price");
    setItemPrice(String(item.amount));
    setItemCategory(metadata.categoryId);
    setItemReason(metadata.reasonId);
    setItemDate(cartDate);
    setItemTime(metadata.time);
    const parsedMetadataTime = parseItemTime(metadata.time || DEFAULT_ITEM_TIME);
    setDraftItemTimePeriod(parsedMetadataTime.period);
    setDraftItemTimeHour(parsedMetadataTime.hour);
    setDraftItemTimeMinute(parsedMetadataTime.minute);
    setDetailOverlay(null);
  };
  const createFlowSlotItem = (cartId: string): SlotItem => {
    const currentItems = getCartSlotItems(cartId);
    const offset = currentItems.length % 3;
    const itemId = `item-${Date.now()}`;

    return {
      anchor: { x: 0.72, y: 0.56 },
      amount: Number(itemPrice),
      id: itemId,
      imageSrc: itemCategory === "cafe-snack" ? "/items/Coffee.png" : "/items/Salad.png",
      category: itemCategory,
      rotation: offset === 1 ? -18 : offset === 2 ? 24 : 8,
      size: itemCategory === "cafe-snack" ? 126 : 148,
      tagOffset: { x: 146, y: 84 },
      tagRotation: offset === 1 ? 26 : -22,
      x: 48 + offset * 28,
      y: 82 + offset * 54,
    };
  };
  const addCreatedDbItemToState = (dateKey: string, item: SlotItem) => {
    setDbCartData((currentData) => {
      const currentItems = currentData.slotItemsByDate[dateKey] ?? [];

      return {
        ...currentData,
        loadedDateKeys: new Set([...currentData.loadedDateKeys, dateKey]),
        slotItemsByDate: {
          ...currentData.slotItemsByDate,
          [dateKey]: [...currentItems, item],
        },
        status: "ready",
      };
    });
  };
  const updateDbItemInState = (
    dateKey: string,
    itemId: string,
    updates: Partial<Pick<SlotItem, "amount" | "category" | "imageSrc">>,
  ) => {
    setDbCartData((currentData) => ({
      ...currentData,
      slotItemsByDate: {
        ...currentData.slotItemsByDate,
        [dateKey]: (currentData.slotItemsByDate[dateKey] ?? []).map((item) =>
          item.id === itemId ? { ...item, ...updates } : item,
        ),
      },
    }));
  };
  const createPendingImageKey = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };
  const startSelectedItemImagePreparation = (targetDate: string) => {
    if (!selectedItemImageFile || !user?.id) return null;

    if (originalImageUploadPromiseRef.current) {
      return originalImageUploadPromiseRef.current;
    }

    const runId = imagePreparationRunRef.current;
    const tempKey = createPendingImageKey();
    const uploadPromise = uploadItemImage({
      date: targetDate,
      file: selectedItemImageFile,
      userId: user.id,
    })
      .then((imageUrl) => {
        if (imagePreparationRunRef.current === runId) {
          setUploadedOriginalImageUrl(imageUrl);
        }

        backgroundRemoveStartedAtRef.current = performance.now();
        trackEvent(analyticsEvents.BACKGROUND_REMOVE_STARTED, {
          ...getCommonAnalyticsProperties(),
          selected_date: targetDate,
          source: itemFlowImageSourceRef.current ?? "unknown",
        });

        const removalPromise = removeItemBackground({
          date: targetDate,
          image_url: imageUrl,
          temp_key: tempKey,
          user_id: user.id,
        })
          .then((result) => {
            const removedBgImageUrl = result.removed_bg_image_url ?? null;

            if (
              removedBgImageUrl &&
              imagePreparationRunRef.current === runId
            ) {
              setPendingRemovedBgImageUrl(removedBgImageUrl);
            }

            trackEvent(analyticsEvents.BACKGROUND_REMOVE_COMPLETED, {
              ...getCommonAnalyticsProperties(),
              duration_ms:
                backgroundRemoveStartedAtRef.current === null
                  ? undefined
                  : Math.round(
                      performance.now() - backgroundRemoveStartedAtRef.current,
                    ),
              selected_date: targetDate,
            });

            return removedBgImageUrl;
          })
          .catch((backgroundError: unknown) => {
            console.error("Failed to remove item background.", backgroundError);
            backgroundRemovalFailedRef.current = true;
            trackEvent(analyticsEvents.BACKGROUND_REMOVE_FAILED, {
              ...getCommonAnalyticsProperties(),
              error_type: "background_remove_error",
              selected_date: targetDate,
            });

            if (imagePreparationRunRef.current === runId) {
              setHasBackgroundRemovalFailed(true);
              setPendingRemovedBgImageUrl("");
            }

            return null;
          });

        backgroundRemovalPromiseRef.current = removalPromise;
        return imageUrl;
      });

    originalImageUploadPromiseRef.current = uploadPromise;
    return uploadPromise;
  };
  const handlePriceNext = () => {
    if (!isPriceReady) return;

    trackEvent(analyticsEvents.ITEM_PRICE_NEXT_CLICKED, {
      ...getCommonAnalyticsProperties(),
      has_price: isPriceReady,
      price_range: getPriceRange(itemPrice),
      selected_date: itemDate,
    });
    if (!priceEnteredTrackedRef.current) {
      trackEvent(analyticsEvents.ITEM_PRICE_ENTERED, {
        ...getCommonAnalyticsProperties(),
        price_range: getPriceRange(itemPrice),
        selected_date: itemDate,
      });
      priceEnteredTrackedRef.current = true;
    }
    setItemFlowStep("details");

    if (!selectedItemImageFile || !user?.id) return;

    void startSelectedItemImagePreparation(toDatabaseDate(itemDate))?.catch(
      (uploadError: unknown) => {
        console.error("Failed to upload item image.", uploadError);
        showActionFailureToast("이미지 업로드에 실패했어요. 다시 시도해주세요.");
      },
    );
  };
  const saveItemFlow = async () => {
    if (!isPriceReady || isItemFlowSaving) return;

    if (!editingItem) {
      trackEvent(analyticsEvents.ITEM_ADD_SUBMIT_CLICKED, {
        ...getCommonAnalyticsProperties(),
        did_change_time: getDidChangeTime(),
        has_category: Boolean(itemCategory),
        has_reason: Boolean(itemReason),
        price_range: getPriceRange(itemPrice),
        selected_date: itemDate,
      });
    }

    if (!itemCategory) {
      trackEvent(analyticsEvents.CATEGORY_REQUIRED_SHOWN, {
        ...getCommonAnalyticsProperties(),
        did_change_time: getDidChangeTime(),
        has_price: isPriceReady,
        has_reason: Boolean(itemReason),
        selected_date: itemDate,
      });
      showActionFailureToast("카테고리를 선택해주세요.");
      return;
    }

    if (!itemReason) {
      showActionFailureToast("구매 이유를 선택해주세요.");
      return;
    }

    if (!requireStorageAccess()) return;

    if (editingItem) {
      const editedCart = dateCarts.find((cart) => cart.id === editingItem.cartId);
      const previousItem = getDetailItems(editingItem.cartId).find(
        (item) => item.id === editingItem.itemId,
      );
      const previousMetadata = getItemMetadata(
        editingItem.cartId,
        editingItem.itemId,
      );
      const dbItems = dbItemsByCartId?.[editingItem.cartId] ?? [];
      const isDbItem =
        dbItems.some((item) => item.id === editingItem.itemId) ||
        SUPABASE_UUID_PATTERN.test(editingItem.itemId);
      const nextAmount = Number(itemPrice);

      if (isDbItem) {
        if (!editedCart) return;

        setIsItemFlowSaving(true);

        try {
          await updateItem(editingItem.itemId, {
            category: itemCategory as ItemCategory,
            price: nextAmount,
            reason: itemReason as ItemReason,
          });
          updateDbItemInState(editedCart.dateKey, editingItem.itemId, {
            amount: nextAmount,
            category: itemCategory,
          });
        } catch (error) {
          console.error("Failed to update item.", error);
          showActionFailureToast("수정에 실패했어요. 다시 시도해주세요.");
          setIsItemFlowSaving(false);
          return;
        }
      }

      updateCartSlotItem(editingItem.cartId, editingItem.itemId, {
        amount: nextAmount,
        category: itemCategory,
      });
      setItemDetailMetadata((currentMetadata) => ({
        ...currentMetadata,
        [getItemDetailKey(editingItem.cartId, editingItem.itemId)]: {
          categoryId: itemCategory,
          reasonId: itemReason,
          time: itemTime,
        },
      }));
      setCartDataVersion((version) => version + 1);
      trackEvent(analyticsEvents.ITEM_UPDATED, {
        ...getCommonAnalyticsProperties(),
        category: itemCategory,
        changed_fields: [
          previousItem?.amount !== nextAmount ? "price" : "",
          previousMetadata.categoryId !== itemCategory ? "category" : "",
          previousMetadata.reasonId !== itemReason ? "reason" : "",
          previousMetadata.time !== itemTime ? "time" : "",
        ].filter(Boolean),
        price_range: getPriceRange(nextAmount),
        selected_date: editedCart?.dateKey ?? itemDate,
      });
      closeItemFlow();
      return;
    }

    const itemDateCartIndex = cartDates.indexOf(itemDate);
    const targetIndex = itemDateCartIndex >= 0 ? itemDateCartIndex : selectedIndex;
    const targetCart = dateCarts[targetIndex] ?? dateCarts[selectedIndex];
    if (!targetCart) return;

    if (!isAuthReady || !user?.id || isLoggedOutStart) {
      showLoginToast();
      return;
    }
    const userId = user.id;

    const targetCartId = targetCart.id;
    const targetDateKey = targetCart.dateKey;
    const targetDate = toDatabaseDate(targetDateKey);
    const fallbackImageSrc =
      itemCategory === "cafe-snack" ? "/items/Coffee.png" : "/items/Salad.png";
    const hadNoSpendDay =
      effectiveNoSpendCartIds.has(targetCartId) ||
      dbCartData.noSpendDateKeys.has(targetDateKey);

    setIsItemFlowSaving(true);

    try {
      const hasSelectedImageFile = Boolean(selectedItemImageFile);
      let imageSrc = fallbackImageSrc;
      let removedBgImageSrc = fallbackImageSrc;
      let shouldShowBackgroundFailureToast = false;

      if (hasSelectedImageFile) {
        try {
          imageSrc =
            uploadedOriginalImageUrl ||
            (await (originalImageUploadPromiseRef.current ??
              startSelectedItemImagePreparation(targetDate))) ||
            fallbackImageSrc;
        } catch (uploadError) {
          console.error("Failed to upload item image.", uploadError);
          showActionFailureToast(
            "이미지 업로드에 실패했어요. 다시 시도해주세요.",
          );
          setIsItemFlowSaving(false);
          return;
        }

        removedBgImageSrc = pendingRemovedBgImageUrl || imageSrc;

        const pendingRemovalPromise = backgroundRemovalPromiseRef.current;
        const backgroundRemovalAlreadyFailed =
          hasBackgroundRemovalFailed || backgroundRemovalFailedRef.current;

        if (
          pendingRemovalPromise &&
          !pendingRemovedBgImageUrl &&
          !backgroundRemovalAlreadyFailed
        ) {
          trackEvent(analyticsEvents.BACKGROUND_REMOVE_WAIT_SHOWN, {
            ...getCommonAnalyticsProperties(),
            elapsed_ms: getItemFlowElapsedMs(),
            selected_date: targetDateKey,
          });
          showPhotoPreparingToast();
          const removedBgImageUrl = await pendingRemovalPromise;
          hidePhotoPreparingToast();

          if (removedBgImageUrl) {
            removedBgImageSrc = removedBgImageUrl;
          } else {
            removedBgImageSrc = imageSrc;
            shouldShowBackgroundFailureToast = true;
          }
        } else if (backgroundRemovalAlreadyFailed) {
          removedBgImageSrc = imageSrc;
          shouldShowBackgroundFailureToast = true;
        }
      } else {
        removedBgImageSrc = imageSrc;
      }

      if (hadNoSpendDay) {
        await deleteNoSpendDay(userId, targetDate);
        unsetNoSpendStateForDate(targetCartId, targetDateKey);
      }

      const createdItem = await createItem({
        cart_color: getCartColorValue(targetCart),
        category: itemCategory as ItemCategory,
        date: targetDate,
        original_image_url: imageSrc,
        price: Number(itemPrice),
        reason: itemReason as ItemReason,
        removed_bg_image_url: removedBgImageSrc,
        user_id: userId,
      });
      const existingItems = dbCartData.slotItemsByDate[targetDateKey] ?? [];
      const nextItem = itemToSlotItem(createdItem, existingItems.length);

      addCreatedDbItemToState(targetDateKey, nextItem);
      addCartSlotItem(targetCartId, nextItem);
      setItemDetailMetadata((currentMetadata) => ({
        ...currentMetadata,
        [getItemDetailKey(targetCartId, nextItem.id)]: {
          categoryId: itemCategory,
          reasonId: itemReason,
          time: itemTime,
        },
      }));
      setCartDataVersion((version) => version + 1);
      trackEvent(analyticsEvents.ITEM_CREATED, {
        ...getCommonAnalyticsProperties(),
        background_removed: removedBgImageSrc !== imageSrc,
        category: itemCategory,
        did_change_time: getDidChangeTime(),
        duration_ms: getItemFlowElapsedMs(),
        has_category: Boolean(itemCategory),
        has_image: hasSelectedImageFile,
        has_reason: Boolean(itemReason),
        items_added_count_for_date: existingItems.length + 1,
        price_range: getPriceRange(itemPrice),
        selected_date: targetDateKey,
      });
      itemFlowStartedAtRef.current = null;
      closeItemFlow();

      if (hasSelectedImageFile && shouldShowBackgroundFailureToast) {
        showBackgroundFailureToast();
      }
    } catch (error) {
      console.error("Failed to save item.", error);
      hidePhotoPreparingToast();

      if (hadNoSpendDay) {
        setNoSpendStateForDate(targetCartId, targetDateKey);
        void upsertNoSpendDay({
          date: targetDate,
          user_id: userId,
        }).catch((restoreError: unknown) => {
          console.error("Failed to restore no-spend day.", restoreError);
        });
      }

      showActionFailureToast("저장에 실패했어요. 다시 시도해주세요.");
      setIsItemFlowSaving(false);
    }
  };
  const handleItemPriceChange = (value: string) => {
    const nextPrice = value.replace(/[^\d]/g, "");

    if (nextPrice && !priceEnteredTrackedRef.current) {
      trackEvent(analyticsEvents.ITEM_PRICE_ENTERED, {
        ...getCommonAnalyticsProperties(),
        price_range: getPriceRange(nextPrice),
        selected_date: itemDate,
      });
      priceEnteredTrackedRef.current = true;
    }

    setItemPrice(nextPrice);
  };
  const toggleRequiredAgreement = (id: RequiredAgreementKey) => {
    setRequiredAgreements((currentAgreements) => ({
      ...currentAgreements,
      [id]: !currentAgreements[id],
    }));
  };
  const setAllRequiredAgreements = (checked: boolean) => {
    setRequiredAgreements({
      age: checked,
      privacy: checked,
      terms: checked,
    });
  };
  const startHome = () => {
    if (!isAllRequiredAgreed) return;

    if (!user?.id) {
      startGoogleLogin();
      return;
    }

    writeTermsAgreement(user.id);
    trackEvent(analyticsEvents.TERMS_AGREED, {
      ...getCommonAnalyticsProperties(),
    });
    setHasAcceptedTerms(true);
    setIsTermsSheetOpen(false);
    resetStartState();
  };
  const resetStartState = () => {
    navigate(`/home-defaultu9501?selectedIndex=${selectedIndex}&selectedDate=${cartDates[selectedIndex]}`, {
      replace: true,
      state: { selectedIndex, selectedDate: cartDates[selectedIndex] },
    });
  };
  const logoutToStart = () => {
    trackEvent(analyticsEvents.LOGOUT_CLICKED, {
      ...getCommonAnalyticsProperties(),
    });
    void signOut().catch(() => {
      showLoginToast();
    });
    resetAnalytics();
    setIsTermsSheetOpen(false);
    setIsAddSheetOpen(false);
    setIsClosingAddSheet(false);
    setIsLoginToastVisible(false);
    setRequiredAgreements({
      age: false,
      privacy: false,
      terms: false,
    });
  };
  const renderAgreementCheckIcon = (checked: boolean) => (
    <svg
      className="terms-agreement-check-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {checked && (
        <path
          d="M3 7C3 4.79086 4.79086 3 7 3H17C19.2091 3 21 4.79086 21 7V17C21 19.2091 19.2091 21 17 21H7C4.79086 21 3 19.2091 3 17V7Z"
          fill="#18181B"
        />
      )}
      <path
        d="M7 3V4H17V3V2H7V3ZM21 7H20V17H21H22V7H21ZM17 21V20H7V21V22H17V21ZM3 17H4V7H3H2V17H3ZM7 21V20C5.34315 20 4 18.6569 4 17H3H2C2 19.7614 4.23858 22 7 22V21ZM21 17H20C20 18.6569 18.6569 20 17 20V21V22C19.7614 22 22 19.7614 22 17H21ZM17 3V4C18.6569 4 20 5.34315 20 7H21H22C22 4.23858 19.7614 2 17 2V3ZM7 3V2C4.23858 2 2 4.23858 2 7H3H4C4 5.34315 5.34315 4 7 4V3Z"
        fill={checked ? "#18181B" : "#D4D4D8"}
      />
      {checked && (
        <path
          d="M17.1133 8.38665C17.4517 8.72511 17.4517 9.27385 17.1133 9.61231L11.1133 15.6123C10.7748 15.9508 10.2261 15.9508 9.88763 15.6123L6.88763 12.6123C6.54918 12.2739 6.54918 11.7251 6.88763 11.3867C7.22608 11.0482 7.77483 11.0482 8.11328 11.3867L10.5005 13.7738L15.8876 8.38665C16.2261 8.0482 16.7748 8.0482 17.1133 8.38665Z"
          fill="#FFFFFF"
        />
      )}
    </svg>
  );

  const switchView = (view: "cart" | "receipt") => {
    if (isLoggedOutStart) {
      showLoginToast();
      return;
    }

    if (view === activeView) return;

    const selectedSummary = getSelectedCartSummary();
    trackEvent(
      view === "receipt"
        ? analyticsEvents.RECEIPT_VIEWED
        : analyticsEvents.CART_VIEWED,
      {
        ...getCommonAnalyticsProperties(),
        item_count: selectedSummary.itemCount,
        total_price_range:
          view === "receipt"
            ? getPriceRange(selectedSummary.totalAmount)
            : undefined,
      },
    );

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current);
      transitionFrameRef.current = null;
    }

    if (view === "receipt" && activeView === "cart") {
      setFrozenExitRailStyle(getFrozenRailStyle());
      setIsCartReturnReady(false);
      setActiveView("receipt");
      setTransitionPhase("receipt-prep");
      transitionFrameRef.current = window.requestAnimationFrame(() => {
        transitionFrameRef.current = window.requestAnimationFrame(() => {
          transitionFrameRef.current = null;
          setTransitionPhase("cart-to-receipt");
          transitionTimerRef.current = window.setTimeout(() => {
            setTransitionPhase("idle");
            setFrozenExitRailStyle(null);
            transitionTimerRef.current = null;
          }, VIEW_TRANSITION_MS);
        });
      });
      return;
    }

    setFrozenExitRailStyle(getFrozenRailStyle());
    setIsCartReturnReady(false);
    setTransitionPhase("receipt-to-cart");
    setActiveView(view);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        selectIndex(selectedIndex);
        window.requestAnimationFrame(() => {
          setIsCartReturnReady(true);
        });
      }, 80);
    });
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionPhase("idle");
      setFrozenExitRailStyle(null);
      transitionTimerRef.current = null;
      setIsCartReturnReady(true);
      window.requestAnimationFrame(() => {
        snapIndex(selectedIndex);
      });
    }, VIEW_TRANSITION_MS);
  };

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current);
    }
    if (loginToastTimerRef.current !== null) {
      window.clearTimeout(loginToastTimerRef.current);
    }
    if (photoPreparingToastTimerRef.current !== null) {
      window.clearTimeout(photoPreparingToastTimerRef.current);
    }
    if (photoPreparingDotsTimerRef.current !== null) {
      window.clearInterval(photoPreparingDotsTimerRef.current);
    }
    if (actionFailureToastTimerRef.current !== null) {
      window.clearTimeout(actionFailureToastTimerRef.current);
    }
  }, []);

  const selectDate = (dateKey: string) => {
    if (isLoggedOutStart) {
      showLoginToast();
      return false;
    }

    if (dateKey > getKoreaToday()) return false;

    const previousDateKey = cartDates[selectedIndex];
    const existingIndex = dateCarts.findIndex((cart) => cart.dateKey === dateKey);
    const nextDateCarts =
      existingIndex >= 0
        ? dateCarts
        : [
            ...dateCarts,
            { ...createEmptyCart(dateKey), dateKey },
          ].sort((first, second) => first.dateKey.localeCompare(second.dateKey));
    const nextIndex = nextDateCarts.findIndex((cart) => cart.dateKey === dateKey);

    if (nextDateCarts !== dateCarts) {
      setDateCarts(nextDateCarts);
    }

    selectIndex(nextIndex);
    trackEvent(analyticsEvents.DATE_CHANGED, {
      ...getCommonAnalyticsProperties(),
      direction: getDateDirection(previousDateKey, dateKey),
      from_date: previousDateKey,
      to_date: dateKey,
    });
    navigate(`/home-defaultu9501?selectedIndex=${nextIndex}&selectedDate=${dateKey}`, {
      replace: true,
      state: { selectedIndex: nextIndex, selectedDate: dateKey },
    });
    return true;
  };
  const setNoSpendStateForDate = (cartId: string, dateKey: string) => {
    setNoSpendCartIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(cartId);
      return nextIds;
    });

    setDbCartData((currentData) => ({
      ...currentData,
      loadedDateKeys: new Set([...currentData.loadedDateKeys, dateKey]),
      noSpendDateKeys: new Set([...currentData.noSpendDateKeys, dateKey]),
      status: currentData.status === "idle" ? "ready" : currentData.status,
    }));
  };
  const unsetNoSpendStateForDate = (cartId: string, dateKey: string) => {
    setNoSpendCartIds((currentIds) => {
      if (!currentIds.has(cartId)) return currentIds;

      const nextIds = new Set(currentIds);
      nextIds.delete(cartId);
      return nextIds;
    });

    setDbCartData((currentData) => {
      if (!currentData.noSpendDateKeys.has(dateKey)) return currentData;

      const nextDateKeys = new Set(currentData.noSpendDateKeys);
      nextDateKeys.delete(dateKey);

      return {
        ...currentData,
        noSpendDateKeys: nextDateKeys,
      };
    });
  };
  const markNoSpend = (index: number) => {
    const cart = dateCarts[index];
    if (!cart) return;

    const summary = getDisplayCartSummary(cart.id, cart.dateKey);
    if (summary.itemCount === 0 && !effectiveNoSpendCartIds.has(cart.id)) {
      trackEvent(analyticsEvents.EMPTY_STATE_CTA_CLICKED, {
        ...getCommonAnalyticsProperties(),
        cta_type: "no_spend_day",
        is_today: cart.dateKey === getKoreaToday(),
        selected_date: cart.dateKey,
      });
    }

    trackEvent(analyticsEvents.NO_SPEND_DAY_CLICKED, {
      ...getCommonAnalyticsProperties(),
      entry_point: activeView,
      selected_date: cart.dateKey,
    });

    if (!requireStorageAccess()) return;
    const userId = user?.id;
    if (!userId) return;

    if (summary.itemCount > 0) return;

    setNoSpendStateForDate(cart.id, cart.dateKey);

    void upsertNoSpendDay({
      date: toDatabaseDate(cart.dateKey),
      user_id: userId,
    })
      .then(() => {
        trackEvent(analyticsEvents.NO_SPEND_DAY_CREATED, {
          ...getCommonAnalyticsProperties(),
          selected_date: cart.dateKey,
        });
      })
      .catch((error: unknown) => {
        console.error("Failed to save no-spend day.", error);
        unsetNoSpendStateForDate(cart.id, cart.dateKey);
        showActionFailureToast("저장에 실패했어요. 다시 시도해주세요.");
      });
  };
  const clearNoSpend = (index: number) => {
    const cartId = dateCarts[index]?.id;
    if (!cartId) return;

    setNoSpendCartIds((currentIds) => {
      if (!currentIds.has(cartId)) return currentIds;

      const nextIds = new Set(currentIds);
      nextIds.delete(cartId);
      return nextIds;
    });
  };
  const openAddSheet = (index: number, entryPoint = "cart") => {
    if (!requireStorageAccess()) return;

    const cart = dateCarts[index];
    if (cart) {
      const summary = getDisplayCartSummary(cart.id, cart.dateKey);
      const isEmptyState =
        summary.itemCount === 0 && !effectiveNoSpendCartIds.has(cart.id);

      if (isEmptyState) {
        trackEvent(analyticsEvents.EMPTY_STATE_CTA_CLICKED, {
          ...getCommonAnalyticsProperties(),
          cta_type: "add_item",
          is_today: cart.dateKey === getKoreaToday(),
          selected_date: cart.dateKey,
        });
      }
    }

    clearNoSpend(index);
    selectIndex(index);
    setPendingAddIndex(index);
    itemFlowEntryPointRef.current = entryPoint;
    setIsClosingAddSheet(false);
    setIsAddSheetOpen(true);
  };
  const openAddSheetFromReceipt = (index: number) => {
    if (!requireStorageAccess()) return;

    const cart = dateCarts[index];
    if (cart) {
      trackEvent(analyticsEvents.EMPTY_STATE_CTA_CLICKED, {
        ...getCommonAnalyticsProperties(),
        cta_type: "add_item",
        is_today: cart.dateKey === getKoreaToday(),
        selected_date: cart.dateKey,
      });
    }

    clearNoSpend(index);
    selectIndex(index);
    setPendingAddIndex(index);
    itemFlowEntryPointRef.current = "receipt";
    setIsClosingAddSheet(false);
    setIsAddSheetOpen(true);
  };
  const startItemFlowFromAddSheet = (imageFile: File | null = null) => {
    const nextIndex = pendingAddIndex ?? selectedIndex;
    const entryPoint = itemFlowEntryPointRef.current;

    setIsAddSheetOpen(false);
    setIsClosingAddSheet(false);
    setPendingAddIndex(null);
    openItemFlow(nextIndex, imageFile, entryPoint);
  };
  const handleAddImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!imageFile) return;

    if (imageFile) {
      trackEvent(analyticsEvents.ITEM_IMAGE_SELECTED, {
        ...getCommonAnalyticsProperties(),
        file_size_bucket: getFileSizeBucket(imageFile.size),
        file_type: imageFile.type,
        source: itemFlowImageSourceRef.current ?? "unknown",
      });
    }

    startItemFlowFromAddSheet(imageFile);
  };
  const openFilePickerForAction = (actionId: string) => {
    itemFlowImageSourceRef.current = actionId;
    trackEvent(analyticsEvents.ITEM_IMAGE_SOURCE_SELECTED, {
      ...getCommonAnalyticsProperties(),
      source: actionId,
    });
    const input =
      actionId === "camera" ? cameraInputRef.current : galleryInputRef.current;

    if (!input) {
      return;
    }

    input.click();
  };
  const closeAddSheet = () => {
    if (isClosingAddSheet) return;

    setIsClosingAddSheet(true);
    window.setTimeout(() => {
      setIsAddSheetOpen(false);
      setIsClosingAddSheet(false);
      setPendingAddIndex(null);
    }, ADD_SHEET_ANIMATION_MS);
  };
  const todayDateKey = getKoreaToday();
  const isTodaySelected = cartDates[selectedIndex] === todayDateKey;
  const recordedDates = dateCarts.flatMap((cart) =>
    getDisplayCartSummary(cart.id, cart.dateKey).itemCount > 0 ||
    effectiveNoSpendCartIds.has(cart.id)
      ? [cart.dateKey]
      : [],
  );
  const itemDateIndex = Math.max(cartDates.indexOf(itemDate), 0);
  const isPriceReady = itemPrice.length > 0;

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user?.id) {
      setDbCartData({
        loadedDateKeys: new Set(),
        noSpendDateKeys: new Set(),
        slotItemsByDate: {},
        status: "idle",
      });
      return;
    }

    const dateKeys = visibleDateRangeKey
      .split("|")
      .filter((dateKey) => dateKey.length > 0);
    const startDateKey = dateKeys[0];
    const endDateKey = dateKeys[dateKeys.length - 1];

    if (!startDateKey || !endDateKey) return;

    let isCancelled = false;

    setDbCartData((currentData) => ({
      ...currentData,
      status: "loading",
    }));

    Promise.all([
      listItemsInDateRange(
        user.id,
        toDatabaseDate(startDateKey),
        toDatabaseDate(endDateKey),
      ),
      listNoSpendDaysInDateRange(
        user.id,
        toDatabaseDate(startDateKey),
        toDatabaseDate(endDateKey),
      ),
    ])
      .then(([itemsByDate, noSpendDays]) => {
        if (isCancelled) return;

        const items = Object.values(itemsByDate).flat();
        const fetchedDateKeys = dateKeys;
        const fetchedDateKeySet = new Set(fetchedDateKeys);
        const fetchedSlotItemsByDate = itemsToSlotItemsByDate(items);
        const fetchedNoSpendDateKeys = new Set(
          noSpendDays.map((noSpendDay) => toDateKey(noSpendDay.date)),
        );

        setDbCartData((currentData) => ({
          loadedDateKeys: new Set([
            ...currentData.loadedDateKeys,
            ...fetchedDateKeys,
          ]),
          noSpendDateKeys: new Set([
            ...[...currentData.noSpendDateKeys].filter(
              (dateKey) => !fetchedDateKeySet.has(dateKey),
            ),
            ...fetchedNoSpendDateKeys,
          ]),
          slotItemsByDate: {
            ...Object.fromEntries(
              Object.entries(currentData.slotItemsByDate).filter(
                ([dateKey]) => !fetchedDateKeySet.has(dateKey),
              ),
            ),
            ...fetchedSlotItemsByDate,
          },
          status: "ready",
        }));
        setItemDetailMetadata((currentMetadata) => {
          const nextMetadata = { ...currentMetadata };

          for (const item of items) {
            const cart = dateCarts.find((entry) => entry.dateKey === toDateKey(item.date));

            if (!cart) continue;

            nextMetadata[getItemDetailKey(cart.id, item.id)] = {
              categoryId: item.category ?? "food",
              reasonId: item.reason ?? "necessary",
              time: nextMetadata[getItemDetailKey(cart.id, item.id)]?.time ?? "AM 09:12",
            };
          }

          return nextMetadata;
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) return;

        console.error("Failed to load cart data from Supabase.", error);
        setDbCartData((currentData) => ({
          ...currentData,
          status: "error",
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, [
    isAuthReady,
    isAuthenticated,
    user?.id,
    visibleDateRangeKey,
  ]);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!isAuthenticated || !user?.id) {
      setHasAcceptedTerms(false);
      setIsTermsSheetOpen(false);
      return;
    }

    const hasStoredAgreement = readTermsAgreement(user.id);
    setHasAcceptedTerms(hasStoredAgreement);
    setIsTermsSheetOpen(!hasStoredAgreement);
    resetStartState();
  }, [isAuthReady, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthReady || appOpenedTrackedRef.current) return;

    const visitStorageKey = "ssun-baguni:last-visit-date";
    const today = getKoreaToday();
    const lastVisitDate =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(visitStorageKey);
    const daysSinceLastVisit = lastVisitDate
      ? Math.max(
          0,
          Math.round(
            (new Date(today.replaceAll(".", "-")).getTime() -
              new Date(lastVisitDate.replaceAll(".", "-")).getTime()) /
              86400000,
          ),
        )
      : undefined;

    trackEvent(analyticsEvents.APP_OPENED, {
      ...getCommonAnalyticsProperties(),
      days_since_last_visit: daysSinceLastVisit,
      is_first_visit: !lastVisitDate,
    });
    trackEvent(analyticsEvents.PAGE_VIEWED, {
      ...getCommonAnalyticsProperties(),
      page: "home",
    });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(visitStorageKey, today);
    }

    appOpenedTrackedRef.current = true;
  }, [isAuthReady]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user?.id) return;
    if (loginCompletedUserIdRef.current === user.id) return;

    identifyUser(user.id, {
      created_at: user.created_at,
    });
    trackEvent(analyticsEvents.LOGIN_COMPLETED, {
      ...getCommonAnalyticsProperties(),
    });
    loginCompletedUserIdRef.current = user.id;
  }, [isAuthReady, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isLoggedOutStart || loginCtaViewedTrackedRef.current) return;

    trackEvent(analyticsEvents.LOGIN_CTA_VIEWED, {
      ...getCommonAnalyticsProperties(),
    });
    loginCtaViewedTrackedRef.current = true;
  }, [isLoggedOutStart]);

  useEffect(() => {
    if (!isTermsSheetOpen) {
      termsSheetViewedRef.current = false;
      return;
    }
    if (termsSheetViewedRef.current) return;

    trackEvent(analyticsEvents.TERMS_SHEET_VIEWED, {
      ...getCommonAnalyticsProperties(),
    });
    termsSheetViewedRef.current = true;
  }, [isTermsSheetOpen]);

  useEffect(() => {
    const selectedSummary = getSelectedCartSummary();

    trackEvent(
      activeView === "receipt"
        ? analyticsEvents.RECEIPT_VIEWED
        : analyticsEvents.CART_VIEWED,
      {
        ...getCommonAnalyticsProperties(),
        item_count: selectedSummary.itemCount,
        total_price_range:
          activeView === "receipt"
            ? getPriceRange(selectedSummary.totalAmount)
            : undefined,
      },
    );
  }, [activeView, selectedIndex, cartDataVersion]);

  useEffect(() => {
    if (itemFlowStep === "price" && !priceStepViewedRef.current) {
      trackEvent(analyticsEvents.ITEM_PRICE_STEP_VIEWED, {
        ...getCommonAnalyticsProperties(),
        selected_date: itemDate,
      });
      priceStepViewedRef.current = true;
    }

    if (itemFlowStep === "details" && !detailsStepViewedRef.current) {
      trackEvent(analyticsEvents.ITEM_DETAILS_STEP_VIEWED, {
        ...getCommonAnalyticsProperties(),
        selected_date: itemDate,
      });
      detailsStepViewedRef.current = true;
    }
  }, [itemFlowStep, itemDate]);

  useEffect(() => {
    if (itemFlowStep !== "price" || typeof window === "undefined") {
      setKeyboardOffset(0);
      return;
    }

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const updateKeyboardOffset = () => {
      const viewportBottom = visualViewport.offsetTop + visualViewport.height;
      const nextOffset = Math.max(0, window.innerHeight - viewportBottom);
      setKeyboardOffset(Math.round(nextOffset));
    };

    updateKeyboardOffset();
    visualViewport.addEventListener("resize", updateKeyboardOffset);
    visualViewport.addEventListener("scroll", updateKeyboardOffset);

    return () => {
      visualViewport.removeEventListener("resize", updateKeyboardOffset);
      visualViewport.removeEventListener("scroll", updateKeyboardOffset);
      setKeyboardOffset(0);
    };
  }, [itemFlowStep]);

  if (itemFlowStep !== null) {
    return (
      <main className="item-flow-screen" aria-label="구매품 추가">
        <header className="item-flow-header">
          <button
            type="button"
            aria-label="뒤로가기"
            className="item-flow-back-button"
            onClick={() =>
              itemFlowStep === "details" ? setItemFlowStep("price") : closeItemFlow()
            }
          >
            <img
              className="item-flow-back-icon"
              src="https://c.animaapp.com/TR7Q5H5X/img/--icon-variant---4.svg"
              alt=""
              aria-hidden="true"
            />
          </button>
          <h1 className="item-flow-header-title">
            {editingItem ? "편집하기" : "구매품 추가"}
          </h1>
          <span className="item-flow-header-spacer" aria-hidden="true" />
        </header>

        {itemFlowStep === "price" ? (
          <>
            <section className="item-flow-content">
              <div className="item-flow-date-field-group">
                <div className="item-flow-select-block">
                  <label className="item-flow-section-title">
                    언제 사셨나요?
                  </label>
                  <button
                    type="button"
                    className="item-flow-select-field"
                    onClick={() => setIsItemDatePickerOpen(true)}
                  >
                    <span className="item-flow-select-value">{itemDate}</span>
                    <svg
                      aria-hidden="true"
                      className="item-flow-select-chevron"
                      fill="none"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke="#27272A"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  className="item-flow-select-field"
                  onClick={openItemTimePicker}
                >
                  <span className="item-flow-select-value">{itemTime}</span>
                  <svg
                    aria-hidden="true"
                    className="item-flow-select-chevron"
                    fill="none"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="#27272A"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
              </div>
              <section className="item-flow-field-group">
                <label className="item-flow-section-title" htmlFor="item-price">
                  얼마에 구매하셨나요?
                </label>
                <div className="item-flow-price-field">
                  <span className="item-flow-price-currency">₩</span>
                  <input
                    id="item-price"
                    aria-label="구매 금액"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formatPriceInput(itemPrice)}
                    onChange={(event) => handleItemPriceChange(event.target.value)}
                    placeholder="0"
                  />
                  {itemPrice && (
                    <button
                      type="button"
                      aria-label="금액 지우기"
                      className="item-flow-clear-button"
                      onClick={() => setItemPrice("")}
                    >
                      <img
                        className="item-flow-clear-icon"
                        src="https://c.animaapp.com/TR7Q5H5X/img/--icon-variant---3.svg"
                        alt=""
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              </section>
            </section>
            <div
              className="item-flow-action-area item-flow-action-single item-flow-price-action-area"
              style={
                {
                  "--item-flow-keyboard-offset": `${keyboardOffset}px`,
                } as CSSProperties
              }
            >
              <button
                type="button"
                className="item-flow-primary-button item-flow-next-button"
                disabled={!isPriceReady}
                onClick={handlePriceNext}
              >
                다음
              </button>
              <div className="item-flow-safe-area" aria-hidden="true" />
            </div>
            <div className="item-flow-mobile-keyboard" aria-label="숫자 키패드">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"].map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleItemPriceChange(`${itemPrice}${key}`)}
                  >
                    {key}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="한 글자 지우기"
                onClick={() => setItemPrice((currentPrice) => currentPrice.slice(0, -1))}
              >
                ⌫
              </button>
            </div>
            <div className="item-flow-mobile-keyboard-safe" aria-hidden="true" />
          </>
        ) : (
          <>
            <section className="item-flow-content item-flow-details-content">
              <section className="item-flow-section">
                <h2 className="item-flow-section-title">무엇을 구매하셨어요?</h2>
                <div className="item-category-grid" role="radiogroup">
                  {itemCategoryRows.flat().map((category) => {
                    const selected = itemCategory === category.id;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`item-category-card ${
                          selected ? "item-category-card-selected" : ""
                        }`}
                        onClick={() => {
                          setItemCategory(category.id);
                          trackEvent(analyticsEvents.ITEM_CATEGORY_SELECTED, {
                            ...getCommonAnalyticsProperties(),
                            category: category.id,
                            selected_date: itemDate,
                          });
                        }}
                      >
                        <img
                          className="item-category-icon"
                          src={category.iconSrc}
                          alt=""
                          aria-hidden="true"
                        />
                        <span>{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="item-flow-section">
                <h2 className="item-flow-section-title">왜 구매하셨어요?</h2>
                <div className="item-reason-chips" role="radiogroup">
                  {itemReasons.map((reason) => {
                    const selected = itemReason === reason.id;

                    return (
                      <button
                        key={reason.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`item-reason-chip ${
                          selected ? "item-reason-chip-selected" : ""
                        }`}
                        onClick={() => {
                          setItemReason(reason.id);
                          trackEvent(analyticsEvents.ITEM_REASON_SELECTED, {
                            ...getCommonAnalyticsProperties(),
                            reason_key: reason.id,
                            selected_date: itemDate,
                          });
                        }}
                      >
                        {reason.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            </section>
            <div className="item-flow-action-area">
              <div className="item-flow-action-row">
                <button
                  type="button"
                  className="item-flow-secondary-button"
                  onClick={() => setItemFlowStep("price")}
                >
                  이전
                </button>
                <button
                  type="button"
                  className="item-flow-primary-button"
                  disabled={!itemCategory || !itemReason || isItemFlowSaving}
                  onClick={saveItemFlow}
                >
                  {isItemFlowSaving
                    ? "준비 중"
                    : editingItem
                      ? "저장하기"
                      : "추가하기"}
                </button>
              </div>
              <div className="item-flow-safe-area" aria-hidden="true" />
            </div>
          </>
        )}

        {isItemDatePickerOpen && (
          <DatePickerBottomSheet
            dates={cartDates}
            recordedDates={recordedDates}
            selectedIndex={itemDateIndex}
            onSelectDate={(dateKey) => {
              if (dateKey > getKoreaToday()) return false;

              if (dateKey !== itemDate) {
                resetItemImagePreparation();
              }
              setItemDate(dateKey);
              setIsItemDatePickerOpen(false);
              return true;
            }}
            onClose={() => setIsItemDatePickerOpen(false)}
          />
        )}
        {isItemTimePickerOpen && (
          <section
            className="item-time-picker-overlay"
            aria-label="시간 선택"
            role="dialog"
            aria-modal="true"
            onClick={closeItemTimePicker}
          >
            <div className="item-time-picker-backdrop" aria-hidden="true" />
            <div
              className="item-time-picker-sheet"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="item-time-picker-handlebar" aria-hidden="true" />
              <h2 className="item-time-picker-title">시간 선택</h2>
              <div className="item-time-picker-columns">
                <div
                  className="item-time-picker-column"
                  role="listbox"
                  aria-label="오전 오후"
                >
                  {itemTimePeriods.map((period) => {
                    const selected = draftItemTimePeriod === period;

                    return (
                      <button
                        key={period}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`item-time-picker-option ${
                          selected ? "item-time-picker-option-selected" : ""
                        }`}
                        onClick={() => setDraftItemTimePeriod(period)}
                      >
                        {period}
                      </button>
                    );
                  })}
                </div>
                <div className="item-time-picker-column" role="listbox" aria-label="시간">
                  {itemTimeHours.map((hour) => {
                    const selected = draftItemTimeHour === hour;

                    return (
                      <button
                        key={hour}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`item-time-picker-option ${
                          selected ? "item-time-picker-option-selected" : ""
                        }`}
                        onClick={() => setDraftItemTimeHour(hour)}
                      >
                        {hour}
                      </button>
                    );
                  })}
                </div>
                <div className="item-time-picker-column" role="listbox" aria-label="분">
                  {itemTimeMinutes.map((minute) => {
                    const selected = draftItemTimeMinute === minute;

                    return (
                      <button
                        key={minute}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`item-time-picker-option ${
                          selected ? "item-time-picker-option-selected" : ""
                        }`}
                        onClick={() => setDraftItemTimeMinute(minute)}
                      >
                        {minute}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="item-time-picker-actions">
                <button
                  type="button"
                  className="item-time-picker-cancel"
                  onClick={closeItemTimePicker}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="item-time-picker-confirm"
                  onClick={confirmItemTimePicker}
                >
                  완료
                </button>
              </div>
            </div>
          </section>
        )}
        {isPhotoPreparingToastVisible && (
          <div
            className="login-required-toast photo-preparing-toast"
            role="status"
            aria-live="polite"
          >
            <img
              alt=""
              aria-hidden="true"
              className="login-required-toast-icon"
              src="/icons/icon-sparkle.svg"
            />
            <span>{`사진을 준비 중이에요${".".repeat(photoPreparingDotCount)}`}</span>
          </div>
        )}
      </main>
    );
  }

  return (
    <main
      className="flex flex-col min-h-screen items-start relative bg-white"
      data-model-id="2352:157735"
    >
      <header className="flex items-center justify-around gap-[104px] px-5 py-2 fixed top-0 left-0 z-[10] w-full bg-white">
        <div className="flex items-center justify-between relative flex-1 grow">
          <div className="inline-flex items-center gap-3 relative flex-[0_0_auto]">
            <button
              type="button"
              aria-label="날짜 선택"
              className="inline-flex items-center gap-1 px-0 py-0.5 relative flex-[0_0_auto]"
              data-typography-semantic-mode="english"
              onClick={() =>
                isLoggedOutStart ? showLoginToast() : setIsDatePickerOpen(true)
              }
            >
              <time
                dateTime={cartDates[selectedIndex].replaceAll(".", "-")}
                className="relative w-fit mt-[-1.00px] font-title-small font-[number:var(--title-small-font-weight)] text-zinc-800 text-[length:var(--title-small-font-size)] tracking-[var(--title-small-letter-spacing)] leading-[var(--title-small-line-height)] whitespace-nowrap [font-style:var(--title-small-font-style)]"
              >
                {cartDates[selectedIndex]}
              </time>
              <div className="inline-flex items-center gap-2.5 relative self-stretch flex-[0_0_auto]">
                <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                  <img
                    className="relative h-4"
                    alt="Icon variant"
                    src="https://c.animaapp.com/RVtpFFFT/img/--icon-variant---6.svg"
                  />
                </div>
              </div>
            </button>
          </div>
          <div className="inline-flex items-center gap-2 relative self-stretch flex-[0_0_auto]">
            {!isTodaySelected && (
              <button
                type="button"
                className="today-return-chip"
                onClick={() => selectDate(todayDateKey)}
              >
                <span className="today-return-chip-background" aria-hidden="true" />
                <span className="today-return-chip-content">
                  <span className="today-return-chip-text">오늘</span>
                </span>
              </button>
            )}
            <Link
              aria-label="장바구니 색상 변경"
              className="inline-flex items-center gap-5 relative self-stretch flex-[0_0_auto]"
              to={`/home-edit-color?selectedIndex=${selectedIndex}&selectedDate=${cartDates[selectedIndex]}&railOffset=${Math.round(railOffset * 100) / 100}`}
              state={{
                railOffset,
                selectedDate: cartDates[selectedIndex],
                selectedIndex,
              }}
              onClick={(event) => {
                if (!isLoggedOutStart) return;

                event.preventDefault();
                showLoginToast();
              }}
            >
              <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                  <ColorMenuButton
                    color={dateCarts[selectedIndex]?.accentBgColor ?? "#FFE771"}
                  />
                </div>
                <div className="absolute w-[calc(100%_+_16px)] h-[calc(100%_+_16px)] -top-2 -left-2 rounded-full" />
              </div>
            </Link>
          </div>
        </div>
      </header>
      <section
        className="flex flex-col items-start relative flex-1 self-stretch w-full grow pt-20 pb-[112px]"
        aria-label="장바구니 화면"
      >
        <div className="segment-control-scrim flex flex-col items-center justify-center px-5 py-2 fixed top-10 left-0 z-[10] w-full">
          <div
            className="flex w-full h-full items-center gap-2.5 absolute top-0 left-0 pointer-events-none"
            aria-hidden="true"
          >
            <img
              className="relative flex-1 self-stretch grow"
              alt="Gradient solid"
              src="https://c.animaapp.com/RVtpFFFT/img/gradient-solid.svg"
            />
          </div>
          <div className="inline-flex items-center p-1 relative flex-[0_0_auto] bg-[#71717a14] rounded-full backdrop-blur backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(8px)_brightness(100%)]">
            <div
              className="inline-flex items-center gap-1 relative flex-[0_0_auto]"
              role="tablist"
              aria-label="보기 전환"
              onPointerDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeView;

                return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onPointerDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    switchView(tab.id as "cart" | "receipt");
                  }}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 relative flex-[0_0_auto] rounded-full ${
                    isActive ? "bg-white tab-active-shadow" : ""
                  }`}
                >
                  <div
                    className={`relative w-fit mt-[-1.00px] font-label-small font-[number:var(--label-small-font-weight)] text-[length:var(--label-small-font-size)] tracking-[var(--label-small-letter-spacing)] leading-[var(--label-small-line-height)] whitespace-nowrap [font-style:var(--label-small-font-style)] ${
                      isActive ? "text-zinc-800" : "text-[#11111170]"
                    }`}
                  >
                    {tab.label}
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="home-view-stage">
          {(activeView === "cart" ||
            transitionPhase === "cart-to-receipt" ||
            transitionPhase === "receipt-to-cart") && (
            <div
              className={`flex items-start justify-center pt-9 pb-0 px-5 self-stretch w-full relative flex-[0_0_auto] ${
                transitionPhase === "cart-to-receipt"
                  ? "cart-main-exit"
                  : transitionPhase === "receipt-to-cart"
                    ? isCartReturnReady
                      ? "cart-main-enter"
                      : "cart-main-prep"
                    : ""
              }`}
              {...dragHandleProps}
            >
              <div
                ref={transitionPhase === "cart-to-receipt" ? undefined : railRef}
                className="w-[375px] justify-end px-7 py-0 ml-[-20.00px] mr-[-20.00px] flex items-center gap-3 min-[541px]:gap-10 min-[1190px]:gap-20 relative"
                style={
                  isLoggedOutStart
                    ? { transform: "none", transition: "none" }
                    : cartRailStyle
                }
              >
                {(isLoggedOutStart
                  ? [dateCarts[selectedIndex]]
                  : dateCarts
                ).map((cart, renderedIndex) => (
                  (() => {
                    const index = isLoggedOutStart ? selectedIndex : renderedIndex;
                    const { totalAmount } = isLoggedOutStart
                      ? { totalAmount: 0 }
                      : getDisplayCartSummary(cart.id, cart.dateKey);
                    const displayItems = getDisplayCartItems(cart.id, cart.dateKey);

                    return (
                      <article
                        key={cart.id}
                        ref={
                          transitionPhase === "cart-to-receipt"
                            ? undefined
                            : setItemRef(index)
                        }
                        className={cart.wrapperClassName}
                      >
                        <div className="flex w-[172px] items-center pt-3 pb-5 px-5 relative flex-[0_0_auto] shadow-shadow-200">
                          <div
                            className={`w-full absolute h-full top-0 left-0 ${cart.cardBgClassName}`}
                          />
                          <div className="flex flex-col items-start gap-2 pt-0 pb-2 px-0 relative flex-1 grow">
                            <div
                              className="flex items-center justify-center relative self-stretch w-full flex-[0_0_auto]"
                              data-typography-semantic-mode="english"
                            >
                              <p className="relative flex-1 h-2.5 mt-[-1.00px] font-caption-medium font-[number:var(--caption-medium-font-weight)] text-zinc-800 text-[length:var(--caption-medium-font-size)] tracking-[var(--caption-medium-letter-spacing)] leading-[var(--caption-medium-line-height)] whitespace-nowrap [font-style:var(--caption-medium-font-style)]">
                                * * * * * * * * * * * * * * *
                              </p>
                            </div>
                            <div className="flex items-end justify-between relative self-stretch w-full flex-[0_0_auto]">
                              <div className="inline-flex items-center justify-center px-0 py-0.5 relative flex-[0_0_auto]">
                                <div
                                  className="relative w-fit mt-[-1.00px] font-caption-small font-[number:var(--caption-small-font-weight)] text-zinc-800 text-[length:var(--caption-small-font-size)] tracking-[var(--caption-small-letter-spacing)] leading-[var(--caption-small-line-height)] whitespace-nowrap [font-style:var(--caption-small-font-style)]"
                                  data-typography-semantic-mode="english"
                                >
                                  TOTAL
                                </div>
                              </div>
                              <div
                                className="inline-flex items-center gap-1 relative flex-[0_0_auto]"
                                data-typography-semantic-mode="english"
                              >
                                <div className="relative w-fit mt-[-1.00px] font-headline font-[number:var(--headline-font-weight)] text-zinc-800 text-[length:var(--headline-font-size)] tracking-[var(--headline-letter-spacing)] leading-[var(--headline-line-height)] whitespace-nowrap [font-style:var(--headline-font-style)]">
                                  ₩
                                </div>
                                <div className="relative w-fit mt-[-1.00px] font-headline font-[number:var(--headline-font-weight)] text-zinc-800 text-[length:var(--headline-font-size)] tracking-[var(--headline-letter-spacing)] leading-[var(--headline-line-height)] whitespace-nowrap [font-style:var(--headline-font-style)]">
                                  {formatWonAmount(totalAmount)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="h-[410px] -mt-7 relative w-[316px] aspect-[0.77]">
                          <img
                            className="relative h-full w-full object-cover"
                            alt={cart.imageAlt}
                            loading="lazy"
                            src={cart.imageSrc}
                          />
                          {isLoggedOutStart ? (
                            <div className="login-start-actions">
                              <button
                                type="button"
                                className="login-google-button"
                                onPointerDown={(event) => event.stopPropagation()}
                              onClick={startGoogleLogin}
                            >
                              <img
                                alt=""
                                aria-hidden="true"
                                className="login-google-icon"
                                  src="/color-icons/icon-color-google.svg"
                                />
                                <span>구글 계정으로 로그인</span>
                              </button>
                            </div>
                          ) : visibleIndexes.includes(index) && (
                            <CartSlotItems
                              key={`${cart.id}-${cartDataVersion}`}
                              cartId={cart.id}
                              itemsOverride={displayItems}
                              isLoading={!isCartDataResolved(cart.dateKey)}
                              isNoSpend={effectiveNoSpendCartIds.has(cart.id)}
                              onAddItems={() => openAddSheet(index)}
                              onMarkNoSpend={() => markNoSpend(index)}
                              onOpenItemDetails={openItemDetails}
                            />
                          )}
                        </div>
                      </article>
                    );
                  })()
                ))}
              </div>
            </div>
          )}
          {(activeView === "receipt" || transitionPhase === "receipt-to-cart") && (
            <ReceiptRail
              carts={dateCarts}
              dragHandleProps={dragHandleProps}
              itemsByCartId={dbItemsByCartId}
              loadingCartIds={loadingCartIds}
              noSpendCartIds={effectiveNoSpendCartIds}
              onAddItems={openAddSheetFromReceipt}
              onMarkNoSpend={markNoSpend}
              onOpenItemDetails={openItemDetails}
              phase={
                transitionPhase === "receipt-to-cart"
                  ? "exit"
                  : transitionPhase === "cart-to-receipt"
                    ? "enter"
                    : transitionPhase === "receipt-prep"
                      ? "prep"
                    : "idle"
              }
              railRef={
                transitionPhase === "receipt-to-cart" ? undefined : railRef
              }
              railStyle={receiptRailStyle}
              setItemRef={
                transitionPhase === "receipt-to-cart"
                  ? (_index: number) => (_node: HTMLElement | null) => {}
                  : setItemRef
              }
            />
          )}
        </div>
        <div className="home-page-footer-spacer" aria-hidden="true" />
        <div className="home-page-footer" aria-label="서비스 정보">
          <div className="home-page-footer-content">
            <div className="home-page-footer-info">
              <div className="home-page-footer-row">
	                <button
	                  type="button"
	                  className="home-page-footer-link"
	                  onClick={() => openLegalDocument("/privacy", "footer")}
	                >
	                  개인정보 처리방침
                </button>
                <span className="home-page-footer-divider" aria-hidden="true">
                  <span />
                </span>
	                <button
	                  type="button"
	                  className="home-page-footer-link"
	                  onClick={() => openLegalDocument("/terms", "footer")}
	                >
	                  이용약관
                </button>
              </div>
              <div className="home-page-footer-row">
                <span className="home-page-footer-link">이메일</span>
                <span className="home-page-footer-divider" aria-hidden="true">
                  <span />
                </span>
                <span className="home-page-footer-link">
                  abcdef@google.com
                </span>
              </div>
            </div>
            {!isLoggedOutStart && (
              <button
                type="button"
                className="home-page-footer-logout"
                onClick={logoutToStart}
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      </section>
      <footer className="flex flex-col items-start fixed bottom-0 left-0 z-[10] w-full">
        <div className="flex-col items-start self-stretch w-full flex-[0_0_auto] flex px-5 pt-0 relative bottom-navigation-safe-area">
          <div className="justify-center self-stretch w-full flex-[0_0_auto] flex items-center gap-3 relative">
            <nav
              className="items-end justify-center flex-1 grow rounded-full border border-solid flex px-5 py-0 relative bottom-glass-nav"
              aria-label="하단 내비게이션"
            >
              <div className="w-full rounded-full absolute h-full top-0 left-0 bottom-glass-fill" />
	              {navItems.map((item) => (
	                <button
	                  key={item.id}
	                  type="button"
	                  aria-current={item.active ? "page" : undefined}
	                  aria-disabled={item.disabled ? true : undefined}
	                  className={`flex flex-col items-center justify-center px-0 py-2 relative flex-1 grow ${
	                    item.disabled ? "bottom-nav-item-disabled" : ""
	                  }`}
	                  onClick={
	                    item.disabled
	                      ? () => showNavigationPendingToast(item.id)
	                      : isLoggedOutStart
	                        ? showLoginToast
	                        : undefined
	                  }
	                >
	                  <div className="flex flex-col w-[52px] items-center justify-center gap-0.5 relative flex-[0_0_auto]">
	                    <img
	                      className={`relative h-6 ${
	                        item.disabled ? "bottom-nav-icon-disabled" : ""
	                      }`}
	                      alt={item.iconAlt}
	                      src={item.iconSrc}
	                    />
                    <div className="flex flex-col items-center justify-center pt-0 pb-0.5 px-0 relative self-stretch w-full flex-[0_0_auto]">
	                      <div
	                        className={`relative w-fit mt-[-1.00px] font-caption-small font-[number:var(--caption-small-font-weight)] text-[length:var(--caption-small-font-size)] text-center tracking-[var(--caption-small-letter-spacing)] leading-[var(--caption-small-line-height)] whitespace-nowrap [font-style:var(--caption-small-font-style)] ${
	                          item.active
	                            ? "text-zinc-800"
	                            : item.disabled
	                              ? "text-[#1111112b]"
	                              : "text-[#11111138]"
	                        }`}
	                      >
                        {item.label}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
            <div className="w-[calc(100%_-_64px)] rounded-full border border-solid absolute h-full top-0 left-0 bottom-glass-outline" />
            <button
              type="button"
              className="self-stretch inline-flex items-center justify-center relative flex-[0_0_auto]"
              aria-label="새 항목 추가"
              onClick={() => openAddSheet(selectedIndex)}
            >
              <div className="p-4 bg-[#111111] rounded-full inline-flex items-center justify-center relative flex-[0_0_auto] bottom-plus-shadow">
                <div className="inline-flex items-center relative flex-[0_0_auto]">
                  <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                    <svg
                      aria-hidden="true"
                      className="relative h-5 w-5"
                      fill="none"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 4V16M4 10H16"
                        stroke="#FFFFFF"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center relative self-stretch w-full flex-[0_0_auto]">
          <div className="flex flex-col items-center justify-center relative self-stretch w-full flex-[0_0_auto]" />
        </div>
      </footer>
      {detailOverlay &&
        (() => {
          const detailCart = dateCarts.find(
            (cart) => cart.id === detailOverlay.cartId,
          );
          const detailItems = getDetailItems(detailOverlay.cartId);
          const currentIndex = Math.max(
            detailItems.findIndex((item) => item.id === detailOverlay.itemId),
            0,
          );

          if (!detailCart || detailItems.length === 0) return null;

          return (
            <section
              className={`item-detail-overlay ${
                detailOverlay.isClosing ? "item-detail-overlay-closing" : ""
              }`}
              aria-label="구매품 상세"
              onClick={closeItemDetails}
            >
              <div className="item-detail-summary" aria-hidden="true">
                <time
                  className="item-detail-date"
                  dateTime={detailCart.dateKey.replaceAll(".", "-")}
                >
                  {detailCart.dateKey}
                </time>
                <p className="item-detail-count">
                  구매 품목 {detailItems.length}개
                </p>
              </div>
              <div
                className="item-detail-carousel"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => {
                  detailSwipeRef.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                  };
                }}
                onPointerUp={(event) => {
                  if (!detailSwipeRef.current) return;

                  const deltaX = event.clientX - detailSwipeRef.current.startX;
                  const deltaY = event.clientY - detailSwipeRef.current.startY;
                  detailSwipeRef.current = null;

                  if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) {
                    return;
                  }

                  changeDetailItem(deltaX < 0 ? 1 : -1);
                }}
                onPointerCancel={() => {
                  detailSwipeRef.current = null;
                }}
              >
                <div
                  className="item-detail-card-rail"
                  style={
                    {
                      "--item-detail-index": currentIndex,
                    } as CSSProperties
                  }
                >
                  {detailItems.map((item, index) => {
                    const detailKey = getItemDetailKey(detailOverlay.cartId, item.id);
                    const metadata = getItemMetadata(detailOverlay.cartId, item.id);
                    const isActiveCard = index === currentIndex;

                    return (
                      <article
                        key={item.id}
                        className={`item-detail-card ${
                          isActiveCard ? "item-detail-card-active" : ""
                        }`}
                        aria-label={`${getCategoryLabel(metadata.categoryId)} 상세`}
                      >
                        <div
                          className="item-detail-picture"
                          style={{ background: getDetailGradient(detailKey) }}
                        >
                          <img
                            className="item-detail-image"
                            alt="구매 상품"
                            draggable={false}
                            src={item.imageSrc}
                          />
                        </div>
                        <div className="item-detail-body">
                          <header className="item-detail-body-header">
                            <div className="item-detail-copy">
                              <h2 className="item-detail-category">
                                {getCategoryLabel(metadata.categoryId)}
                              </h2>
                              <div className="item-detail-meta">
                                <time dateTime={metadata.time}>{metadata.time}</time>
                                <span aria-hidden="true">·</span>
                                <span>#{getReasonLabel(metadata.reasonId)}</span>
                              </div>
                            </div>
                            <div className="item-detail-price">
                              {formatWonAmount(item.amount)}
                            </div>
                          </header>
                          <div className="item-detail-actions">
                            {itemDetailActions.map((action) => (
                              <button
                                key={action.id}
                                type="button"
                                aria-label={action.label}
                                className="item-detail-action-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (action.id === "delete") {
                                    deleteCurrentDetailItem();
                                    return;
                                  }

                                  openEditItemFlow();
                                }}
                              >
                                <span
                                  className="item-detail-action-background"
                                  aria-hidden="true"
                                />
                                <img
                                  className="item-detail-action-icon"
                                  src={action.iconSrc}
                                  alt=""
                                  aria-hidden="true"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })()}
      {isDatePickerOpen && (
        <DatePickerBottomSheet
          dates={cartDates}
          recordedDates={recordedDates}
          selectedIndex={selectedIndex}
          onSelectDate={selectDate}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}
      {isAddSheetOpen && (
        <section
          className="h-full items-end fixed top-0 left-0 flex w-full z-[20]"
          aria-label="사진 업로드 옵션"
          onClick={closeAddSheet}
        >
          <div
            className={`w-full bg-zinc-800 opacity-35 absolute h-full top-0 left-0 ${
              isClosingAddSheet ? "sheet-backdrop-out" : "sheet-backdrop-in"
            }`}
          />
          <div
            className={`flex flex-col items-start relative flex-1 grow bg-white rounded-[16px_16px_0px_0px] shadow-shadow-200 ${
              isClosingAddSheet ? "bottom-sheet-out" : "bottom-sheet-in"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col items-center px-5 py-2 relative self-stretch w-full flex-[0_0_auto] rounded-[16px_16px_0px_0px] overflow-hidden">
              <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
                <div className="relative w-8 h-1.5 bg-[#1111111f] rounded-full" />
              </div>
            </div>
            <div className="flex items-start gap-3 px-5 pt-4 pb-8 self-stretch w-full relative flex-[0_0_auto]">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                onChange={handleAddImageSelection}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={handleAddImageSelection}
              />
              {actionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex flex-col items-center justify-center gap-2 px-0 py-0 relative flex-1 h-[150px] rounded-[16px] border border-solid border-[#1111111a] bg-[#f7f7f8]"
                  onClick={() => openFilePickerForAction(item.id)}
                >
                  <div className="inline-flex items-center justify-center relative flex-[0_0_auto]">
                    <img
                      className="relative h-8 w-8"
                      alt=""
                      aria-hidden="true"
                      src={item.iconSrc}
                    />
                  </div>
                  <div className="relative w-fit font-label-large font-[number:var(--label-large-font-weight)] text-zinc-800 text-[length:var(--label-large-font-size)] text-center tracking-[var(--label-large-letter-spacing)] leading-[var(--label-large-line-height)] whitespace-nowrap [font-style:var(--label-large-font-style)]">
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center relative self-stretch w-full flex-[0_0_auto]">
              <div className="flex flex-col items-center justify-center relative self-stretch w-full flex-[0_0_auto]" />
            </div>
          </div>
        </section>
      )}
      {isTermsSheetOpen && (
        <section
          className="terms-sheet-overlay"
          aria-label="약관 동의"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <div className="terms-sheet-backdrop" aria-hidden="true" />
          <div
            className="terms-sheet-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="terms-sheet-handlebar">
              <div className="terms-sheet-handlebar-mark" />
            </div>
            <div className="terms-sheet-container">
              <div className="terms-sheet-content-slot">
                <h2 className="terms-sheet-title">
                  가입을 위해
                  <br />
                  약관 동의가 필요해요.
                </h2>
                <div className="terms-sheet-body">
                  <div className="terms-agreement-list">
                    {requiredAgreementItems.map((item) => (
                      <div className="terms-agreement-row" key={item.id}>
                        <button
                          type="button"
                          className="terms-agreement-main"
                          onClick={() => toggleRequiredAgreement(item.id)}
                        >
                          {renderAgreementCheckIcon(requiredAgreements[item.id])}
                          <span className="terms-agreement-label">
                            {item.label}
                          </span>
                        </button>
                        {item.hasViewButton && (
                          <button
                            type="button"
                            className="terms-view-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (item.id === "privacy") {
                                openLegalDocument("/privacy", "terms_sheet");
                              }
                              if (item.id === "terms") {
                                openLegalDocument("/terms", "terms_sheet");
                              }
                            }}
                          >
                            보기
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="terms-sheet-divider" />
                  <div className="terms-agreement-list">
                    <div className="terms-agreement-row">
                      <button
                        type="button"
                        className="terms-agreement-main"
                        onClick={() =>
                          setAllRequiredAgreements(!isAllRequiredAgreed)
                        }
                      >
                        {renderAgreementCheckIcon(isAllRequiredAgreed)}
                        <span className="terms-agreement-label">
                          모두 동의하기
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="terms-action-area">
              <div className="terms-action-container">
                <button
                  type="button"
                  className="terms-start-button"
                  disabled={!isAllRequiredAgreed}
                  aria-disabled={!isAllRequiredAgreed}
                  onClick={startHome}
                >
                  시작하기
                </button>
              </div>
              <div className="terms-safe-area" aria-hidden="true" />
            </div>
          </div>
        </section>
      )}
      {isLoginToastVisible && (
        <div className="login-required-toast" role="status" aria-live="polite">
          <img
            alt=""
            aria-hidden="true"
            className="login-required-toast-icon"
            src="/icons/icon-sparkle.svg"
          />
          <span>이 기능을 사용하려면 로그인이 필요해요.</span>
        </div>
      )}
      {actionFailureToastMessage && (
        <div className="login-required-toast" role="status" aria-live="polite">
          <img
            alt=""
            aria-hidden="true"
            className="login-required-toast-icon"
            src="/icons/icon-sparkle.svg"
          />
          <span>{actionFailureToastMessage}</span>
        </div>
      )}
      {isBackgroundFailureToastVisible && (
        <div className="login-required-toast" role="status" aria-live="polite">
          <img
            alt=""
            aria-hidden="true"
            className="login-required-toast-icon"
            src="/icons/icon-sparkle.svg"
          />
          <span>배경 제거에 실패했어요. 원본 이미지로 저장했어요.</span>
        </div>
      )}
    </main>
  );
};
