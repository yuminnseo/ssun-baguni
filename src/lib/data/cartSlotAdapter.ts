import type { SlotItem } from "../../components/CartSlotItems";
import type { Item } from "../supabase/types";

export type SlotItemsByDate = Record<string, SlotItem[]>;

const itemLayouts = [
  {
    anchor: { x: 0.72, y: 0.56 },
    rotation: 8,
    size: 148,
    tagOffset: { x: 146, y: 84 },
    tagRotation: -22,
    x: 48,
    y: 82,
  },
  {
    anchor: { x: 0.58, y: 0.42 },
    rotation: -18,
    size: 126,
    tagOffset: { x: 122, y: 78 },
    tagRotation: 26,
    x: 106,
    y: 214,
  },
  {
    anchor: { x: 0.78, y: 0.58 },
    rotation: 24,
    size: 144,
    tagOffset: { x: 152, y: 88 },
    tagRotation: -18,
    x: 28,
    y: 62,
  },
];

export const toDateKey = (date: string) => date.replaceAll("-", ".");

export const toDatabaseDate = (dateKey: string) => dateKey.replaceAll(".", "-");

const getFallbackImageSrc = (item: Item) =>
  item.category === "cafe-snack" ? "/items/Coffee.png" : "/items/Salad.png";

export const itemToSlotItem = (item: Item, index: number): SlotItem => {
  const layout = itemLayouts[index % itemLayouts.length];

  return {
    ...layout,
    amount: item.price,
    category: item.category,
    id: item.id,
    imageSrc:
      item.removed_bg_image_url ??
      item.original_image_url ??
      getFallbackImageSrc(item),
  };
};

export const itemsToSlotItemsByDate = (items: Item[]): SlotItemsByDate =>
  items.reduce<SlotItemsByDate>((itemsByDate, item) => {
    const dateKey = toDateKey(item.date);
    const currentItems = itemsByDate[dateKey] ?? [];

    itemsByDate[dateKey] = [
      ...currentItems,
      itemToSlotItem(item, currentItems.length),
    ];

    return itemsByDate;
  }, {});
