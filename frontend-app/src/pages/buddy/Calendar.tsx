import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listEvents } from "@/api/calendar";
import { listMyStudents } from "@/api/users";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { CalendarGrid } from "@/components/CalendarGrid";
import { CreateEventModal } from "@/pages/buddy/StudentCard";
import { formatDateTime } from "@/lib/format";
import type { CalendarEventType } from "@/api/types";

const TYPE_LABELS: Record<CalendarEventType, string> = {
  mock_interview: "Mock",
  real_interview: "Real",
  block_review: "Ревью",
  final_technical: "Финал · Техничка",
  final_roast: "Финал · Прожарка",
  custom: "Custom",
};

export function BuddyCalendar() {
  const [month, setMonth] = useState(new Date());
  const [studentId, setStudentId] = useState<string>("");
  const [type, setType] = useState<CalendarEventType | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const studentsQ = useQuery({ queryKey: ["buddy-students"], queryFn: listMyStudents });

  const range = useMemo(() => {
    const s = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const e = new Date(month.getFullYear(), month.getMonth() + 2, 1);
    return { from: s.toISOString(), to: e.toISOString() };
  }, [month]);

  const eventsQ = useQuery({
    queryKey: ["buddy-calendar", studentId, type, month.getFullYear(), month.getMonth()],
    queryFn: () =>
      listEvents({
        from: range.from,
        to: range.to,
        student_id: studentId || undefined,
        type: (type || undefined) as CalendarEventType | undefined,
      }),
  });

  if (eventsQ.isLoading) return <PageLoader />;

  const events = eventsQ.data ?? [];
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400 * 1000);
  const upcoming = events
    .filter((e) => {
      const d = new Date(e.start_datetime);
      return d >= now && d <= week;
    })
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  return (
    <div>
      <PageHeader
        eyebrow="Календарь"
        title="События всех учеников"
        description="Планируйте mock-собеседования, ревью блоков и финалки. Фильтруйте по ученику, типу и дате."
        right={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            + Создать событие
          </button>
        }
      />

      <div className="card p-4 mb-5 flex items-center gap-3 flex-wrap">
        <span className="caption">Фильтры</span>
        <select className="select !w-auto" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Все ученики</option>
          {(studentsQ.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name}
            </option>
          ))}
        </select>
        <select className="select !w-auto" value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="">Все типы</option>
          {(Object.keys(TYPE_LABELS) as CalendarEventType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

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
                  <div className="caption mb-1">{TYPE_LABELS[e.type]}</div>
                  <div className="text-[14px] font-semibold leading-snug">{e.title}</div>
                  <div className="text-[11px] text-text-3 font-mono mt-1">
                    {formatDateTime(e.start_datetime)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        studentChoices={studentsQ.data ?? []}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["buddy-calendar"] })}
      />
    </div>
  );
}
