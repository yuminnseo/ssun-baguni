import {
  CartNoSpendSticker,
  formatWonAmount,
  getCartSlotItems,
  getCartSlotSummary,
  type SlotItem,
} from "./CartSlotItems";
import { getItemCategoryLabel } from "../lib/data/itemCategories";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type Ref,
} from "react";

type ReceiptCart = {
  accentBgColor: string;
  dateKey: string;
  id: string;
  imageAlt: string;
  receiptColor?: string;
};

type ReceiptRailProps = {
  carts: ReceiptCart[];
  dragHandleProps: Record<string, unknown>;
  itemsByCartId?: Record<string, SlotItem[]>;
  loadingCartIds?: Set<string>;
  noSpendCartIds?: Set<string>;
  onAddItems?: (index: number) => void;
  onMarkNoSpend?: (index: number) => void;
  onOpenItemDetails?: (cartId: string, itemId: string) => void;
  phase?: "enter" | "exit" | "idle" | "prep";
  railRef: Ref<HTMLElement>;
  railStyle: CSSProperties;
  selectedIndex: number;
  setItemRef: (index: number) => (node: HTMLElement | null) => void;
};

type CardDragMode = "pending" | "horizontal" | "vertical" | "idle";

type RailPointerHandlers = {
  onPointerCancel?: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
};

const perforationText =
  "* * * * * * * * * * * * * * * * * * * * * * * * * * *";

const itemTimes = ["09:12", "10:11", "12:14", "21:21"];
const RECEIPT_RENDER_RADIUS = 2;

const getReceiptColor = (cart: ReceiptCart) =>
  cart.imageAlt.toLowerCase().includes("red")
    ? "#FBC9C9"
    : cart.receiptColor ?? cart.accentBgColor;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const ReceiptRail = ({
  carts,
  dragHandleProps,
  itemsByCartId,
  loadingCartIds = new Set(),
  noSpendCartIds = new Set(),
  onAddItems,
  onMarkNoSpend,
  onOpenItemDetails,
  phase = "idle",
  railRef,
  railStyle,
  selectedIndex,
  setItemRef,
}: ReceiptRailProps): JSX.Element => {
  const [cardOffsetsY, setCardOffsetsY] = useState<Record<string, number>>({});
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [settlingCardId, setSettlingCardId] = useState<string | null>(null);
  const railPointerHandlers = dragHandleProps as RailPointerHandlers;
  const cardDragRef = useRef({
    cardId: "",
    mode: "idle" as CardDragMode,
    hasStartedRailDrag: false,
    startOffsetY: 0,
    startX: 0,
    startY: 0,
  });
  const wheelSettleTimerRef = useRef<number | null>(null);
  const receiptCardsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const touchScrollRef = useRef<{
    cardId: string;
    lastY: number;
    mode: "pending" | "horizontal" | "vertical";
    startX: number;
    startY: number;
  } | null>(null);
  const renderedReceiptRange = useMemo(() => {
    const maxIndex = Math.max(carts.length - 1, 0);

    return {
      endIndex: clamp(selectedIndex + RECEIPT_RENDER_RADIUS, 0, maxIndex),
      startIndex: clamp(selectedIndex - RECEIPT_RENDER_RADIUS, 0, maxIndex),
    };
  }, [carts.length, selectedIndex]);
  const renderedReceiptWindowKey = `${renderedReceiptRange.startIndex}:${renderedReceiptRange.endIndex}`;

  const updateCardOffset = (cardId: string, deltaY: number) => {
    setCardOffsetsY((currentOffsets) => ({
      ...currentOffsets,
      [cardId]: clamp((currentOffsets[cardId] ?? 0) + deltaY, -130, 0),
    }));
  };

  const startCardDrag =
    (cardId: string) => (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    cardDragRef.current = {
      cardId,
      hasStartedRailDrag: false,
      mode: "pending",
      startOffsetY: cardOffsetsY[cardId] ?? 0,
      startX: event.clientX,
      startY: event.clientY,
    };
    setSettlingCardId(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveCardDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (cardDragRef.current.mode === "idle") return;

    event.stopPropagation();
    const deltaX = event.clientX - cardDragRef.current.startX;
    const deltaY = event.clientY - cardDragRef.current.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (cardDragRef.current.mode === "pending") {
      if (Math.max(absDeltaX, absDeltaY) < 8) return;

      if (absDeltaX > absDeltaY) {
        cardDragRef.current.mode = "horizontal";
      } else {
        cardDragRef.current.mode = "vertical";
        setDraggingCardId(cardDragRef.current.cardId);
      }
    }

    if (cardDragRef.current.mode === "horizontal") {
      if (!cardDragRef.current.hasStartedRailDrag) {
        cardDragRef.current.hasStartedRailDrag = true;
        const railStartEvent = Object.assign(Object.create(event), {
          clientX: cardDragRef.current.startX,
        }) as PointerEvent<HTMLElement>;

        railPointerHandlers.onPointerDown?.(railStartEvent);
      }

      railPointerHandlers.onPointerMove?.(
        event as unknown as PointerEvent<HTMLElement>,
      );
      return;
    }

    setCardOffsetsY((currentOffsets) => ({
      ...currentOffsets,
      [cardDragRef.current.cardId]: clamp(
        cardDragRef.current.startOffsetY + deltaY,
        -130,
        0,
      ),
    }));
  };

  useEffect(() => {
    const cleanupCallbacks = Object.entries(receiptCardsRef.current).flatMap(
      ([cardId, node]) => {
        if (!node) return [];

        const handleWheel = (event: globalThis.WheelEvent) => {
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

          event.preventDefault();
          event.stopPropagation();

          const nextDeltaY = clamp(event.deltaY * 0.7, -32, 32);
          if (Math.abs(nextDeltaY) < 1) return;

          setSettlingCardId(null);
          setDraggingCardId(cardId);
          updateCardOffset(cardId, nextDeltaY);

          if (wheelSettleTimerRef.current !== null) {
            window.clearTimeout(wheelSettleTimerRef.current);
          }

          wheelSettleTimerRef.current = window.setTimeout(() => {
            setDraggingCardId(null);
            setSettlingCardId(cardId);
            window.setTimeout(() => {
              setSettlingCardId((currentCardId) =>
                currentCardId === cardId ? null : currentCardId,
              );
            }, 420);
          }, 120);
        };
        const handleTouchStart = (event: globalThis.TouchEvent) => {
          const firstTouch = event.touches[0];
          if (!firstTouch) return;

          touchScrollRef.current = {
            cardId,
            lastY: firstTouch.clientY,
            mode: "pending",
            startX: firstTouch.clientX,
            startY: firstTouch.clientY,
          };
        };
        const handleTouchMove = (event: globalThis.TouchEvent) => {
          const firstTouch = event.touches[0];
          if (!firstTouch) return;

          const previousTouch = touchScrollRef.current;
          if (!previousTouch || previousTouch.cardId !== cardId) {
            touchScrollRef.current = {
              cardId,
              lastY: firstTouch.clientY,
              mode: "pending",
              startX: firstTouch.clientX,
              startY: firstTouch.clientY,
            };
            return;
          }

          const totalDeltaX = firstTouch.clientX - previousTouch.startX;
          const totalDeltaY = firstTouch.clientY - previousTouch.startY;
          const absTotalDeltaX = Math.abs(totalDeltaX);
          const absTotalDeltaY = Math.abs(totalDeltaY);

          if (previousTouch.mode === "pending") {
            if (Math.max(absTotalDeltaX, absTotalDeltaY) < 8) return;

            previousTouch.mode =
              absTotalDeltaX > absTotalDeltaY ? "horizontal" : "vertical";
          }

          if (previousTouch.mode === "horizontal") {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const deltaY = previousTouch.lastY - firstTouch.clientY;

          touchScrollRef.current = {
            cardId,
            lastY: firstTouch.clientY,
            mode: "vertical",
            startX: previousTouch.startX,
            startY: previousTouch.startY,
          };

          const nextDeltaY = clamp(deltaY * 0.7, -32, 32);
          if (Math.abs(nextDeltaY) < 1) return;

          setSettlingCardId(null);
          setDraggingCardId(cardId);
          updateCardOffset(cardId, nextDeltaY);
        };
        const handleTouchEnd = () => {
          const wasVertical =
            touchScrollRef.current?.cardId === cardId &&
            touchScrollRef.current.mode === "vertical";

          touchScrollRef.current = null;
          if (!wasVertical) return;

          setDraggingCardId(null);
          setSettlingCardId(cardId);
          window.setTimeout(() => {
            setSettlingCardId((currentCardId) =>
              currentCardId === cardId ? null : currentCardId,
            );
          }, 420);
        };

        node.addEventListener("wheel", handleWheel, { passive: false });
        node.addEventListener("touchstart", handleTouchStart, { passive: false });
        node.addEventListener("touchmove", handleTouchMove, { passive: false });
        node.addEventListener("touchend", handleTouchEnd);
        node.addEventListener("touchcancel", handleTouchEnd);

        return [
          () => node.removeEventListener("wheel", handleWheel),
          () => node.removeEventListener("touchstart", handleTouchStart),
          () => node.removeEventListener("touchmove", handleTouchMove),
          () => node.removeEventListener("touchend", handleTouchEnd),
          () => node.removeEventListener("touchcancel", handleTouchEnd),
        ];
      },
    );

    return () => {
      cleanupCallbacks.forEach((cleanup) => cleanup());
      if (wheelSettleTimerRef.current !== null) {
        window.clearTimeout(wheelSettleTimerRef.current);
        wheelSettleTimerRef.current = null;
      }
    };
  }, [renderedReceiptWindowKey]);

  const endCardDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (cardDragRef.current.mode === "idle") return;

    event.stopPropagation();
    const { cardId, mode } = cardDragRef.current;

    if (mode === "vertical") {
      setDraggingCardId(null);
      setSettlingCardId(cardId);
    }

    if (mode === "horizontal" && cardDragRef.current.hasStartedRailDrag) {
      railPointerHandlers.onPointerUp?.(
        event as unknown as PointerEvent<HTMLElement>,
      );
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    cardDragRef.current.mode = "idle";

    if (mode === "vertical") {
      window.setTimeout(() => {
        setSettlingCardId((currentCardId) =>
          currentCardId === cardId ? null : currentCardId,
        );
      }, 420);
    }
  };

  return (
    <section
      aria-label="영수증 화면"
      className={`receipt-main receipt-main-${phase} flex flex-col items-center gap-2.5 px-0 pt-9 pb-5 relative flex-1 self-stretch w-full grow`}
      {...dragHandleProps}
    >
      <div
        ref={railRef}
        className="receipt-rail inline-flex items-start gap-3 min-[541px]:gap-10 min-[1190px]:gap-20 relative flex-[0_0_auto]"
        style={railStyle}
      >
        {carts.map((cart, index) => {
        const shouldRenderReceipt =
          index >= renderedReceiptRange.startIndex &&
          index <= renderedReceiptRange.endIndex;

        if (!shouldRenderReceipt) {
          return (
            <article
              aria-hidden="true"
              className="receipt-item receipt-item-placeholder justify-center px-5 py-0 inline-flex items-center relative flex-[0_0_auto]"
              key={cart.id}
              ref={setItemRef(index)}
            >
              <div className="receipt-placeholder-box" />
            </article>
          );
        }

        const items = itemsByCartId?.[cart.id] ?? getCartSlotItems(cart.id);
        const itemSummary = itemsByCartId
          ? {
              itemCount: items.length,
              totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
            }
          : getCartSlotSummary(cart.id);
        const { itemCount, totalAmount } = itemSummary;
        const isNoSpend = items.length === 0 && noSpendCartIds.has(cart.id);
        const isLoading = items.length === 0 && loadingCartIds.has(cart.id);
        const receiptColor = getReceiptColor(cart);
        const cardOffsetY = cardOffsetsY[cart.id] ?? 0;
        const cardDragStyle = {
          "--receipt-card-offset-y": `${cardOffsetY}px`,
          "--receipt-card-drag-tilt": `${clamp(cardOffsetY / 32, -4, 0)}deg`,
        } as CSSProperties;

          return (
            <article
              key={cart.id}
              ref={setItemRef(index)}
              className="receipt-item justify-center px-5 py-0 inline-flex items-center relative flex-[0_0_auto]"
            >
            <div className="flex flex-col w-[324px] items-center relative">
              <div className="receipt-printer flex flex-col h-20 items-start gap-2.5 px-3.5 py-[33px] relative self-stretch w-full">
                <div className="receipt-printer-frame">
                  <div className="receipt-printer-paper" />
                </div>
                <div className="receipt-printer-slot">
                  <div className="receipt-printer-slot-inner" />
                </div>
              </div>
              <div className="inline-flex flex-col flex-[0_0_auto] -mt-20 items-center relative">
                <div className="relative w-[280px] h-[35px] z-[1]" />
                <div className="receipt-card-print-area">
                  <div className="receipt-card-fixed-gradient" />
                  <div
                    className={`receipt-card inline-flex justify-center px-5 py-8 flex-[0_0_auto] z-0 items-center relative ${
                      draggingCardId === cart.id ? "receipt-card-dragging" : ""
                    } ${settlingCardId === cart.id ? "receipt-card-settling" : ""}`}
                    onPointerCancel={endCardDrag}
                    onPointerDown={startCardDrag(cart.id)}
                    onPointerMove={moveCardDrag}
                    onPointerUp={endCardDrag}
                    ref={(node) => {
                      if (node) {
                        receiptCardsRef.current[cart.id] = node;
                      } else {
                        delete receiptCardsRef.current[cart.id];
                      }
                    }}
                    style={{
                      ...cardDragStyle,
                      "--receipt-card-color": receiptColor,
                    }}
                  >
                    <>
                    <div className="receipt-card-surface" />
                    <div className="flex flex-col w-60 items-start gap-2 relative z-[1]">
                    <header className="flex items-end pt-0 pb-2 px-0 relative self-stretch w-full flex-[0_0_auto]">
                      <div
                        className="inline-flex items-center gap-1 relative flex-[0_0_auto]"
                        data-typography-semantic-mode="english"
                      >
                        <span className="won-symbol relative w-fit mt-[-1.00px] font-title-large font-[number:var(--title-large-font-weight)] text-zinc-800 text-[length:var(--title-large-font-size)] tracking-[var(--title-large-letter-spacing)] leading-[var(--title-large-line-height)] whitespace-nowrap [font-style:var(--title-large-font-style)]">
                          ₩
                        </span>
                        <strong className="relative w-fit mt-[-1.00px] font-title-large font-[number:var(--title-large-font-weight)] text-zinc-800 text-[length:var(--title-large-font-size)] tracking-[var(--title-large-letter-spacing)] leading-[var(--title-large-line-height)] whitespace-nowrap [font-style:var(--title-large-font-style)]">
                          {formatWonAmount(totalAmount)}
                        </strong>
                      </div>
                    </header>
                    <div
                      className="flex items-center justify-center relative self-stretch w-full flex-[0_0_auto]"
                      data-typography-semantic-mode="english"
                    >
                      <p className="relative flex-1 h-2.5 mt-[-1.00px] font-caption-medium font-[number:var(--caption-medium-font-weight)] text-[#11111170] text-[length:var(--caption-medium-font-size)] text-center tracking-[var(--caption-medium-letter-spacing)] leading-[var(--caption-medium-line-height)] whitespace-nowrap [font-style:var(--caption-medium-font-style)]">
                        {perforationText}
                      </p>
                    </div>
                    <dl
                      className="flex flex-col items-start gap-1 relative self-stretch w-full flex-[0_0_auto]"
                      data-typography-semantic-mode="english"
                    >
                      <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto]">
                        <dt className="relative w-fit mt-[-1.00px] font-caption-medium font-[number:var(--caption-medium-font-weight)] text-[#11111170] text-[length:var(--caption-medium-font-size)] tracking-[var(--caption-medium-letter-spacing)] leading-[var(--caption-medium-line-height)] whitespace-nowrap [font-style:var(--caption-medium-font-style)]">
                          DATE
                        </dt>
                        <dd className="relative w-fit mt-[-1.00px] m-0 font-caption-medium font-[number:var(--caption-medium-font-weight)] text-zinc-800 text-[length:var(--caption-medium-font-size)] tracking-[var(--caption-medium-letter-spacing)] leading-[var(--caption-medium-line-height)] whitespace-nowrap [font-style:var(--caption-medium-font-style)]">
                          {cart.dateKey}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto]">
                        <dt className="relative w-fit mt-[-1.00px] font-caption-medium font-[number:var(--caption-medium-font-weight)] text-[#11111170] text-[length:var(--caption-medium-font-size)] tracking-[var(--caption-medium-letter-spacing)] leading-[var(--caption-medium-line-height)] whitespace-nowrap [font-style:var(--caption-medium-font-style)]">
                          ITEM COUNT
                        </dt>
                        <dd className="relative w-fit mt-[-1.00px] m-0 font-caption-medium font-[number:var(--caption-medium-font-weight)] text-zinc-800 text-[length:var(--caption-medium-font-size)] tracking-[var(--caption-medium-letter-spacing)] leading-[var(--caption-medium-line-height)] whitespace-nowrap [font-style:var(--caption-medium-font-style)]">
                          {String(itemCount).padStart(2, "0")}
                        </dd>
                      </div>
                    </dl>
                    <div
                      className="flex items-center justify-center relative self-stretch w-full flex-[0_0_auto]"
                      data-typography-semantic-mode="english"
                    >
                      <p className="relative flex-1 h-2.5 mt-[-1.00px] font-caption-medium font-[number:var(--caption-medium-font-weight)] text-[#11111170] text-[length:var(--caption-medium-font-size)] text-center tracking-[var(--caption-medium-letter-spacing)] leading-[var(--caption-medium-line-height)] whitespace-nowrap [font-style:var(--caption-medium-font-style)]">
                        {perforationText}
                      </p>
                    </div>
                    {items.length === 0 ? (
                      isLoading ? null :
                      isNoSpend ? (
                        <div className="receipt-no-spend-wrapper">
                          <CartNoSpendSticker className="receipt-no-spend-sticker" />
                        </div>
                      ) : (
                        <div className="receipt-empty-wrapper">
                          <button
                            type="button"
                            className="cart-empty-button cart-empty-button-solid"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddItems?.(index);
                            }}
                          >
                            구매한 물건 담기
                          </button>
                          <button
                            type="button"
                            className="cart-empty-button cart-empty-button-outlined"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              onMarkNoSpend?.(index);
                            }}
                          >
                            무지출 DAY
                          </button>
                        </div>
                      )
                    ) : (
                      <ul className="flex flex-col items-start gap-4 px-0 py-3 relative self-stretch w-full flex-[0_0_auto] list-none m-0">
                        {items.map((item, itemIndex) => (
                          <li
                            key={item.id}
                            className="relative self-stretch w-full flex-[0_0_auto]"
                          >
                            <button
                              type="button"
                              className="receipt-line-item-button"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenItemDetails?.(cart.id, item.id);
                              }}
                            >
                              <img
                                aria-hidden="true"
                                className="relative w-[52px] h-[52px] object-contain"
                                alt=""
                                crossOrigin="anonymous"
                                decoding="async"
                                loading="lazy"
                                src={item.imageSrc}
                              />
                              <div className="flex flex-col w-[122px] items-start justify-center gap-1 relative">
                              <div
                                className="relative self-stretch mt-[-1.00px] font-caption-medium font-[number:var(--caption-medium-font-weight)] text-[#11111170] text-[length:var(--caption-medium-font-size)] tracking-[var(--caption-medium-letter-spacing)] leading-[var(--caption-medium-line-height)] [font-style:var(--caption-medium-font-style)]"
                                data-typography-semantic-mode="english"
                              >
                                {itemTimes[itemIndex] ?? "21:21"}
                              </div>
                              <div className="relative self-stretch font-label-medium font-[number:var(--label-medium-font-weight)] text-zinc-800 text-[length:var(--label-medium-font-size)] tracking-[var(--label-medium-letter-spacing)] leading-[var(--label-medium-line-height)] [font-style:var(--label-medium-font-style)]">
                                {getItemCategoryLabel(item.category)}
                              </div>
                              </div>
                              <div
                                className="relative w-fit font-body-small font-[number:var(--body-small-font-weight)] text-zinc-800 text-[length:var(--body-small-font-size)] text-right tracking-[var(--body-small-letter-spacing)] leading-[var(--body-small-line-height)] whitespace-nowrap [font-style:var(--body-small-font-style)]"
                                data-typography-semantic-mode="english"
                              >
                                {formatWonAmount(item.amount)}
                              </div>
                            </button>
                          </li>
                        ))}
                        </ul>
                    )}
                    </div>
                    </>
                  </div>
                </div>
              </div>
            </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
