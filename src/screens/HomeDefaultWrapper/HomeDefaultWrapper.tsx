import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CartSlotItems,
  formatWonAmount,
  getCartSlotSummary,
} from "../../components/CartSlotItems";
import { ColorMenuButton } from "../../components/ColorMenuButton";
import {
  getCartDates,
  getCartDatesWithLeadingHistory,
} from "../../dateSystem";
import { useCartSwipe } from "../../useCartSwipe";

const SHEET_ANIMATION_MS = 260;

const tabs = [
  { id: "cart", label: "장바구니", active: true },
  { id: "receipt", label: "영수증", active: false },
];

const baseCarts = [
  {
    id: "pink",
    cardBg: "#fff2f9",
    accentBgColor: "#FF7AB6",
    receiptColor: "#FFB4CB",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    imageWrapperClassName:
      "h-full left-[calc(50.00%_-_158px)] flex justify-center overflow-hidden relative w-[316px] aspect-[0.77]",
    imageClassName: "w-[316px] h-full object-cover",
    imageAlt: "Warm pink cart",
    imageSrc: "/cart/WarmPink.png?v=high",
    showItemSlot: false,
    itemSlotSrc: "",
    itemSlotClassName: "",
    useBackgroundImage: false,
  },
  {
    id: "green",
    cardBg: "#c8f3dc",
    accentBgColor: "#7EF092",
    receiptColor: "#9CEAC0",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    imageWrapperClassName:
      "absolute h-full top-0 left-[calc(50.00%_-_158px)] w-[316px] flex justify-center aspect-[0.77]",
    imageClassName: "w-[316px] h-full object-cover",
    imageAlt: "Green cart",
    imageSrc: "/cart/Green.png?v=high",
    showItemSlot: false,
    itemSlotSrc: "",
    itemSlotClassName: "",
    useBackgroundImage: false,
  },
  {
    id: "yellow",
    cardBg: "#fff6c8",
    accentBgColor: "#FFE771",
    receiptColor: "#FFE771",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    imageWrapperClassName:
      "absolute h-full top-0 left-[calc(50.00%_-_158px)] w-[316px] flex justify-center aspect-[0.77]",
    imageClassName: "w-[316px] h-full object-cover",
    imageAlt: "Yellow cart",
    imageSrc: "/cart/Yellow.png?v=high",
    showItemSlot: false,
    itemSlotSrc: "",
    itemSlotClassName: "",
    useBackgroundImage: false,
  },
];

const emptyCartPalette = [
  {
    cardBg: "#fde8e8",
    accentBgColor: "#FF4A42",
    receiptColor: "#FBC9C9",
    imageAlt: "Red empty cart",
    imageSrc: "/cart/Red.png?v=high",
  },
  {
    cardBg: "#fff2f9",
    accentBgColor: "#FF7AB6",
    receiptColor: "#FFB4CB",
    imageAlt: "Warm pink empty cart",
    imageSrc: "/cart/WarmPink.png?v=high",
  },
  {
    cardBg: "#eef2ff",
    accentBgColor: "#A276FF",
    receiptColor: "#CDB8FF",
    imageAlt: "Purple empty cart",
    imageSrc: "/cart/Purple.png?v=high",
  },
  {
    cardBg: "#f4f4f5",
    accentBgColor: "#E4E4E7",
    receiptColor: "#E4E4E7",
    imageAlt: "Grey empty cart",
    imageSrc: "/cart/Grey.png?v=high",
  },
  {
    cardBg: "#ccfbf1",
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

const createEmptyCart = (dateKey: string, paletteIndex?: number) => {
  const palette =
    emptyCartPalette[paletteIndex ?? getPaletteIndex(dateKey)];

  return {
    id: `empty-${dateKey.replaceAll(".", "-")}`,
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    imageWrapperClassName:
      "absolute h-full top-0 left-[calc(50.00%_-_158px)] w-[316px] flex justify-center aspect-[0.77]",
    imageClassName: "w-[316px] h-full object-cover",
    showItemSlot: false,
    itemSlotSrc: "",
    itemSlotClassName: "",
    useBackgroundImage: false,
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

  if (
    selectedDate &&
    !dateCarts.some((cart) => cart.dateKey === selectedDate)
  ) {
    dateCarts.push({ ...createEmptyCart(selectedDate), dateKey: selectedDate });
  }

  return dateCarts.sort((first, second) =>
    first.dateKey.localeCompare(second.dateKey),
  );
};

const navigationItems = [
  {
    id: "home",
    label: "홈",
    iconAlt: "Icon navigation home",
    iconSrc: "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-home-2.svg",
    active: true,
  },
  {
    id: "calendar",
    label: "캘린더",
    iconAlt: "Icon navigation",
    iconSrc:
      "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-calendar-2.svg",
    active: false,
  },
  {
    id: "friends",
    label: "친구",
    iconAlt: "Icon navigation",
    iconSrc: "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-social-2.svg",
    active: false,
  },
  {
    id: "my",
    label: "My",
    iconAlt: "Icon navigation my",
    iconSrc:
      "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-my-page-2.svg",
    active: false,
  },
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

const CartCard = ({
  cardBg,
  wrapperClassName,
  imageWrapperClassName,
  imageClassName,
  imageAlt,
  imageSrc,
  showItemSlot,
  itemSlotSrc,
  itemSlotClassName,
  useBackgroundImage,
  itemRef,
  showItems,
  totalAmount,
}: {
  accentBgColor: string;
  cardBg: string;
  wrapperClassName: string;
  imageWrapperClassName: string;
  imageClassName: string;
  imageAlt: string;
  imageSrc: string;
  showItemSlot: boolean;
  itemSlotSrc: string;
  itemSlotClassName: string;
  useBackgroundImage: boolean;
  itemRef: (node: HTMLElement | null) => void;
  showItems: boolean;
  totalAmount: number;
}): JSX.Element => {
  return (
    <div ref={itemRef} className={wrapperClassName}>
      <div className="flex w-[172px] items-center pt-3 pb-5 px-5 relative flex-[0_0_auto] shadow-shadow-200">
        <div
          className="w-full absolute h-full top-0 left-0"
          style={{ backgroundColor: cardBg }}
        />
        <div className="flex flex-col items-start gap-2 pt-0 pb-2 px-0 relative flex-1 grow">
            <div
              className="flex items-center justify-center relative self-stretch w-full flex-[0_0_auto]"
              data-typography-semantic-mode="english"
            >
              <p className="flex-1 h-2.5 font-caption-medium font-[number:var(--caption-medium-font-weight)] text-zinc-800 text-[length:var(--caption-medium-font-size)] leading-[var(--caption-medium-line-height)] relative mt-[-1.00px] tracking-[var(--caption-medium-letter-spacing)] whitespace-nowrap [font-style:var(--caption-medium-font-style)]">
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
                <div className="w-fit font-headline font-[number:var(--headline-font-weight)] text-zinc-800 text-[length:var(--headline-font-size)] leading-[var(--headline-line-height)] relative mt-[-1.00px] tracking-[var(--headline-letter-spacing)] whitespace-nowrap [font-style:var(--headline-font-style)]">
                  {formatWonAmount(totalAmount)}
                </div>
              </div>
            </div>
        </div>
      </div>
      {useBackgroundImage ? (
        <div className={imageWrapperClassName}>
          {showItemSlot && (
            <img
              className={itemSlotClassName}
              alt="Item slot"
              src={itemSlotSrc}
            />
          )}
        </div>
      ) : (
        <div className="h-[410px] -mt-7 relative w-[316px] aspect-[0.77]">
          <div className={imageWrapperClassName}>
            <img
              className={imageClassName}
              alt={imageAlt}
              loading="lazy"
              src={imageSrc}
              onLoad={() =>
                console.log("__ANIMA_DBG__ cart-image-loaded", {
                  imageAlt,
                  imageSrc,
                  imageClassName,
                })
              }
              onError={() =>
                console.log("__ANIMA_DBG__ cart-image-error", {
                  imageAlt,
                  imageSrc,
                })
              }
            />
          </div>
          {showItemSlot && (
            <img
              className={itemSlotClassName}
              alt="Item slot"
              src={itemSlotSrc}
            />
          )}
          {showItems && (
            <CartSlotItems
              cartId={
                imageAlt.toLowerCase().includes("green")
                  ? "green"
                  : imageAlt.toLowerCase().includes("yellow")
                    ? "yellow"
                    : "pink"
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

export const HomeDefaultWrapper = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isClosingSheet, setIsClosingSheet] = useState(false);
  const queryParams = new URLSearchParams(location.search);
  const querySelectedIndex = Number(queryParams.get("selectedIndex"));
  const querySelectedDate = queryParams.get("selectedDate");
  const queryRailOffset = Number(queryParams.get("railOffset"));
  const stateSelectedDate =
    typeof location.state?.selectedDate === "string"
      ? location.state.selectedDate
      : null;
  const requestedSelectedDate = stateSelectedDate ?? querySelectedDate;
  const [dateCarts] = useState(() =>
    createInitialDateCarts(requestedSelectedDate),
  );
  const cartDates = dateCarts.map((cart) => cart.dateKey);
  const stateSelectedIndex =
    typeof location.state?.selectedIndex === "number"
      ? location.state.selectedIndex
      : null;
  const legacyIndexOffset = requestedSelectedDate ? 0 : firstBaseDateIndex;
  const initialSelectedIndex =
    requestedSelectedDate && cartDates.includes(requestedSelectedDate)
      ? cartDates.indexOf(requestedSelectedDate)
      : stateSelectedIndex !== null
        ? Math.min(
            Math.max(stateSelectedIndex + legacyIndexOffset, 0),
            dateCarts.length - 1,
          )
        : Number.isFinite(querySelectedIndex)
          ? Math.min(
              Math.max(querySelectedIndex + legacyIndexOffset, 0),
              dateCarts.length - 1,
            )
          : dateCarts.length - 1;
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
    selectedIndex,
    setItemRef,
    visibleIndexes,
  } =
    useCartSwipe(dateCarts.length, initialSelectedIndex, initialRailOffset);

  const closeSheet = () => {
    if (isClosingSheet) return;

    setIsClosingSheet(true);
    window.setTimeout(() => {
      const stableRailOffset = Math.round(railOffset * 100) / 100;

      navigate(
        `/home-defaultu9501?selectedIndex=${selectedIndex}&selectedDate=${cartDates[selectedIndex]}&railOffset=${stableRailOffset}`,
        {
          state: {
            railOffset,
            selectedDate: cartDates[selectedIndex],
            selectedIndex,
          },
        },
      );
    }, SHEET_ANIMATION_MS);
  };

  return (
    <main
      className="flex flex-col min-h-screen items-start relative bg-white overflow-hidden"
      data-model-id="2352:180646"
    >
      <header className="flex items-center justify-around gap-[104px] px-5 py-2 fixed top-0 left-0 z-[10] w-full bg-white">
        <div className="flex items-center justify-between relative flex-1 grow">
          <div className="inline-flex items-center gap-3 relative flex-[0_0_auto]">
            <div
              className="inline-flex items-center gap-1 px-0 py-0.5 relative flex-[0_0_auto]"
              data-typography-semantic-mode="english"
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
                    alt="날짜 선택 열기"
                    src="https://c.animaapp.com/RVtpFFFT/img/--icon-variant---6.svg"
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="더보기"
            className="inline-flex items-center gap-5 relative self-stretch flex-[0_0_auto]"
          >
            <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
              <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                <ColorMenuButton
                  color={dateCarts[selectedIndex]?.accentBgColor ?? "#FFE771"}
                />
              </div>
              <div className="absolute w-[calc(100%_+_16px)] h-[calc(100%_+_16px)] -top-2 -left-2 rounded-full" />
            </div>
          </button>
        </div>
      </header>
      <section className="flex flex-col items-start relative flex-1 self-stretch w-full grow pt-20 pb-[112px]">
        <div className="flex flex-col items-center justify-center px-5 py-2 fixed top-10 left-0 z-[10] w-full bg-white">
          <div className="flex w-full h-full items-center gap-2.5 absolute top-0 left-0">
            <img
              className="relative flex-1 self-stretch grow"
              alt="Gradient solid"
              src="https://c.animaapp.com/RVtpFFFT/img/gradient-solid-2.svg"
            />
          </div>
          <div className="inline-flex items-center p-1 relative flex-[0_0_auto] bg-[#71717a14] rounded-full backdrop-blur backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(8px)_brightness(100%)]">
            <div
              className="inline-flex items-center gap-1 relative flex-[0_0_auto]"
              role="tablist"
              aria-label="보기 선택"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.active}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 relative flex-[0_0_auto] rounded-full ${
                    tab.active ? "bg-white tab-active-shadow" : ""
                  }`}
                >
                  <div
                    className={`w-fit font-label-small font-[number:var(--label-small-font-weight)] text-[length:var(--label-small-font-size)] leading-[var(--label-small-line-height)] relative mt-[-1.00px] tracking-[var(--label-small-letter-spacing)] whitespace-nowrap [font-style:var(--label-small-font-style)] ${
                      tab.active ? "text-zinc-800" : "text-[#11111170]"
                    }`}
                  >
                    {tab.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div
          className="flex items-start justify-center pt-9 pb-0 px-5 self-stretch w-full relative flex-[0_0_auto]"
          {...dragHandleProps}
        >
          <div
            ref={railRef}
            className="flex w-[375px] items-center justify-end gap-3 min-[541px]:gap-10 px-7 py-0 relative ml-[-20.00px] mr-[-20.00px]"
            style={railStyle}
          >
            {dateCarts.map((cart, index) => (
              (() => {
                const { totalAmount } = getCartSlotSummary(cart.id);

                return (
                  <CartCard
                    key={cart.id}
                    {...cart}
                    itemRef={setItemRef(index)}
                    showItems={visibleIndexes.includes(index)}
                    totalAmount={totalAmount}
                  />
                );
              })()
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end justify-end p-5 relative flex-1 self-stretch w-full grow" />
      </section>
      <nav
        className="flex-col items-start fixed bottom-0 left-0 flex w-full z-[1]"
        aria-label="하단 네비게이션"
      >
        <div className="flex-col items-start self-stretch w-full flex-[0_0_auto] flex px-5 pt-0 pb-8 relative">
          <div className="flex items-center justify-center gap-3 relative self-stretch w-full flex-[0_0_auto]">
            <div className="items-end justify-center flex-1 grow rounded-full border border-solid flex px-5 py-0 relative bottom-glass-nav">
              <div className="w-full rounded-full absolute h-full top-0 left-0 bottom-glass-fill" />
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={item.active ? "page" : undefined}
                  className="flex flex-col items-center justify-center px-0 py-2 relative flex-1 grow"
                >
                  <div className="flex flex-col w-[52px] items-center justify-center gap-0.5 relative flex-[0_0_auto]">
                    <img
                      className="relative h-6"
                      alt={item.iconAlt}
                      src={item.iconSrc}
                    />
                    <div className="flex flex-col items-center justify-center pt-0 pb-0.5 px-0 relative self-stretch w-full flex-[0_0_auto]">
                      <div
                        className={`relative w-fit mt-[-1.00px] font-caption-small font-[number:var(--caption-small-font-weight)] text-[length:var(--caption-small-font-size)] text-center tracking-[var(--caption-small-letter-spacing)] leading-[var(--caption-small-line-height)] whitespace-nowrap [font-style:var(--caption-small-font-style)] ${
                          item.active ? "text-zinc-800" : "text-[#11111138]"
                        }`}
                      >
                        {item.label}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="w-[calc(100%_-_64px)] rounded-full border border-solid absolute h-full top-0 left-0 bottom-glass-outline" />
            <div className="self-stretch inline-flex items-center justify-center relative flex-[0_0_auto]">
              <button
                type="button"
                aria-label="추가하기"
                className="p-4 bg-[#111111] rounded-full inline-flex items-center justify-center relative flex-[0_0_auto] bottom-plus-shadow"
              >
                <div className="inline-flex items-center relative flex-[0_0_auto]">
                  <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                    <img
                      className="relative h-5"
                      alt=""
                      aria-hidden="true"
                      src="https://c.animaapp.com/RVtpFFFT/img/--icon-variant---8.svg"
                    />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center relative self-stretch w-full flex-[0_0_auto]">
          <div className="flex flex-col items-center justify-center relative self-stretch w-full flex-[0_0_auto]" />
        </div>
      </nav>
      <section
        className="h-full items-end absolute top-0 left-0 flex w-full z-[20]"
        aria-label="사진 업로드 옵션"
        onClick={closeSheet}
      >
        <div
          className={`w-full bg-zinc-800 opacity-35 absolute h-full top-0 left-0 ${
            isClosingSheet ? "sheet-backdrop-out" : "sheet-backdrop-in"
          }`}
        />
        <div
          className={`flex flex-col items-start relative flex-1 grow bg-white rounded-[16px_16px_0px_0px] shadow-shadow-200 ${
            isClosingSheet ? "bottom-sheet-out" : "bottom-sheet-in"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col items-center px-5 py-2 relative self-stretch w-full flex-[0_0_auto] rounded-[16px_16px_0px_0px] overflow-hidden">
            <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
              <div className="relative w-8 h-1.5 bg-[#1111111f] rounded-full" />
            </div>
          </div>
          <div className="flex items-start gap-3 px-5 pt-4 pb-8 self-stretch w-full relative flex-[0_0_auto]">
            {actionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex flex-col items-center justify-center gap-2 px-0 py-0 relative flex-1 h-[150px] rounded-[16px] border border-solid border-[#1111111a] bg-[#f7f7f8]"
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
    </main>
  );
};
