import type { RequiredAgreementKey } from "./types";

export const agreementItems: Array<{
  hasViewButton?: boolean;
  id: RequiredAgreementKey;
  label: string;
}> = [
  { id: "age", label: "(필수) 만 14세 이상입니다." },
  {
    id: "privacy",
    label: "(필수) 개인정보처리방침에 동의합니다",
    hasViewButton: true,
  },
  {
    id: "terms",
    label: "(필수) 이용약관에 동의합니다.",
    hasViewButton: true,
  },
];

export const categoryOptions = [
  [
    {
      id: "food",
      label: "식비",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-----.svg",
    },
    {
      id: "cafe-snack",
      label: "카페·간식",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon--------.svg",
    },
    {
      id: "shopping",
      label: "쇼핑",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon---------1.svg",
    },
  ],
  [
    {
      id: "hobby-leisure",
      label: "취미·여가",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon------.svg",
    },
    {
      id: "daily-supplies",
      label: "생활용품",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon---------2.svg",
    },
    {
      id: "health",
      label: "건강",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-------1.svg",
    },
  ],
  [
    {
      id: "self-development",
      label: "자기계발",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-----------.svg",
    },
    {
      id: "gift",
      label: "선물",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-------2.svg",
    },
    {
      id: "etc",
      label: "기타",
      iconSrc: "https://c.animaapp.com/TR7Q5H5X/img/icon-------.svg",
    },
  ],
];

export const reasonOptions = [
  { id: "necessary", label: "필요해서" },
  { id: "planned", label: "계획한 소비" },
  { id: "no-reason", label: "이유없이" },
  { id: "refresh", label: "기분 전환" },
  { id: "gift-purpose", label: "선물용" },
  { id: "hobby-fandom", label: "취미·덕질" },
  { id: "discount", label: "할인해서" },
  { id: "hungry", label: "배고파서" },
  { id: "other", label: "기타" },
];

export const pictureGradients = [
  "linear-gradient(180deg, #FFECF6 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #FFE5ED 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #FFEBEB 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #CEF8F8 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #F6F0FE 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #D3F6E3 33.42%, #FFF 100%)",
  "linear-gradient(180deg, #FCFBBE 33.42%, #FFF 100%)",
];

export const itemDetailActions = [
  {
    id: "delete",
    label: "삭제",
    iconSrc: "https://c.animaapp.com/B1LZS6bG/img/--icon-variant--.svg",
  },
  {
    id: "edit",
    label: "수정",
    iconSrc: "https://c.animaapp.com/B1LZS6bG/img/--icon-variant---1.svg",
  },
];
