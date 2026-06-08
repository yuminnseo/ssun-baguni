import { Link } from "react-router-dom";
import {
  CartSlotItems,
  formatWonAmount,
  getCartSlotSummary,
} from "../../components/CartSlotItems";
import { getCartDates } from "../../dateSystem";
import { useCartSwipe } from "../../useCartSwipe";

const tabs = [
  { id: "cart", label: "장바구니", active: true },
  { id: "receipt", label: "영수증", active: false },
];

const basketCards = [
  {
    id: "pink",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    cardBgClassName: "bg-[#fff2f9]",
    basketType: "image",
    basketAlt: "Warm pink cart",
    basketImageSrc: "/cart/WarmPink.png?v=high",
    slotImageSrc: "",
    slotImageClassName: "",
  },
  {
    id: "green",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    cardBgClassName: "bg-[#c8f3dc]",
    basketType: "image",
    basketAlt: "Green cart",
    basketImageSrc: "/cart/Green.png?v=high",
    slotImageSrc: "",
    slotImageClassName: "",
  },
  {
    id: "yellow",
    wrapperClassName:
      "inline-flex flex-col items-center relative flex-[0_0_auto]",
    cardBgClassName: "bg-[#fff6c8]",
    basketType: "image",
    basketAlt: "Yellow cart",
    basketImageSrc: "/cart/Yellow.png?v=high",
    slotImageSrc: "",
    slotImageClassName: "",
  },
];

const cartDates = getCartDates();

const navItems = [
  {
    id: "home",
    label: "홈",
    active: true,
    iconSrc: "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-home-2.svg",
    iconAlt: "Icon navigation home",
  },
  {
    id: "calendar",
    label: "캘린더",
    active: false,
    iconSrc:
      "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-calendar-2.svg",
    iconAlt: "Icon navigation calendar",
  },
  {
    id: "friends",
    label: "친구",
    active: false,
    iconSrc: "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-social-2.svg",
    iconAlt: "Icon navigation social",
  },
  {
    id: "my",
    label: "My",
    active: false,
    iconSrc:
      "https://c.animaapp.com/RVtpFFFT/img/icon-navigation-my-page-2.svg",
    iconAlt: "Icon navigation my page",
  },
];

export const HomeDefaultScreen = (): JSX.Element => {
  const {
    dragHandleProps,
    railRef,
    railStyle,
    selectedIndex,
    setItemRef,
    visibleIndexes,
  } =
    useCartSwipe(basketCards.length, 1);

  return (
    <main
      className="flex min-h-screen flex-col items-start relative bg-white"
      data-model-id="2352:158345"
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
                    alt="Expand date"
                    src="https://c.animaapp.com/RVtpFFFT/img/--icon-variant---6.svg"
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="More options"
            className="inline-flex items-center gap-5 relative self-stretch flex-[0_0_auto] cursor-pointer"
          >
            <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
              <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                <img
                  className="relative h-6"
                  alt="More options"
                  src="https://c.animaapp.com/RVtpFFFT/img/--icon-variant---7.svg"
                />
              </div>
              <div className="absolute w-[calc(100%_+_16px)] h-[calc(100%_+_16px)] -top-2 -left-2 rounded-full" />
            </div>
          </button>
        </div>
      </header>
      <div className="flex flex-col items-start relative flex-1 self-stretch w-full grow pt-20 pb-[112px]">
        <section
          aria-label="View switcher"
          className="flex flex-col items-center justify-center px-5 py-2 fixed top-10 left-0 z-[10] w-full bg-white"
        >
          <div
            className="flex w-full h-full items-center gap-2.5 absolute top-0 left-0"
            aria-hidden="true"
          >
            <img
              className="relative flex-1 self-stretch grow"
              alt="Gradient solid"
              src="https://c.animaapp.com/RVtpFFFT/img/gradient-solid-1.svg"
            />
          </div>
          <div className="inline-flex items-center p-1 relative flex-[0_0_auto] bg-[#71717a14] rounded-full backdrop-blur backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(8px)_brightness(100%)]">
            <div className="inline-flex items-center gap-1 relative flex-[0_0_auto]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={tab.active}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 relative flex-[0_0_auto] rounded-full ${
                    tab.active ? "bg-white tab-active-shadow" : ""
                  }`}
                >
                  <div
                    className={`relative w-fit mt-[-1.00px] font-label-small font-[number:var(--label-small-font-weight)] text-[length:var(--label-small-font-size)] tracking-[var(--label-small-letter-spacing)] leading-[var(--label-small-line-height)] whitespace-nowrap [font-style:var(--label-small-font-style)] ${
                      tab.active ? "text-zinc-800" : "text-[#11111170]"
                    }`}
                  >
                    {tab.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section
          aria-label="Shopping baskets"
          className="flex items-start justify-center pt-9 pb-0 px-5 self-stretch w-full relative flex-[0_0_auto]"
          {...dragHandleProps}
        >
          <div
            ref={railRef}
            className="flex w-full max-w-[375px] justify-center gap-3 min-[541px]:gap-10 px-0 py-0 items-center relative"
            style={railStyle}
          >
            {basketCards.map((basket, index) => (
              (() => {
                const { totalAmount } = getCartSlotSummary(basket.id);

                return (
                  <article
                    key={basket.id}
                    ref={setItemRef(index)}
                    className={basket.wrapperClassName}
                  >
                    <div className="flex w-[172px] items-center pt-3 pb-5 px-5 relative flex-[0_0_auto] shadow-shadow-200">
                      <div
                        className={`w-full absolute h-full top-0 left-0 ${basket.cardBgClassName}`}
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
                    <div className="relative h-[410px] -mt-7 w-[316px] aspect-[0.77]">
                      <img
                        className="relative h-full w-full object-cover"
                        alt={basket.basketAlt}
                        src={basket.basketImageSrc}
                      />
                      {visibleIndexes.includes(index) && <CartSlotItems cartId={basket.id} />}
                    </div>
                  </article>
                );
              })()
            ))}
          </div>
        </section>
        <div className="flex flex-col items-end justify-end p-5 relative flex-1 self-stretch w-full grow">
          <Link
            className="inline-flex flex-col items-center justify-center px-4 py-2 relative flex-[0_0_auto] bg-white rounded-lg overflow-hidden border border-solid border-zinc-900"
            to="/home-defaultu9501"
            aria-label="오늘 보기로 이동"
          >
            <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
              <div className="inline-flex gap-0.5 flex-[0_0_auto] items-center relative">
                <div className="inline-flex items-center justify-center relative flex-[0_0_auto]">
                  <div className="relative w-fit mt-[-1.00px] font-label-small font-[number:var(--label-small-font-weight)] text-zinc-800 text-[length:var(--label-small-font-size)] tracking-[var(--label-small-letter-spacing)] leading-[var(--label-small-line-height)] whitespace-nowrap [font-style:var(--label-small-font-style)]">
                    오늘
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute w-full h-full top-0 left-0" />
          </Link>
        </div>
      </div>
      <footer className="flex flex-col items-start fixed bottom-0 left-0 z-[10] w-full">
        <div className="flex-col items-start self-stretch w-full flex-[0_0_auto] flex px-5 pt-0 pb-8 relative">
          <div className="flex justify-center gap-3 self-stretch w-full flex-[0_0_auto] items-center relative">
            <nav
              aria-label="Bottom navigation"
              className="items-end justify-center flex-1 grow rounded-full border border-solid flex px-5 py-0 relative bottom-glass-nav"
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
            <button
              type="button"
              aria-label="Add new item"
              className="self-stretch inline-flex items-center justify-center relative flex-[0_0_auto]"
            >
              <div className="p-4 bg-[#111111] rounded-full inline-flex items-center justify-center relative flex-[0_0_auto] bottom-plus-shadow">
                <div className="inline-flex items-center relative flex-[0_0_auto]">
                  <div className="inline-flex flex-col items-center justify-center relative flex-[0_0_auto]">
                    <img
                      className="relative h-5"
                      alt="Add"
                      src="https://c.animaapp.com/RVtpFFFT/img/--icon-variant---8.svg"
                    />
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
    </main>
  );
};
