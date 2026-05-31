import { useMemo } from "react";
import clsx from "clsx";
import type { CalendarEvent } from "@/api/types";

interface Props {
  events: CalendarEvent[];
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  onEventClick?: (ev: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
}

const EVENT_COLOR: Record<CalendarEvent["type"], string> = {
  mock_interview: "var(--secondary)",
  real_interview: "var(--primary)",
  block_review: "var(--warning)",
  final_technical: "#7BE38C",
  final_roast: "#FF5B5B",
  custom: "var(--text-2)",
};

const EVENT_LABEL: Record<CalendarEvent["type"], string> = {
  mock_interview: "Mock",
  real_interview: "Real",
  block_review: "Ревью",
  final_technical: "Техничка",
  final_roast: "Прожарка",
  custom: "Custom",
};

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CalendarGrid({ events, month, onPrev, onNext, onEventClick, onDayClick }: Props) {
  const grid = useMemo(() => buildMonth(month), [month]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const k = isoDay(new Date(e.start_datetime));
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    });
    return m;
  }, [events]);

  return (
    <div className="elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="caption mb-1">Календарь</div>
          <h3 className="text-[22px] font-bold capitalize -tracking-tight">
            {month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" onClick={onPrev}>
            ←
          </button>
          <button className="btn btn-sm" onClick={onNext}>
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="caption text-center py-1">
            {d}
          </div>
        ))}
        {grid.map(({ date, inMonth }, i) => {
          const k = isoDay(date);
          const dayEvents = byDay.get(k) ?? [];
          const isToday = isoDay(new Date()) === k;
          return (
            <button
              key={i}
              onClick={() => onDayClick?.(date)}
              className={clsx(
                "min-h-[88px] border rounded-md p-2 flex flex-col items-start gap-1 text-left transition-all",
                inMonth
                  ? "border-border bg-bg hover:border-border-bright"
                  : "border-border/40 bg-bg/40 text-text-3 opacity-50",
                isToday && "ring-1 ring-primary/60 border-primary/40",
              )}
            >
              <span
                className={clsx(
                  "font-mono text-[13px] font-semibold",
                  isToday && "text-primary",
                )}
              >
                {date.getDate()}
              </span>
              <div className="space-y-1 w-full">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(ev);
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded-sm w-full truncate cursor-pointer"
                    style={{
                      background: `color-mix(in oklab, ${EVENT_COLOR[ev.type]} 18%, transparent)`,
                      color: EVENT_COLOR[ev.type],
                      border: `1px solid color-mix(in oklab, ${EVENT_COLOR[ev.type]} 35%, transparent)`,
                    }}
                  >
                    {EVENT_LABEL[ev.type]}: {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-text-3 font-mono">
                    +{dayEvents.length - 3} ещё
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildMonth(month: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const dayOfWeek = (first.getDay() + 6) % 7; // Mon=0
  const start = new Date(first);
  start.setDate(first.getDate() - dayOfWeek);
  const total = Math.ceil((last.getDate() + dayOfWeek) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, inMonth: d.getMonth() === month.getMonth() };
  });
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
