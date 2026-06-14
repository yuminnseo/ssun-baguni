import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

const SWIPE_THRESHOLD = 56;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const useCartSwipe = (
  itemCount: number,
  initialIndex: number,
  initialOffset = 0,
  layoutKey: string | number = 0,
) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [baseOffset, setBaseOffset] = useState(initialOffset);
  const [dragOffset, setDragOffset] = useState(0);
  const [hasInitialAlignment, setHasInitialAlignment] = useState(
    initialOffset !== 0,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [visibleIndexes, setVisibleIndexes] = useState<number[]>([
    initialIndex,
  ]);
  const railRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const dragRef = useRef({ active: false, startIndex: initialIndex, startX: 0 });
  const usedProvidedOffsetRef = useRef(initialOffset !== 0);
  const visualOffsetRef = useRef(0);

  visualOffsetRef.current = baseOffset + dragOffset;

  const setItemRef = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      itemRefs.current[index] = node;
    },
    [],
  );

  const getCurrentTransformX = () => {
    const rail = railRef.current;
    if (!rail) return visualOffsetRef.current;

    const transform = window.getComputedStyle(rail).transform;
    if (!transform || transform === "none") return 0;

    const matrixValues = transform
      .match(/matrix.*\((.+)\)/)?.[1]
      ?.split(",")
      .map((value) => value.trim());
    return matrixValues ? Number(matrixValues[4] ?? 0) : 0;
  };

  const getCenteredOffset = (item: HTMLElement) => {
    const rect = item.getBoundingClientRect();
    const itemCenter = rect.left + rect.width / 2;
    const viewportCenter = window.innerWidth / 2;

    return getCurrentTransformX() + viewportCenter - itemCenter;
  };

  const alignSelectedItem = useCallback(() => {
    const item = itemRefs.current[selectedIndex];
    if (!item) return;

    setBaseOffset(getCenteredOffset(item));
    setDragOffset(0);
    setHasInitialAlignment(true);
  }, [selectedIndex]);

  const selectIndex = useCallback(
    (index: number) => {
      const clampedIndex = clamp(index, 0, itemCount - 1);
      const nextItem = itemRefs.current[clampedIndex];

      setIsDragging(false);
      setDragOffset(0);
      setSelectedIndex(clampedIndex);

      if (nextItem) {
        setBaseOffset(getCenteredOffset(nextItem));
        setHasInitialAlignment(true);
      }
    },
    [itemCount],
  );

  const snapIndex = useCallback(
    (index: number) => {
      const clampedIndex = clamp(index, 0, itemCount - 1);
      const nextItem = itemRefs.current[clampedIndex];

      setIsSnapping(true);
      setIsDragging(false);
      setDragOffset(0);
      setSelectedIndex(clampedIndex);

      if (nextItem) {
        setBaseOffset(getCenteredOffset(nextItem));
        setHasInitialAlignment(true);
      }

      window.requestAnimationFrame(() => {
        setIsSnapping(false);
      });
    },
    [itemCount],
  );

  const updateVisibleIndexes = useCallback(() => {
    const nextVisibleIndexes = itemRefs.current.flatMap((item, index) => {
      if (!item) return [];

      const rect = item.getBoundingClientRect();
      const visibleWidth =
        Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
      const visibleHeight =
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      const hasHorizontalPresence = visibleWidth > 0;
      const verticalVisibleRatio =
        rect.height === 0 ? 0 : Math.max(0, visibleHeight) / rect.height;

      return hasHorizontalPresence && verticalVisibleRatio >= 0.75
        ? [index]
        : [];
    });

    if (!nextVisibleIndexes.includes(selectedIndex)) {
      nextVisibleIndexes.push(selectedIndex);
    }

    setVisibleIndexes((currentIndexes) => {
      const currentKey = [...currentIndexes].sort().join(",");
      const nextKey = [...nextVisibleIndexes].sort().join(",");

      return currentKey === nextKey ? currentIndexes : nextVisibleIndexes;
    });
  }, [selectedIndex]);

  useLayoutEffect(() => {
    if (usedProvidedOffsetRef.current) {
      usedProvidedOffsetRef.current = false;
    } else {
      alignSelectedItem();
    }
    window.addEventListener("resize", alignSelectedItem);
    window.addEventListener("resize", updateVisibleIndexes);

    return () => {
      window.removeEventListener("resize", alignSelectedItem);
      window.removeEventListener("resize", updateVisibleIndexes);
    };
  }, [alignSelectedItem, itemCount, layoutKey, updateVisibleIndexes]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateVisibleIndexes);
    const settledFrame = window.setTimeout(updateVisibleIndexes, 280);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settledFrame);
    };
  }, [baseOffset, dragOffset, updateVisibleIndexes]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    rail.addEventListener("transitionend", updateVisibleIndexes);

    return () => rail.removeEventListener("transitionend", updateVisibleIndexes);
  }, [updateVisibleIndexes]);

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current.active) return;

    const delta = event.clientX - dragRef.current.startX;
    const nextIndex =
      delta > SWIPE_THRESHOLD
        ? dragRef.current.startIndex - 1
        : delta < -SWIPE_THRESHOLD
          ? dragRef.current.startIndex + 1
          : dragRef.current.startIndex;

    const clampedIndex = clamp(nextIndex, 0, itemCount - 1);
    const nextItem = itemRefs.current[clampedIndex];
    const nextBaseOffset = nextItem ? getCenteredOffset(nextItem) : baseOffset;

    dragRef.current.active = false;
    setIsDragging(false);
    setBaseOffset(nextBaseOffset);
    setDragOffset(0);
    setSelectedIndex(clampedIndex);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const dragHandleProps = {
    onPointerCancel: endDrag,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      dragRef.current = {
        active: true,
        startIndex: selectedIndex,
        startX: event.clientX,
      };
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (!dragRef.current.active) return;

      setDragOffset(event.clientX - dragRef.current.startX);
    },
    onPointerUp: endDrag,
    style: {
      cursor: isDragging ? "grabbing" : "grab",
      touchAction: "pan-y",
    } satisfies CSSProperties,
  };

  const railStyle = {
    transform: `translate3d(${baseOffset + dragOffset}px, 0, 0)`,
    transition:
      isDragging || isSnapping || !hasInitialAlignment
        ? "none"
        : "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  } satisfies CSSProperties;

  return {
    dragHandleProps,
    railStyle,
    railRef,
    railOffset: baseOffset + dragOffset,
    selectedIndex,
    selectIndex,
    snapIndex,
    setItemRef,
    visibleIndexes,
  };
};
