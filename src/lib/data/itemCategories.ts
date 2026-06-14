const itemCategoryLabels: Record<string, string> = {
  "cafe-snack": "카페·간식",
  "daily-supplies": "생활용품",
  etc: "기타",
  food: "식비",
  gift: "선물",
  health: "건강",
  "hobby-leisure": "취미·여가",
  "self-development": "자기계발",
  shopping: "쇼핑",
};

export const getItemCategoryLabel = (category?: string | null) =>
  category ? itemCategoryLabels[category] ?? "카테고리" : "카테고리";
