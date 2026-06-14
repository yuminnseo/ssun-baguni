const CART_HISTORY_DAYS = 365;

const formatDateKey = (date: Date) => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
};

export const addDaysToDateKey = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split(".").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const nextYear = date.getFullYear();
  const nextMonth = `${date.getMonth() + 1}`.padStart(2, "0");
  const nextDay = `${date.getDate()}`.padStart(2, "0");

  return `${nextYear}.${nextMonth}.${nextDay}`;
};

export const getKoreaToday = () => formatDateKey(new Date());

export const getCartDates = () => {
  const today = new Date();

  return [-2, -1, 0].map((dayOffset) => formatDateKey(addDays(today, dayOffset)));
};

export const getCartDatesWithLeadingHistory = (
  leadingCount = CART_HISTORY_DAYS,
) => {
  const baseDates = getCartDates();
  const firstBaseDate = baseDates[0];
  const leadingDates = Array.from({ length: leadingCount }, (_, index) =>
    addDaysToDateKey(firstBaseDate, index - leadingCount),
  );

  return [...leadingDates, ...baseDates];
};
