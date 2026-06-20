import {
  useMemo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

type Point = {
  x: number;
  y: number;
};

export type SlotItem = {
  anchor: Point;
  amount: number;
  category?: string | null;
  id: string;
  imageSrc: string;
  rotation: number;
  size: number;
  tagOffset: Point;
  tagRotation: number;
  x: number;
  y: number;
};

const slotPresets: Record<string, SlotItem[]> = {
  "warm-pink": [],
  pink: [],
  green: [
    {
      anchor: { x: 0.78, y: 0.58 },
      amount: 6000,
      id: "item-a",
      imageSrc: "/items/Salad.png",
      rotation: 36,
      size: 150,
      tagOffset: { x: 158, y: 86 },
      tagRotation: -28,
      x: 34,
      y: 72,
    },
    {
      anchor: { x: 0.58, y: 0.42 },
      amount: 4000,
      id: "item-b",
      imageSrc: "/items/Coffee.png",
      rotation: -41,
      size: 126,
      tagOffset: { x: 122, y: 76 },
      tagRotation: 34,
      x: 106,
      y: 222,
    },
  ],
  yellow: [
    {
      anchor: { x: 0.78, y: 0.58 },
      amount: 6000,
      id: "item-a",
      imageSrc: "/items/Salad.png",
      rotation: -18,
      size: 154,
      tagOffset: { x: 160, y: 96 },
      tagRotation: 18,
      x: 34,
      y: 58,
    },
    {
      anchor: { x: 0.58, y: 0.42 },
      amount: 4000,
      id: "item-b",
      imageSrc: "/items/Coffee.png",
      rotation: 38,
      size: 128,
      tagOffset: { x: 122, y: 78 },
      tagRotation: -42,
      x: 108,
      y: 214,
    },
  ],
};

const CART_WIDTH = 316;
const CART_HEIGHT = 410;
const TAG_WIDTH = 79;
const TAG_HEIGHT = 24;
const TAG_PULL_LIMIT = 54;
const TAG_STEM_WIDTH = 6;
const DRAG_OPEN_THRESHOLD = 8;

const savedCartItems: Record<string, SlotItem[]> = {};
export const NO_SPEND_STICKER_SRC = "/sticker/no-spend-day.svg";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const cloneItems = (items: SlotItem[]) =>
  items.map((item) => ({
    ...item,
    anchor: { ...item.anchor },
    tagOffset: { ...item.tagOffset },
  }));

const mergeSessionLayouts = (cartId: string, items: SlotItem[]) => {
  const savedItems = savedCartItems[cartId] ?? [];
  const savedItemsById = new Map(savedItems.map((item) => [item.id, item]));

  return items.map((item) => {
    const savedItem = savedItemsById.get(item.id);
    if (!savedItem) return item;

    return {
      ...item,
      anchor: { ...savedItem.anchor },
      rotation: savedItem.rotation,
      size: savedItem.size,
      tagOffset: { ...savedItem.tagOffset },
      tagRotation: savedItem.tagRotation,
      x: savedItem.x,
      y: savedItem.y,
    };
  });
};

export const formatWonAmount = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

export const getCartSlotSummary = (cartId: string) => {
  const items = savedCartItems[cartId] ?? slotPresets[cartId] ?? [];

  return {
    itemCount: items.length,
    totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
  };
};

export const getCartSlotItems = (cartId: string) =>
  cloneItems(savedCartItems[cartId] ?? slotPresets[cartId] ?? []);

const getMutableCartItems = (cartId: string) => {
  if (!savedCartItems[cartId]) {
    savedCartItems[cartId] = cloneItems(slotPresets[cartId] ?? []);
  }

  return savedCartItems[cartId];
};

export const addCartSlotItem = (cartId: string, item: SlotItem) => {
  const items = getMutableCartItems(cartId);
  savedCartItems[cartId] = cloneItems([...items, item]);
};

export const updateCartSlotItem = (
  cartId: string,
  itemId: string,
  updates: Partial<Pick<SlotItem, "amount" | "category" | "imageSrc">>,
) => {
  const items = getMutableCartItems(cartId);
  savedCartItems[cartId] = cloneItems(
    items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
  );
};

export const deleteCartSlotItem = (cartId: string, itemId: string) => {
  const items = getMutableCartItems(cartId);
  savedCartItems[cartId] = cloneItems(
    items.filter((item) => item.id !== itemId),
  );
};

const randomAngle = (currentAngle: number) => {
  const nextAngle = Math.round(-45 + Math.random() * 85);

  if (Math.abs(nextAngle - currentAngle) < 8) {
    return nextAngle + 16 > 40 ? nextAngle - 16 : nextAngle + 16;
  }

  return nextAngle;
};

const rotatePoint = (point: Point, angle: number) => {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

const overlaps = (first: SlotItem, second: SlotItem) => {
  const padding = 16;

  return !(
    first.x + first.size < second.x + padding ||
    first.x + padding > second.x + second.size ||
    first.y + first.size < second.y + padding ||
    first.y + padding > second.y + second.size
  );
};

const settleItems = (currentItems: SlotItem[], movedId: string) => {
  const movedItem = currentItems.find((item) => item.id === movedId);
  if (!movedItem) return { ids: [movedId], items: currentItems };

  const hitIds = new Set<string>([movedId]);

  let nextItems = currentItems.map((item) => {
    if (item.id === movedId || !overlaps(movedItem, item)) return item;

    hitIds.add(item.id);

    const movedCenterX = movedItem.x + movedItem.size / 2;
    const movedCenterY = movedItem.y + movedItem.size / 2;
    const itemCenterX = item.x + item.size / 2;
    const itemCenterY = item.y + item.size / 2;
    const directionX = itemCenterX >= movedCenterX ? 1 : -1;
    const directionY = itemCenterY >= movedCenterY ? 1 : -1;
    const pushX = Math.abs(itemCenterX - movedCenterX) < 24 ? 30 : 18;
    const pushY = Math.abs(itemCenterY - movedCenterY) < 24 ? 30 : 18;

    return {
      ...item,
      x: clamp(
        item.x + directionX * pushX,
        8,
        CART_WIDTH - item.size - 8,
      ),
      y: clamp(
        item.y + directionY * pushY,
        28,
        CART_HEIGHT - item.size - 16,
      ),
    };
  });

  nextItems = nextItems.map((item) => {
    let bounceX = 0;
    let bounceY = 0;

    if (item.x <= 10) bounceX = 10;
    if (item.x >= CART_WIDTH - item.size - 10) bounceX = -10;
    if (item.y <= 30) bounceY = 10;
    if (item.y >= CART_HEIGHT - item.size - 18) bounceY = -10;

    if (bounceX === 0 && bounceY === 0) return item;

    hitIds.add(item.id);

    return {
      ...item,
      x: clamp(item.x + bounceX, 8, CART_WIDTH - item.size - 8),
      y: clamp(item.y + bounceY, 28, CART_HEIGHT - item.size - 16),
    };
  });

  return { ids: [...hitIds], items: nextItems };
};

const NoSpendSticker = ({ className = "" }: { className?: string }) => (
  <div className={`no-spend-sticker ${className}`} aria-label="무지출 데이">
    <img
      alt="무지출 데이"
      className="no-spend-sticker-image"
      draggable={false}
      src={NO_SPEND_STICKER_SRC}
    />
  </div>
);

export const CartNoSpendSticker = NoSpendSticker;

const EmptyCartActions = ({
  onAddItems,
  onMarkNoSpend,
}: {
  onAddItems?: () => void;
  onMarkNoSpend?: () => void;
}) => (
  <div className="empty-cart-actions" aria-label="빈 장바구니 작업">
    <button
      type="button"
      className="cart-empty-button cart-empty-button-solid"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onAddItems?.();
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
        onMarkNoSpend?.();
      }}
    >
      무지출 DAY
    </button>
  </div>
);

const PriceTag = ({ amount }: { amount: number }) => (
  <div className="price-tag">
    <svg
      className="absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      width="79"
      height="24"
      viewBox="0 0 79 24"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g clipPath="url(#price-tag-clip)">
        <mask id="price-tag-mask" fill="white">
          <path d="M79 20C79 22.2091 77.2091 24 75 24L4 24C1.79086 24 0 22.2091 0 20L0 4C0 1.79086 1.79086 0 4 0L75 0C77.2091 0 79 1.79086 79 4V20ZM8 10C6.89543 10 6 10.8954 6 12C6 13.1046 6.89543 14 8 14C9.10457 14 10 13.1046 10 12C10 10.8954 9.10457 10 8 10Z" />
        </mask>
        <path
          d="M79 20C79 22.2091 77.2091 24 75 24L4 24C1.79086 24 0 22.2091 0 20L0 4C0 1.79086 1.79086 0 4 0L75 0C77.2091 0 79 1.79086 79 4V20ZM8 10C6.89543 10 6 10.8954 6 12C6 13.1046 6.89543 14 8 14C9.10457 14 10 13.1046 10 12C10 10.8954 9.10457 10 8 10Z"
          fill="white"
        />
        <path
          d="M75 24V23L4 23V24V25L75 25V24ZM0 20H1L1 4H0H-1L-1 20H0ZM4 0V1L75 1V0V-1L4 -1V0ZM79 4H78V20H79H80V4H79ZM8 10V9C6.34315 9 5 10.3431 5 12H6H7C7 11.4477 7.44772 11 8 11V10ZM6 12H5C5 13.6569 6.34315 15 8 15V14V13C7.44772 13 7 12.5523 7 12H6ZM8 14V15C9.65685 15 11 13.6569 11 12H10H9C9 12.5523 8.55228 13 8 13V14ZM10 12H11C11 10.3431 9.65685 9 8 9V10V11C8.55228 11 9 11.4477 9 12H10ZM75 0V1C76.6569 1 78 2.34315 78 4H79H80C80 1.23858 77.7614 -1 75 -1V0ZM0 4H1C1 2.34315 2.34315 1 4 1V0V-1C1.23858 -1 -1 1.23858 -1 4H0ZM4 24V23C2.34314 23 1 21.6569 1 20H0H-1C-1 22.7614 1.23857 25 4 25V24ZM75 24V25C77.7614 25 80 22.7614 80 20H79H78C78 21.6569 76.6569 23 75 23V24Z"
          fill="#71717A"
          fillOpacity="0.16"
          mask="url(#price-tag-mask)"
        />
      </g>
      <defs>
        <clipPath id="price-tag-clip">
          <path
            d="M0 4C0 1.79086 1.79086 0 4 0L75 0C77.2091 0 79 1.79086 79 4V20C79 22.2091 77.2091 24 75 24L4 24C1.79086 24 0 22.2091 0 20L0 4Z"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
    <div className="price-tag-content">
      <div className="price-tag-price">
        <span>₩</span>
        <span>{formatWonAmount(amount)}</span>
      </div>
    </div>
  </div>
);

export const CartSlotItems = ({
  cartId,
  itemsOverride,
  isNoSpend = false,
  isLoading = false,
  onAddItems,
  onMarkNoSpend,
  onOpenItemDetails,
}: {
  cartId: string;
  itemsOverride?: SlotItem[];
  isNoSpend?: boolean;
  isLoading?: boolean;
  onAddItems?: () => void;
  onMarkNoSpend?: () => void;
  onOpenItemDetails?: (cartId: string, itemId: string) => void;
}): JSX.Element => {
  const initialItems = useMemo(() => {
    if (itemsOverride) {
      return cloneItems(mergeSessionLayouts(cartId, itemsOverride));
    }

    const savedItems = savedCartItems[cartId];
    return cloneItems(savedItems ?? slotPresets[cartId] ?? []);
  }, [cartId, itemsOverride]);
  const [items, setItems] = useState<SlotItem[]>(() => initialItems);
  const [tagPulls, setTagPulls] = useState<Record<string, Point>>({});
  const [dragging, setDragging] = useState<{
    id: string;
    mode: "item" | "tag";
  } | null>(null);
  const [settlingIds, setSettlingIds] = useState<string[]>([]);
  const suppressItemClickRef = useRef(false);
  const dragRef = useRef<{
    id: string;
    lastDelta: Point;
    mode: "item" | "tag";
    origin: Point;
    pointer: Point;
  } | null>(null);

  useEffect(() => {
    if (itemsOverride) {
      setItems(cloneItems(mergeSessionLayouts(cartId, itemsOverride)));
    }
  }, [cartId, itemsOverride]);

  useEffect(() => {
    savedCartItems[cartId] = cloneItems(items);
  }, [cartId, items]);

  const startDrag =
    (id: string, mode: "item" | "tag") =>
    (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const item = items.find((entry) => entry.id === id);
      if (!item) return;

      suppressItemClickRef.current = false;
      dragRef.current = {
        id,
        lastDelta: { x: 0, y: 0 },
        mode,
        origin: mode === "item" ? { x: item.x, y: item.y } : { x: 0, y: 0 },
        pointer: { x: event.clientX, y: event.clientY },
      };
      setDragging({ id, mode });
      event.currentTarget.setPointerCapture(event.pointerId);
    };

  const finishDrag = () => {
    if (!dragRef.current) return;

    const { id, lastDelta, mode } = dragRef.current;

    dragRef.current = null;
    setDragging(null);

    if (mode === "tag") {
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === id
            ? { ...item, tagRotation: randomAngle(item.tagRotation) }
            : item,
        ),
      );
      setTagPulls((currentPulls) => ({
        ...currentPulls,
        [id]: { x: 0, y: 0 },
      }));
      return;
    }

    setItems((currentItems) => {
      const rotatedItems = currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              tagRotation: randomAngle(item.tagRotation),
              x: clamp(
                item.x + lastDelta.x * 0.18,
                8,
                CART_WIDTH - item.size - 8,
              ),
              y: clamp(
                item.y + lastDelta.y * 0.18,
                28,
                CART_HEIGHT - item.size - 16,
              ),
            }
          : item,
      );
      const settled = settleItems(rotatedItems, id);
      setSettlingIds(settled.ids);
      window.setTimeout(() => setSettlingIds([]), 320);
      return settled.items;
    });
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerEnd = () => finishDrag();

    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [dragging]);

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const deltaX = event.clientX - dragRef.current.pointer.x;
    const deltaY = event.clientY - dragRef.current.pointer.y;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 6) {
      suppressItemClickRef.current = true;
    }

    if (dragRef.current.mode === "tag") {
      dragRef.current.lastDelta = { x: deltaX, y: deltaY };
      setTagPulls((currentPulls) => ({
        ...currentPulls,
        [dragRef.current!.id]: {
          x: clamp(deltaX, -TAG_PULL_LIMIT, TAG_PULL_LIMIT),
          y: clamp(deltaY, -TAG_PULL_LIMIT, TAG_PULL_LIMIT),
        },
      }));
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== dragRef.current?.id) return item;

        dragRef.current.lastDelta = { x: deltaX, y: deltaY };

        return {
          ...item,
          x: clamp(
            dragRef.current.origin.x + deltaX,
            8,
            CART_WIDTH - item.size - 8,
          ),
          y: clamp(
            dragRef.current.origin.y + deltaY,
            28,
            CART_HEIGHT - item.size - 16,
          ),
        };
      }),
    );
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const { id, lastDelta, mode } = dragRef.current;
    const isTap =
      mode === "item" &&
      Math.max(Math.abs(lastDelta.x), Math.abs(lastDelta.y)) <=
        DRAG_OPEN_THRESHOLD;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (isTap) {
      dragRef.current = null;
      setDragging(null);
      suppressItemClickRef.current = true;
      onOpenItemDetails?.(cartId, id);
      return;
    }

    finishDrag();
  };

  return (
    <div className="cart-slot-items" aria-label="장바구니 물품">
      {items.length === 0 &&
        !isLoading &&
        (isNoSpend ? (
          <NoSpendSticker />
        ) : (
          <EmptyCartActions
            onAddItems={onAddItems}
            onMarkNoSpend={onMarkNoSpend}
          />
        ))}
      {items.map((item) => {
        const tagPull = tagPulls[item.id] ?? { x: 0, y: 0 };
        const isItemDragging =
          dragging?.id === item.id && dragging.mode === "item";
        const isTagDragging =
          dragging?.id === item.id && dragging.mode === "tag";
        const tagBaseX = clamp(
          item.x + item.tagOffset.x,
          16,
          CART_WIDTH -
            Math.max(TAG_WIDTH, 39 + formatWonAmount(item.amount).length * 8) -
            4,
        );
        const tagBaseY = clamp(
          item.y + item.tagOffset.y,
          2,
          CART_HEIGHT - TAG_HEIGHT - 2,
        );
        const tagX = tagBaseX + tagPull.x;
        const tagY = tagBaseY + tagPull.y;
        const tagLeftCenter = {
          x:
            tagX +
            rotatePoint({ x: TAG_STEM_WIDTH, y: 0 }, item.tagRotation).x,
          y:
            tagY +
            TAG_HEIGHT / 2 +
            rotatePoint({ x: TAG_STEM_WIDTH, y: 0 }, item.tagRotation).y,
        };
        const itemAnchor = {
          x: item.x + item.size * 0.5,
          y: item.y + item.size * 0.5,
        };
        const bend = isTagDragging ? 18 : 8;
        const controlA = {
          x: tagLeftCenter.x - 22 - Math.abs(tagPull.y) * 0.2,
          y: tagLeftCenter.y + tagPull.y * 0.45 + bend,
        };
        const controlB = {
          x: itemAnchor.x + tagPull.x * 0.16,
          y: itemAnchor.y - tagPull.x * 0.12 - bend,
        };
        const connectorPath = `M ${tagLeftCenter.x} ${tagLeftCenter.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${itemAnchor.x} ${itemAnchor.y}`;

        return (
          <div
            key={item.id}
            className="absolute left-0 top-0"
            style={{ zIndex: isItemDragging || isTagDragging ? 8 : 4 }}
          >
            <svg className="tag-connector" viewBox={`0 0 ${CART_WIDTH} ${CART_HEIGHT}`} aria-hidden="true">
              <path
                d={connectorPath}
                fill="none"
                stroke="#111111"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
              />
            </svg>
            <button
              type="button"
              aria-label="가격 태그 조정"
              className={`price-tag-with-line ${
                isTagDragging ? "price-tag-with-line-dragging" : ""
              }`}
              style={{
                left: `${tagBaseX}px`,
                top: `${tagBaseY}px`,
                transform: `translate3d(${tagPull.x}px, ${tagPull.y}px, 0) rotate(${item.tagRotation}deg)`,
              }}
              onPointerCancel={endDrag}
              onPointerDown={startDrag(item.id, "tag")}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
            >
              <span className="tag-stem" aria-hidden="true" />
              <PriceTag amount={item.amount} />
            </button>
            <button
              type="button"
              aria-label="물품 위치 조정"
              className={`cart-slot-item ${
                isItemDragging ? "cart-slot-item-dragging" : ""
              } ${settlingIds.includes(item.id) ? "cart-slot-item-settling" : ""}`}
              style={
                {
                  "--item-rotation": `${item.rotation}deg`,
                  height: `${item.size}px`,
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.size}px`,
                } as CSSProperties
              }
              onPointerCancel={endDrag}
              onPointerDown={startDrag(item.id, "item")}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onClick={(event) => {
                event.stopPropagation();
                if (suppressItemClickRef.current) {
                  suppressItemClickRef.current = false;
                  return;
                }

                onOpenItemDetails?.(cartId, item.id);
              }}
            >
              <img
                className="h-full w-full object-contain"
                alt="구매 물품"
                src={item.imageSrc}
                draggable={false}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};
