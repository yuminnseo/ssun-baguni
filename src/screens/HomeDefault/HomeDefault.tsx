import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CartSlotItems,
  formatWonAmount,
  getCartSlotSummary,
} from "../../components/CartSlotItems";
import { ColorMenuButton } from "../../components/ColorMenuButton";
import { DatePickerBottomSheet } from "../../components/DatePickerBottomSheet";
import { ReceiptRail } from "../../components/ReceiptRail";
import {
  getCartDates,
  getCartDatesWithLeadingHistory,
  getKoreaToday,
} from "../../dateSystem";
import { useCartSwipe } from "../../useCartSwipe";

const tabs = [
  { id: "cart", label: "장바구니" },
  { id: "receipt", label: "영수증" },
];

const VIEW_TRANSITION_MS = 1180;

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

  return dateCarts.sort((first, second) =>
    first.dateKey.localeCompare(second.dateKey),
  );
};

const navItems = [
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
    iconSrc: "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-calendar.svg",
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

export const HomeDefault = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"cart" | "receipt">("cart");
  const [transitionPhase, setTransitionPhase] = useState<
    "idle" | "cart-to-receipt" | "receipt-to-cart"
  >("idle");
  const [isCartReturnReady, setIsCartReturnReady] = useState(true);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const queryParams = new URLSearchParams(location.search);
  const querySelectedIndex = Number(queryParams.get("selectedIndex"));
  const querySelectedDate = queryParams.get("selectedDate");
  const queryRailOffset = Number(queryParams.get("railOffset"));
  const stateSelectedDate =
    typeof location.state?.selectedDate === "string"
      ? location.state.selectedDate
      : null;
  const requestedSelectedDate = stateSelectedDate ?? querySelectedDate;
  const [dateCarts, setDateCarts] = useState(() =>
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
      : querySelectedDate && cartDates.includes(querySelectedDate)
        ? cartDates.indexOf(querySelectedDate)
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
    selectIndex,
    selectedIndex,
    setItemRef,
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

  const switchView = (view: "cart" | "receipt") => {
    if (view === activeView) return;

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    if (view === "receipt" && activeView === "cart") {
      setIsCartReturnReady(false);
      setTransitionPhase("cart-to-receipt");
      setActiveView("receipt");
      window.setTimeout(() => selectIndex(selectedIndex), 40);
      transitionTimerRef.current = window.setTimeout(() => {
        setTransitionPhase("idle");
        transitionTimerRef.current = null;
      }, VIEW_TRANSITION_MS);
      return;
    }

    setIsCartReturnReady(false);
    setTransitionPhase("receipt-to-cart");
    setActiveView(view);
    window.requestAnimationFrame(() => {
      selectIndex(selectedIndex);
      window.setTimeout(() => {
        selectIndex(selectedIndex);
        setIsCartReturnReady(true);
      }, 220);
    });
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionPhase("idle");
      transitionTimerRef.current = null;
      setIsCartReturnReady(true);
      window.requestAnimationFrame(() => selectIndex(selectedIndex));
    }, VIEW_TRANSITION_MS);
  };

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
  }, []);

  const selectDate = (dateKey: string) => {
    if (dateKey > getKoreaToday()) return false;

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
    navigate(`/home-defaultu9501?selectedIndex=${nextIndex}&selectedDate=${dateKey}`, {
      replace: true,
      state: { selectedIndex: nextIndex, selectedDate: dateKey },
    });
    return true;
  };
  const openAddSheet = (index: number) => {
    const stableRailOffset = Math.round(railOffset * 100) / 100;
    const selectedDate = cartDates[index];

    navigate(
      `/home-defaultu95u4366u4462u4352u4449u4370u4449u4352u4469?selectedIndex=${index}&selectedDate=${selectedDate}&railOffset=${stableRailOffset}`,
      {
        state: {
          railOffset,
          selectedDate,
          selectedIndex: index,
        },
      },
    );
  };
  const recordedDates = dateCarts.flatMap((cart) =>
    getCartSlotSummary(cart.id).itemCount > 0
      ? [cart.dateKey]
      : [],
  );

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
              onClick={() => setIsDatePickerOpen(true)}
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
      <section
        className="flex flex-col items-start relative flex-1 self-stretch w-full grow pt-20 pb-[112px]"
        aria-label="장바구니 화면"
      >
        <div className="segment-control-scrim flex flex-col items-center justify-center px-5 py-2 fixed top-10 left-0 z-[10] w-full">
          <div
            className="flex w-full h-full items-center gap-2.5 absolute top-0 left-0"
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
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeView;

                return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchView(tab.id as "cart" | "receipt")}
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
              className="w-[375px] justify-end px-7 py-0 ml-[-20.00px] mr-[-20.00px] flex items-center gap-3 min-[541px]:gap-10 relative"
              style={viewRailStyle}
            >
              {dateCarts.map((cart, index) => (
                (() => {
                  const { totalAmount } = getCartSlotSummary(cart.id);

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
                        {visibleIndexes.includes(index) && (
                          <CartSlotItems
                            cartId={cart.id}
                            onAddItems={() => openAddSheet(index)}
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
            phase={
              transitionPhase === "receipt-to-cart"
                ? "exit"
                : transitionPhase === "cart-to-receipt"
                  ? "enter"
                  : "idle"
            }
            railRef={
              transitionPhase === "receipt-to-cart" ? undefined : railRef
            }
            railStyle={viewRailStyle}
            setItemRef={
              transitionPhase === "receipt-to-cart"
                ? (_index: number) => (_node: HTMLElement | null) => {}
                : setItemRef
            }
          />
        )}
        <div className="flex flex-col items-end justify-end p-5 relative flex-1 self-stretch w-full grow" />
      </section>
      <footer className="flex flex-col items-start fixed bottom-0 left-0 z-[10] w-full">
        <div className="flex-col items-start self-stretch w-full flex-[0_0_auto] flex px-5 pt-0 pb-8 relative">
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
            </nav>
            <div className="w-[calc(100%_-_64px)] rounded-full border border-solid absolute h-full top-0 left-0 bottom-glass-outline" />
            <Link
              className="self-stretch inline-flex items-center justify-center relative flex-[0_0_auto]"
              to={`/home-defaultu95u4366u4462u4352u4449u4370u4449u4352u4469?selectedIndex=${selectedIndex}&selectedDate=${cartDates[selectedIndex]}&railOffset=${Math.round(railOffset * 100) / 100}`}
              state={{
                railOffset,
                selectedDate: cartDates[selectedIndex],
                selectedIndex,
              }}
              aria-label="새 항목 추가"
            >
              <div className="p-4 bg-[#111111] rounded-full inline-flex items-center justify-center relative flex-[0_0_auto] bottom-plus-shadow">
                <div className="inline-flex items-center relative flex-[0_0_auto]">
                  <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                    <img
                      className="relative h-5"
                      alt="Icon variant"
                      src="https://c.animaapp.com/RVtpFFFT/img/--icon-variant---8.svg"
                    />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center relative self-stretch w-full flex-[0_0_auto]">
          <div className="flex flex-col items-center justify-center relative self-stretch w-full flex-[0_0_auto]" />
        </div>
      </footer>
      {isDatePickerOpen && (
        <DatePickerBottomSheet
          dates={cartDates}
          recordedDates={recordedDates}
          selectedIndex={selectedIndex}
          onSelectDate={selectDate}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}
    </main>
  );
};
