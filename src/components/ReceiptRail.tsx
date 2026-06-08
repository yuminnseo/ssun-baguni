import {
  formatWonAmount,
  getCartSlotItems,
  getCartSlotSummary,
} from "./CartSlotItems";
import {
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
  phase?: "enter" | "exit" | "idle";
  railRef: Ref<HTMLElement>;
  railStyle: CSSProperties;
  setItemRef: (index: number) => (node: HTMLElement | null) => void;
};

const perforationText =
  "* * * * * * * * * * * * * * * * * * * * * * * * * * *";

const itemTimes = ["09:12", "10:11", "12:14", "21:21"];

const getReceiptColor = (cart: ReceiptCart) =>
  cart.imageAlt.toLowerCase().includes("red")
    ? "#FBC9C9"
    : cart.receiptColor ?? cart.accentBgColor;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const ReceiptRail = ({
  carts,
  dragHandleProps,
  phase = "idle",
  railRef,
  railStyle,
  setItemRef,
}: ReceiptRailProps): JSX.Element => {
  const [cardOffsetsY, setCardOffsetsY] = useState<Record<string, number>>({});
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [settlingCardId, setSettlingCardId] = useState<string | null>(null);
  const cardDragRef = useRef({ cardId: "", startOffsetY: 0, startY: 0 });

  const startCardDrag =
    (cardId: string) => (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    cardDragRef.current = {
      cardId,
      startOffsetY: cardOffsetsY[cardId] ?? 0,
      startY: event.clientY,
    };
    setDraggingCardId(cardId);
    setSettlingCardId(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveCardDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingCardId) return;

    event.stopPropagation();
    const deltaY = event.clientY - cardDragRef.current.startY;
    const nextOffset = clamp(cardDragRef.current.startOffsetY + deltaY, -130, 0);

    setCardOffsetsY((currentOffsets) => ({
      ...currentOffsets,
      [cardDragRef.current.cardId]: nextOffset,
    }));
  };

  const endCardDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingCardId) return;

    event.stopPropagation();
    const cardId = draggingCardId;

    setDraggingCardId(null);
    setSettlingCardId(cardId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    window.setTimeout(() => {
      setSettlingCardId((currentCardId) =>
        currentCardId === cardId ? null : currentCardId,
      );
    }, 420);
  };

  return (
    <section
      aria-label="영수증 화면"
      className={`receipt-main receipt-main-${phase} flex flex-col items-center gap-2.5 px-0 pt-9 pb-5 relative flex-1 self-stretch w-full grow`}
      {...dragHandleProps}
    >
      <div
        ref={railRef}
        className="receipt-rail inline-flex items-start gap-3 min-[541px]:gap-10 relative flex-[0_0_auto]"
        style={railStyle}
      >
        {carts.map((cart, index) => {
        const { itemCount, totalAmount } = getCartSlotSummary(cart.id);
        const items = getCartSlotItems(cart.id);
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
                    style={{
                      ...cardDragStyle,
                      "--receipt-card-color": receiptColor,
                    }}
                  >
                    <div className="receipt-card-surface" />
                    <div className="flex flex-col w-60 items-start gap-2 relative z-[1]">
                    <header className="flex items-end pt-0 pb-2 px-0 relative self-stretch w-full flex-[0_0_auto]">
                      <div
                        className="inline-flex items-center gap-1 relative flex-[0_0_auto]"
                        data-typography-semantic-mode="english"
                      >
                        <span className="relative w-fit mt-[-1.00px] font-title-large font-[number:var(--title-large-font-weight)] text-zinc-800 text-[length:var(--title-large-font-size)] tracking-[var(--title-large-letter-spacing)] leading-[var(--title-large-line-height)] whitespace-nowrap [font-style:var(--title-large-font-style)]">
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
                    <ul className="flex flex-col items-start gap-4 px-0 py-3 relative self-stretch w-full flex-[0_0_auto] list-none m-0">
                      {items.map((item, itemIndex) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto]"
                        >
                          <img
                            aria-hidden="true"
                            className="relative w-[52px] h-[52px] object-contain"
                            alt=""
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
                              상품 카테고리
                            </div>
                          </div>
                          <div
                            className="relative w-fit font-body-small font-[number:var(--body-small-font-weight)] text-zinc-800 text-[length:var(--body-small-font-size)] text-right tracking-[var(--body-small-letter-spacing)] leading-[var(--body-small-line-height)] whitespace-nowrap [font-style:var(--body-small-font-style)]"
                            data-typography-semantic-mode="english"
                          >
                            {formatWonAmount(item.amount)}
                          </div>
                        </li>
                      ))}
                      </ul>
                    </div>
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
