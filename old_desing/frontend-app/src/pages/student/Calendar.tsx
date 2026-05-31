import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEvents } from "@/api/calendar";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { CalendarGrid } from "@/components/CalendarGrid";
import { formatDateTime } from "@/lib/format";

export function StudentCalendar() {
  const [month, setMonth] = useState(new Date());
  const range = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 2, 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [month]);

  const eventsQ = useQuery({
    queryKey: ["my-calendar", month.getFullYear(), month.getMonth()],
    queryFn: () => listEvents({ from: range.from, to: range.to }),
  });

  if (eventsQ.isLoading) return <PageLoader />;

  const events = eventsQ.data ?? [];
  // upcoming 7 days
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 86400 * 1000);
  const upcoming = events
    .filter((e) => {
      const d = new Date(e.start_datetime);
      return d >= now && d <= sevenDays;
    })
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  return (
    <div>
      <PageHeader
        eyebrow="Календарь"
        title="События обучения"
        description="События создаёт ваш Buddy. Здесь вы видите ближайшие mock-собеседования, ревью блоков и финальные проверки."
      />

      <div className="grid grid-cols-[1fr_360px] gap-6">
        <CalendarGrid
          events={events}
          month={month}
          onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        />

        <aside className="card p-5">
          <div className="caption mb-3">Ближайшие 7 дней</div>
          {upcoming.length === 0 ? (
            <div className="text-text-3 text-[13px] py-6 text-center">
              На ближайшую неделю событий нет.
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((e) => (
                <div key={e.id} className="elevated p-3.5">
                  <div className="caption mb-1">{typeLabel(e.type)}</div>
                  <div className="text-[14px] font-semibold leading-snug">{e.title}</div>
                  <div className="text-[11px] text-text-3 font-mono mt-1">
                    {formatDateTime(e.start_datetime)}
                  </div>
                  {e.description && (
                    <div className="text-[12px] text-text-2 mt-2 leading-snug">{e.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function typeLabel(t: string): string {
  switch (t) {
    case "mock_interview":
      return "Mock";
    case "real_interview":
      return "Real";
    case "block_review":
      return "Ревью блока";
    case "final_technical":
      return "Финал · Техничка";
    case "final_roast":
      return "Финал · Прожарка";
    case "custom":
      return "Событие";
    default:
      return t;
  }
}
