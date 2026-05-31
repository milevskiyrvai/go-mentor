import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { listEvents } from "@/api/calendar";
import type { CalendarEvent, CalendarEventType } from "@/api/types";
import { Spinner } from "@/components/Spinner";

type ViewMode = "month" | "week";

// маппинг типов события API -> css-классы дизайн-системы (.evt.* / .ag-*.* / .sw.*)
const TYPE_CLASS: Record<CalendarEventType, string> = {
  block_review: "review",
  mock_interview: "mock",
  real_interview: "real",
  final_technical: "tech",
  final_roast: "roast",
  custom: "custom",
};

const TYPE_TAG: Record<CalendarEventType, string> = {
  block_review: "Ревью",
  mock_interview: "Mock",
  real_interview: "Real",
  final_technical: "Техничка",
  final_roast: "Прожарка",
  custom: "Другое",
};

const TYPE_TITLE: Record<CalendarEventType, string> = {
  block_review: "Ревью блока",
  mock_interview: "Mock-собеседование",
  real_interview: "Real-собеседование",
  final_technical: "Финальная техничка",
  final_roast: "Финальная прожарка",
  custom: "Событие",
};

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function StudentCalendar() {
  const [view, setView] = useState<ViewMode>("month");
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  // тянем события с запасом ±1 месяц, чтобы заполнить хвосты сетки и agenda
  const range = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 2, 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [month]);

  const eventsQ = useQuery({
    queryKey: ["my-calendar", month.getFullYear(), month.getMonth()],
    queryFn: () => listEvents({ from: range.from, to: range.to }),
  });

  const events = eventsQ.data ?? [];

  // --- метрики шапки (ближайшие 7 дней) ---
  const now = new Date();
  const upcoming = useMemo(() => {
    const horizon = new Date(now.getTime() + 7 * 86400 * 1000);
    return events
      .filter((e) => {
        const d = new Date(e.start_datetime);
        return d >= now && d <= horizon;
      })
      .sort(
        (a, b) =>
          new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime(),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const nextEvent = upcoming[0];

  // --- сетка месяца ---
  const grid = useMemo(() => buildMonth(month), [month]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const k = isoDay(new Date(e.start_datetime));
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    });
    for (const arr of m.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime(),
      );
    }
    return m;
  }, [events]);

  // --- agenda (7 дней) сгруппированная по дате ---
  const agendaGroups = useMemo(() => groupAgenda(upcoming), [upcoming]);

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div className="page-head">
        <div>
          <h1>Календарь</h1>
          <div className="sub">
            {eventsQ.isLoading ? (
              "Загрузка событий…"
            ) : eventsQ.isError ? (
              "Не удалось загрузить события"
            ) : upcoming.length > 0 ? (
              <>
                <b className="num">{upcoming.length}</b>{" "}
                {plural(upcoming.length, "событие", "события", "событий")} на ближайшую
                неделю
                {nextEvent && <> · ближайшее — {formatNearest(nextEvent.start_datetime)}</>}
              </>
            ) : (
              "На ближайшую неделю событий нет"
            )}
          </div>
        </div>
        <div className="right">
          <div className="seg">
            <button
              type="button"
              className={clsx(view === "month" && "active")}
              onClick={() => setView("month")}
            >
              Месяц
            </button>
            <button
              type="button"
              className={clsx(view === "week" && "active")}
              onClick={() => setView("week")}
            >
              7 дней
            </button>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ flex: 1 }}>
        <div className="cal-bar">
          <span className="mon">
            {month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
          </span>
          <div className="nav">
            <button
              className="cal-nav-btn"
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <svg
                className="i"
                style={{ width: 16, height: 16 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="cal-nav-btn"
              type="button"
              aria-label="Следующий месяц"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <svg
                className="i"
                style={{ width: 16, height: 16 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="cal-legend">
          <span className="lg">
            <span className="sw review" />
            Ревью блока
          </span>
          <span className="lg">
            <span className="sw mock" />
            Mock-собес
          </span>
          <span className="lg">
            <span className="sw real" />
            Real-собес
          </span>
          <span className="lg">
            <span className="sw tech" />
            Финальная техничка
          </span>
          <span className="lg">
            <span className="sw roast" />
            Финальная прожарка
          </span>
          <span className="lg">
            <span className="sw custom" />
            Другое
          </span>
        </div>

        {eventsQ.isLoading ? (
          <div className="flex items-center justify-center py-20 flex-col gap-3">
            <Spinner size={28} />
            <div className="caption">Загрузка календаря</div>
          </div>
        ) : eventsQ.isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="text-[14px] font-semibold text-ink">
              Не удалось загрузить события
            </div>
            <div className="text-[13px] text-text-3 max-w-xs">
              Проверьте соединение и попробуйте ещё раз.
            </div>
            <button className="btn btn-sm" onClick={() => eventsQ.refetch()}>
              Повторить
            </button>
          </div>
        ) : view === "month" ? (
          /* ===== MONTH VIEW ===== */
          <div>
            <div className="cal">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="dow">
                  {d}
                </div>
              ))}
              {grid.map(({ date, inMonth }, i) => {
                const k = isoDay(date);
                const dayEvents = byDay.get(k) ?? [];
                const isToday = isoDay(new Date()) === k;
                return (
                  <div
                    key={i}
                    className={clsx("day", !inMonth && "out", isToday && "today")}
                  >
                    <span className="dn">{date.getDate()}</span>
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={clsx("evt", TYPE_CLASS[ev.type])}
                        title={`${formatTime(ev.start_datetime)} ${ev.title}`}
                      >
                        {formatTime(ev.start_datetime)} {ev.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-text-3 font-mono">
                        +{dayEvents.length - 3} ещё
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ===== WEEK / AGENDA VIEW ===== */
          <div>
            {agendaGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <div className="text-[14px] font-semibold text-ink">
                  На ближайшую неделю событий нет
                </div>
                <div className="text-[13px] text-text-3 max-w-sm">
                  События обучения создаёт ваш Buddy — здесь появятся mock-собеседования,
                  ревью блоков и финальные проверки.
                </div>
              </div>
            ) : (
              agendaGroups.map((g) => (
                <div className="ag-group" key={g.key}>
                  <div className="agh">
                    {g.relLabel && <span className="tdy">{g.relLabel}</span>}
                    {g.relLabel ? " · " : ""}
                    {g.dateLabel}
                  </div>
                  {g.items.map((ev) => (
                    <div className={clsx("ag-item", TYPE_CLASS[ev.type])} key={ev.id}>
                      <div className="ag-time">{formatTime(ev.start_datetime)}</div>
                      <div>
                        <div className="ag-tt">{ev.title || TYPE_TITLE[ev.type]}</div>
                        {ev.description && <div className="ag-ds">{ev.description}</div>}
                      </div>
                      <span className={clsx("ag-tag", TYPE_CLASS[ev.type])}>
                        {TYPE_TAG[ev.type]}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- helpers ----------

function buildMonth(month: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const dayOfWeek = (first.getDay() + 6) % 7; // Пн = 0
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatNearest(iso: string): string {
  const d = new Date(iso);
  const today = isoDay(new Date());
  const tomorrow = isoDay(new Date(Date.now() + 86400 * 1000));
  const day = isoDay(d);
  const time = formatTime(iso);
  if (day === today) return `сегодня в ${time}`;
  if (day === tomorrow) return `завтра в ${time}`;
  return `${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" })} в ${time}`;
}

interface AgendaGroup {
  key: string;
  relLabel: string | null;
  dateLabel: string;
  items: CalendarEvent[];
}

function groupAgenda(items: CalendarEvent[]): AgendaGroup[] {
  const map = new Map<string, CalendarEvent[]>();
  items.forEach((e) => {
    const k = isoDay(new Date(e.start_datetime));
    const arr = map.get(k) ?? [];
    arr.push(e);
    map.set(k, arr);
  });
  const today = isoDay(new Date());
  const tomorrow = isoDay(new Date(Date.now() + 86400 * 1000));
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, evs]) => {
      const d = new Date(`${k}T00:00:00`);
      return {
        key: k,
        relLabel: k === today ? "Сегодня" : k === tomorrow ? "Завтра" : null,
        dateLabel: d.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "long",
          weekday: "long",
        }),
        items: evs,
      };
    });
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
