import mixpanel from "mixpanel-browser";

type AnalyticsPropertyValue =
  | boolean
  | null
  | number
  | string
  | undefined
  | string[];

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

export const analyticsEvents = {
  APP_OPENED: "app_opened",
  BACKGROUND_REMOVE_COMPLETED: "background_remove_completed",
  BACKGROUND_REMOVE_FAILED: "background_remove_failed",
  BACKGROUND_REMOVE_STARTED: "background_remove_started",
  BACKGROUND_REMOVE_WAIT_SHOWN: "background_remove_wait_shown",
  CART_VIEWED: "cart_viewed",
  CATEGORY_REQUIRED_SHOWN: "category_required_shown",
  COLOR_CHANGED: "color_changed",
  DATE_CHANGED: "date_changed",
  EMPTY_STATE_CTA_CLICKED: "empty_state_cta_clicked",
  ITEM_ADD_CANCELLED: "item_add_cancelled",
  ITEM_ADD_STARTED: "item_add_started",
  ITEM_ADD_SUBMIT_CLICKED: "item_add_submit_clicked",
  ITEM_CATEGORY_SELECTED: "item_category_selected",
  ITEM_CREATED: "item_created",
  ITEM_DELETED: "item_deleted",
  ITEM_DETAIL_OPENED: "item_detail_opened",
  ITEM_DETAILS_STEP_VIEWED: "item_details_step_viewed",
  ITEM_IMAGE_SELECTED: "item_image_selected",
  ITEM_IMAGE_SOURCE_SELECTED: "item_image_source_selected",
  ITEM_PRICE_ENTERED: "item_price_entered",
  ITEM_PRICE_NEXT_CLICKED: "item_price_next_clicked",
  ITEM_PRICE_STEP_VIEWED: "item_price_step_viewed",
  ITEM_REASON_SELECTED: "item_reason_selected",
  ITEM_TIME_CHANGED: "item_time_changed",
  ITEM_TIME_OPENED: "item_time_opened",
  ITEM_UPDATED: "item_updated",
  LOGIN_BUTTON_CLICKED: "login_button_clicked",
  LOGIN_COMPLETED: "login_completed",
  LOGIN_CTA_VIEWED: "login_cta_viewed",
  LOGOUT_CLICKED: "logout_clicked",
  NO_SPEND_DAY_CLICKED: "no_spend_day_clicked",
  NO_SPEND_DAY_CREATED: "no_spend_day_created",
  NOT_READY_NAV_CLICKED: "not_ready_nav_clicked",
  PAGE_VIEWED: "page_viewed",
  RECEIPT_VIEWED: "receipt_viewed",
  SHARE_DOWNLOAD_CLICKED: "share_download_clicked",
  SHARE_DOWNLOAD_COMPLETED: "share_download_completed",
  SHARE_FAILED: "share_failed",
  SHARE_INSTAGRAM_CLICKED: "share_instagram_clicked",
  SHARE_SHEET_OPENED: "share_sheet_opened",
  TERMS_AGREED: "terms_agreed",
  TERMS_LINK_CLICKED: "terms_link_clicked",
  TERMS_SHEET_VIEWED: "terms_sheet_viewed",
  WITHDRAW_COMPLETED: "withdraw_completed",
  WITHDRAW_FAILED: "withdraw_failed",
  WITHDRAW_FINAL_CLICKED: "withdraw_final_clicked",
  WITHDRAW_STARTED: "withdraw_started",
  WITHDRAW_WARNING_CONFIRMED: "withdraw_warning_confirmed",
} as const;

export type AnalyticsEventName =
  (typeof analyticsEvents)[keyof typeof analyticsEvents];

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const isBrowser = typeof window !== "undefined";
let isInitialized = false;

const initializeMixpanel = () => {
  if (isInitialized || !isBrowser || !MIXPANEL_TOKEN) return;

  try {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: import.meta.env.DEV,
      ignore_dnt: false,
      persistence: "localStorage",
      track_pageview: false,
    });
    isInitialized = true;
  } catch (error) {
    console.warn("Mixpanel initialization failed.", error);
  }
};

const cleanProperties = (properties: AnalyticsProperties = {}) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );

export const trackEvent = (
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties = {},
) => {
  initializeMixpanel();
  if (!isInitialized) return;

  try {
    mixpanel.track(eventName, cleanProperties(properties));
  } catch (error) {
    console.warn("Mixpanel track failed.", error);
  }
};

export const identifyUser = (
  userId: string,
  properties: AnalyticsProperties = {},
) => {
  initializeMixpanel();
  if (!isInitialized) return;

  try {
    mixpanel.identify(userId);
    if (Object.keys(properties).length > 0) {
      mixpanel.people.set(cleanProperties(properties));
    }
  } catch (error) {
    console.warn("Mixpanel identify failed.", error);
  }
};

export const resetAnalytics = () => {
  initializeMixpanel();
  if (!isInitialized) return;

  try {
    mixpanel.reset();
  } catch (error) {
    console.warn("Mixpanel reset failed.", error);
  }
};

export const flushAnalytics = async () => {
  initializeMixpanel();
  if (!isInitialized) return;

  const maybeFlush = (mixpanel as unknown as { flush?: () => void | Promise<void> })
    .flush;
  if (typeof maybeFlush !== "function") return;

  try {
    await maybeFlush.call(mixpanel);
  } catch (error) {
    console.warn("Mixpanel flush failed.", error);
  }
};

export const getPriceRange = (amount: number | string) => {
  const numericAmount =
    typeof amount === "number" ? amount : Number(amount.replace(/[^\d]/g, ""));

  if (!numericAmount) return "0";
  if (numericAmount <= 1999) return "1_999";
  if (numericAmount <= 2999) return "2_999";
  if (numericAmount <= 4999) return "3_4999";
  if (numericAmount <= 9999) return "5_9999";
  if (numericAmount <= 19999) return "10_19999";
  if (numericAmount <= 49999) return "20_49999";
  if (numericAmount <= 99999) return "50_99999";

  return "100000_plus";
};

export const getFileSizeBucket = (bytes: number) => {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes < 1) return "under_1mb";
  if (megabytes < 3) return "1_3mb";
  if (megabytes < 5) return "3_5mb";

  return "5mb_plus";
};
