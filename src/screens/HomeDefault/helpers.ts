type ItemTimePeriod = "AM" | "PM";

export const parseItemTime = (value: string) => {
  const match = /^(AM|PM)\s+(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return { period: "AM" as ItemTimePeriod, hour: "11", minute: "00" };
  }

  const period = match[1] as ItemTimePeriod;
  const hourNumber = Number(match[2]);
  const minuteNumber = Number(match[3]);
  const normalizedHour = Math.min(Math.max(hourNumber, 1), 12);
  const normalizedMinute = Math.min(Math.max(minuteNumber, 0), 59);
  const hour24 =
    period === "AM"
      ? normalizedHour % 12
      : normalizedHour === 12
        ? 12
        : normalizedHour + 12;
  const roundedTotalMinutes =
    Math.round((hour24 * 60 + normalizedMinute) / 5) * 5;
  const normalizedTotalMinutes = roundedTotalMinutes % (24 * 60);
  const roundedHour24 = Math.floor(normalizedTotalMinutes / 60);
  const roundedMinute = normalizedTotalMinutes % 60;
  const roundedPeriod: ItemTimePeriod = roundedHour24 < 12 ? "AM" : "PM";
  const roundedHour12 = roundedHour24 % 12 || 12;

  return {
    period: roundedPeriod,
    hour: String(roundedHour12),
    minute: String(roundedMinute).padStart(2, "0"),
  };
};

export const formatItemTime = (
  period: ItemTimePeriod,
  hour: string,
  minute: string,
) => `${period} ${hour.padStart(2, "0")}:${minute}`;

export const formatPriceInput = (value: string) =>
  value ? new Intl.NumberFormat("ko-KR").format(Number(value)) : "";
