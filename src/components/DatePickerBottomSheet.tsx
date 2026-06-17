import { useEffect, useState, type TouchEvent, type WheelEvent } from "react";

const SHEET_ANIMATION_MS = 220;
const DAYS_IN_WEEK = 7;

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarDay = {
  dateKey: string;
  label: string;
  muted?: boolean;
};

type DatePickerBottomSheetProps = {
  dates: string[];
  onClose: () => void;
  onSelectDate: (dateKey: string) => boolean;
  recordedDates: string[];
  selectedIndex: number;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}.${month}.${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split(".").map(Number);

  return new Date(year, month - 1, day);
};

const formatMonthLabel = (date: Date) =>
  `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, "0")}`;

const getCalendarWeeks = (displayMonth: Date) => {
  const firstDay = new Date(
    displayMonth.getFullYear(),
    displayMonth.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    displayMonth.getFullYear(),
    displayMonth.getMonth() + 1,
    0,
  ).getDate();
  const weeksInView = Math.max(
    5,
    Math.ceil((firstDay.getDay() + daysInMonth) / DAYS_IN_WEEK),
  );
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: weeksInView }, (_, weekIndex) =>
    Array.from({ length: DAYS_IN_WEEK }, (_, dayIndex) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + weekIndex * DAYS_IN_WEEK + dayIndex);

      return {
        dateKey: formatDateKey(date),
        label: String(date.getDate()),
        muted: date.getMonth() !== displayMonth.getMonth(),
      };
    }),
  );
};

export const DatePickerBottomSheet = ({
  dates,
  onClose,
  onSelectDate,
  recordedDates,
  selectedIndex,
}: DatePickerBottomSheetProps): JSX.Element => {
  const [isClosing, setIsClosing] = useState(false);
  const selectedDate = parseDateKey(dates[selectedIndex]);
  const maxSelectableDate = dates.at(-1) ?? dates[selectedIndex];
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const calendarWeeks = getCalendarWeeks(displayMonth);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.body.style.touchAction = previousBodyTouchAction;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const changeMonth = (direction: -1 | 1) => {
    setDisplayMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + direction,
          1,
        ),
    );
  };

  const closeSheet = () => {
    if (isClosing) return;

    setIsClosing(true);
    window.setTimeout(onClose, SHEET_ANIMATION_MS);
  };

  const selectDay = (day: CalendarDay) => {
    if (onSelectDate(day.dateKey)) {
      closeSheet();
    }
  };

  const blockBackgroundScroll = (
    event: TouchEvent<HTMLElement> | WheelEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section
      className="date-picker-overlay"
      aria-label="날짜 선택 바텀시트"
      onClick={closeSheet}
      onTouchMove={blockBackgroundScroll}
      onWheel={blockBackgroundScroll}
    >
      <div
        className={`date-picker-backdrop ${
          isClosing ? "sheet-backdrop-out" : "sheet-backdrop-in"
        }`}
        aria-hidden="true"
      />
      <div
        className={`date-picker-sheet ${
          isClosing ? "bottom-sheet-out" : "bottom-sheet-in"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="날짜 선택"
        onClick={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="flex w-full flex-col items-center overflow-hidden rounded-[16px_16px_0px_0px] px-5 py-2">
          <div
            className="h-1.5 w-8 rounded-full bg-[#1111111f]"
            aria-hidden="true"
          />
        </div>
        <div className="flex w-full flex-col items-start px-5 pb-10 pt-6">
          <header className="flex w-full items-center justify-center gap-2">
            <button
              type="button"
              aria-label="이전 달"
              className="flex h-6 w-6 items-center justify-center"
              onClick={() => changeMonth(-1)}
            >
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M14.5 5L7.5 12L14.5 19"
                  stroke="#111111"
                  strokeOpacity="0.4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className="date-picker-title" data-typography-semantic-mode="english">
              {formatMonthLabel(displayMonth)}
            </h1>
            <button
              type="button"
              aria-label="다음 달"
              className="flex h-6 w-6 items-center justify-center"
              onClick={() => changeMonth(1)}
            >
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M9.5 5L16.5 12L9.5 19"
                  stroke="#111111"
                  strokeOpacity="0.4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </header>
          <div className="mt-7 grid w-full grid-cols-7 justify-items-center">
            {weekDays.map((day) => (
              <div key={day} className="date-picker-weekday">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-[2px] flex w-full flex-col gap-0">
            {calendarWeeks.map((week, weekIndex) => (
              <div
                key={`week-${weekIndex}`}
                className="grid w-full grid-cols-7 justify-items-center"
              >
                {week.map((day, dayIndex) => {
                  const isSelected = day.dateKey === dates[selectedIndex];
                  const isRecorded = recordedDates.includes(day.dateKey);
                  const isToday = day.dateKey === dates.at(-1);
                  const isFuture = day.dateKey > maxSelectableDate;

                  return (
                    <button
                      key={`${weekIndex}-${dayIndex}-${day.label}`}
                      type="button"
                      aria-label={
                        isSelected ? `${day.label}일 선택됨` : `${day.label}일`
                      }
                      aria-disabled={isFuture}
                      aria-pressed={isSelected}
                      className={`date-picker-day ${
                        isFuture ? "date-picker-day-disabled" : ""
                      }`}
                      disabled={isFuture}
                      onClick={() => selectDay(day)}
                    >
                      {isToday ? (
                        <span className="date-picker-today-tooltip">오늘</span>
                      ) : null}
                      <span
                        className={`date-picker-day-label ${
                          isSelected
                            ? "date-picker-day-selected"
                            : isFuture
                              ? "date-picker-day-future"
                              : day.muted
                              ? "date-picker-day-muted"
                              : ""
                        }`}
                        data-typography-semantic-mode="english"
                      >
                        {day.label}
                      </span>
                      {isRecorded && !isSelected ? (
                        <span
                          aria-hidden="true"
                          className={`date-picker-record-dot ${
                            day.muted ? "date-picker-record-dot-muted" : ""
                          }`}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
