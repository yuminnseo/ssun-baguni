import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CartSlotItems,
  formatWonAmount,
  getCartSlotSummary,
} from "../../components/CartSlotItems";
import {
  applyCartColorOverride,
  cartColorOptions,
  getCartColorOption,
  resetCartColorOverride,
  saveCartColorOverride,
  type CartColorOption,
} from "../../cartColorOverrides";
import {
  getCartDates,
  getCartDatesWithLeadingHistory,
  getKoreaToday,
} from "../../dateSystem";
import { analyticsEvents, trackEvent } from "../../lib/analytics/mixpanel";

type EditableCart = {
  accentBgColor: string;
  cardBgClassName: string;
  dateKey: string;
  id: string;
  imageAlt: string;
  imageSrc: string;
  receiptColor?: string;
  wrapperClassName: string;
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
  cartColorOptions[0],
  cartColorOptions[2],
  cartColorOptions[3],
  cartColorOptions[7],
  cartColorOptions[6],
];

const baseCartDates = getCartDates();
const initialCartDates = getCartDatesWithLeadingHistory();
const firstBaseDateIndex = initialCartDates.indexOf(baseCartDates[0]);

const getPaletteIndex = (dateKey: string) =>
  [...dateKey].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
  emptyCartPalette.length;

const createEmptyCart = (dateKey: string, paletteIndex?: number) => {
  const palette = emptyCartPalette[paletteIndex ?? getPaletteIndex(dateKey)];

  return {
    id: `empty-${dateKey.replaceAll(".", "-")}`,
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    cardBgClassName: palette.cardBgClassName,
    accentBgColor: palette.accentBgColor,
    receiptColor: palette.receiptColor,
    imageAlt: palette.imageAlt,
    imageSrc: palette.imageSrc,
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

const getColorIdFromCart = (cart: EditableCart) => {
  const fileName = cart.imageSrc.toLowerCase();

  if (fileName.includes("red")) return "red";
  if (fileName.includes("coolpink")) return "cool-pink";
  if (fileName.includes("warmpink")) return "warm-pink";
  if (fileName.includes("purple")) return "purple";
  if (fileName.includes("green")) return "green";
  if (fileName.includes("mint")) return "mint";
  if (fileName.includes("grey")) return "grey";

  return "yellow";
};

const mergeColor = (cart: EditableCart, color: CartColorOption) => ({
  ...cart,
  accentBgColor: color.accentBgColor,
  cardBgClassName: color.cardBgClassName,
  imageAlt: color.imageAlt,
  imageSrc: color.imageSrc,
  receiptColor: color.receiptColor,
});

const ResetIcon = (): JSX.Element => (
  <svg
    aria-hidden="true"
    className="relative h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.2 8.7A7 7 0 1 1 5 12"
      stroke="#111111"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 4.5V9h4.5"
      stroke="#111111"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HomeEditColor = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const querySelectedDate = queryParams.get("selectedDate");
  const querySelectedIndex = Number(queryParams.get("selectedIndex"));
  const selectedDateFromState =
    typeof location.state?.selectedDate === "string"
      ? location.state.selectedDate
      : null;
  const selectedDate = selectedDateFromState ?? querySelectedDate;
  const dateCarts = useMemo(
    () => createInitialDateCarts(selectedDate),
    [selectedDate],
  );
  const cartDates = dateCarts.map((cart) => cart.dateKey);
  const selectedIndex =
    selectedDate && cartDates.includes(selectedDate)
      ? cartDates.indexOf(selectedDate)
      : Number.isFinite(querySelectedIndex)
        ? Math.min(Math.max(querySelectedIndex, 0), dateCarts.length - 1)
        : dateCarts.length - 1;
  const cart = dateCarts[selectedIndex];
  const initialColorId = getColorIdFromCart(cart);
  const [selectedColorId, setSelectedColorId] = useState(initialColorId);
  const [swatchPointerX, setSwatchPointerX] = useState<number | null>(null);
  const selectedColor =
    getCartColorOption(selectedColorId) ?? cartColorOptions[0];
  const previewCart = mergeColor(cart, selectedColor);
  const { totalAmount } = getCartSlotSummary(cart.id);
  const homeUrl = `/home-defaultu9501?selectedIndex=${selectedIndex}&selectedDate=${previewCart.dateKey}`;

  const saveAndReturn = () => {
    saveCartColorOverride(previewCart.dateKey, selectedColor.id);
    trackEvent(analyticsEvents.COLOR_CHANGED, {
      color_id: selectedColor.id,
      selected_date: previewCart.dateKey,
    });
    navigate(homeUrl, {
      state: {
        selectedDate: previewCart.dateKey,
        selectedIndex,
      },
    });
  };

  const resetColor = () => {
    resetCartColorOverride(previewCart.dateKey);
    const defaultCart = createInitialDateCarts(previewCart.dateKey).find(
      (nextCart) => nextCart.dateKey === previewCart.dateKey,
    );

    setSelectedColorId(defaultCart ? getColorIdFromCart(defaultCart) : "yellow");
  };

  return (
    <main
      aria-label="장바구니 색상 변경 화면"
      className="flex min-h-screen flex-col items-start relative bg-white overflow-hidden"
    >
      <header className="app-shell-fixed-x flex items-center justify-around gap-[104px] px-5 py-2 fixed top-0 z-[10] bg-white">
        <div className="flex items-center justify-between relative flex-1 grow">
          <div
            className="inline-flex items-center gap-1 px-0 py-0.5 relative flex-[0_0_auto]"
            data-typography-semantic-mode="english"
          >
            <time
              dateTime={previewCart.dateKey.replaceAll(".", "-")}
              className="relative w-fit mt-[-1.00px] font-title-small font-[number:var(--title-small-font-weight)] text-zinc-800 text-[length:var(--title-small-font-size)] tracking-[var(--title-small-letter-spacing)] leading-[var(--title-small-line-height)] whitespace-nowrap [font-style:var(--title-small-font-style)]"
            >
              {previewCart.dateKey}
            </time>
          </div>
          <button
            type="button"
            aria-label="색상 변경 리셋"
            className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]"
            onClick={resetColor}
          >
            <ResetIcon />
            <div className="absolute w-[calc(100%_+_16px)] h-[calc(100%_+_16px)] -top-2 -left-2 rounded-full" />
          </button>
        </div>
      </header>
      <section
        className="flex flex-col items-start relative flex-1 self-stretch w-full grow pt-20 pb-[164px]"
        aria-label="색상 변경 미리보기"
      >
        <div className="app-shell-fixed-x segment-control-scrim flex flex-col items-center justify-center px-5 py-2 fixed top-10 z-[10]">
          <div
            className="flex w-full h-full items-center gap-2.5 absolute top-0 left-0"
            aria-hidden="true"
          >
            <img
              className="relative flex-1 self-stretch grow"
              alt=""
              src="https://c.animaapp.com/RVtpFFFT/img/gradient-solid.svg"
            />
          </div>
          <div className="inline-flex items-center p-1 relative flex-[0_0_auto] bg-[#71717a14] rounded-full backdrop-blur backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(8px)_brightness(100%)]">
            <div
              className="inline-flex items-center gap-1 relative flex-[0_0_auto]"
              role="tablist"
              aria-label="보기 선택"
            >
              <button
                type="button"
                role="tab"
                aria-selected="true"
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 relative flex-[0_0_auto] bg-white rounded-full tab-active-shadow"
              >
                <div className="text-zinc-800 relative w-fit mt-[-1.00px] font-label-small font-[number:var(--label-small-font-weight)] text-[length:var(--label-small-font-size)] tracking-[var(--label-small-letter-spacing)] leading-[var(--label-small-line-height)] whitespace-nowrap [font-style:var(--label-small-font-style)]">
                  장바구니
                </div>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected="false"
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 relative flex-[0_0_auto] rounded-full"
              >
                <div className="text-[#11111170] relative w-fit mt-[-1.00px] font-label-small font-[number:var(--label-small-font-weight)] text-[length:var(--label-small-font-size)] tracking-[var(--label-small-letter-spacing)] leading-[var(--label-small-line-height)] whitespace-nowrap [font-style:var(--label-small-font-style)]">
                  영수증
                </div>
              </button>
            </div>
          </div>
        </div>
        <section className="flex items-start justify-center pt-9 pb-0 px-5 self-stretch w-full relative flex-[0_0_auto]">
          <article className={previewCart.wrapperClassName}>
            <div className="flex w-[172px] items-center pt-3 pb-5 px-5 relative flex-[0_0_auto] shadow-shadow-200">
              <div
                className={`w-full absolute h-full top-0 left-0 ${previewCart.cardBgClassName}`}
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
                alt={previewCart.imageAlt}
                src={previewCart.imageSrc}
              />
              <div className="pointer-events-none">
                <CartSlotItems cartId={cart.id} />
              </div>
            </div>
          </article>
        </section>
      </section>
      <section
        className="app-shell-fixed-x flex flex-col items-center justify-center pt-6 pb-3 px-5 fixed bottom-[84px] z-[10]"
        aria-label="색상 선택"
      >
        <div
          className="flex flex-col items-start absolute top-0 left-0 w-full h-full"
          aria-hidden="true"
        >
          <img
            className="color-swatch-gradient-image relative flex-1 self-stretch w-full grow"
            alt=""
            src="https://c.animaapp.com/RVtpFFFT/img/gradient-solid.svg"
          />
          <div className="relative flex-1 self-stretch w-full grow bg-white" />
        </div>
        <div
          className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] px-2 py-3"
          role="radiogroup"
          aria-label="장바구니 색상"
          onPointerLeave={() => setSwatchPointerX(null)}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setSwatchPointerX(event.clientX - rect.left);
          }}
        >
          {cartColorOptions.map((option, index) => {
            const isSelected = selectedColorId === option.id;
            const swatchCenter = 16 + index * 38;
            const distance = swatchPointerX === null
              ? Number.POSITIVE_INFINITY
              : Math.abs(swatchPointerX - swatchCenter);
            const proximity = Math.max(0, 1 - distance / 76);
            const scale = 1 + proximity * 0.34;
            const slotWidth = 32 + proximity * 12;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`색상 ${option.id}`}
                onClick={() => setSelectedColorId(option.id)}
                className="flex flex-col h-12 items-center justify-center gap-0.5 relative transition-[width] duration-300 ease-[cubic-bezier(0.2,1.6,0.24,1)]"
                style={{ width: `${slotWidth}px` }}
              >
                <div
                  className={`relative w-8 h-8 rounded-xl origin-center transition-[transform,filter] duration-300 ease-[cubic-bezier(0.2,1.6,0.24,1)] will-change-transform ${
                    isSelected ? "p-1.5" : ""
                  }`}
                  style={{
                    backgroundColor: option.swatchColor,
                    filter:
                      proximity > 0
                        ? `brightness(${1 + proximity * 0.04})`
                        : undefined,
                    transform: `scale(${scale}) translateY(${-proximity * 3}px)`,
                    zIndex: Math.round(proximity * 10) + (isSelected ? 20 : 0),
                  }}
                >
                  {isSelected && (
                    <>
                      <div className="absolute inset-0 rounded-xl border border-solid border-[#111111]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4.5 10.2 8.2 14 15.5 6"
                            stroke="#111111"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <footer className="app-shell-fixed-x flex flex-col items-start fixed bottom-0 z-[10] bg-white">
        <div className="flex items-center p-5 self-stretch w-full relative flex-[0_0_auto]">
          <div className="flex w-full items-center gap-2 relative">
            <Link
              className="flex flex-col px-6 py-3 flex-1 grow rounded-xl overflow-hidden items-center justify-center relative"
              aria-label="취소"
              to={homeUrl}
              state={{
                selectedDate: previewCart.dateKey,
                selectedIndex,
              }}
            >
              <div className="absolute top-0 left-0 bg-[#71717a14] w-full h-full" />
              <div className="relative w-fit mt-[-1.00px] font-label-large font-[number:var(--label-large-font-weight)] text-zinc-800 text-[length:var(--label-large-font-size)] tracking-[var(--label-large-letter-spacing)] leading-[var(--label-large-line-height)] whitespace-nowrap [font-style:var(--label-large-font-style)]">
                취소
              </div>
            </Link>
            <button
              type="button"
              className="flex flex-col items-center justify-center px-6 py-3 relative flex-1 grow bg-zinc-900 rounded-xl overflow-hidden"
              aria-label="바꾸기"
              onClick={saveAndReturn}
            >
              <div className="relative w-fit mt-[-1.00px] font-label-large font-[number:var(--label-large-font-weight)] text-white text-[length:var(--label-large-font-size)] tracking-[var(--label-large-letter-spacing)] leading-[var(--label-large-line-height)] whitespace-nowrap [font-style:var(--label-large-font-style)]">
                바꾸기
              </div>
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
};
