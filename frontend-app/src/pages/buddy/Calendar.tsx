import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listEvents, updateEvent, deleteEvent } from "@/api/calendar";
import { listMyStudents } from "@/api/users";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, Spinner } from "@/components/Spinner";
import { CalendarGrid } from "@/components/CalendarGrid";
import { Modal } from "@/components/Modal";
import { CreateEventModal } from "@/components/CreateEventModal";
import { formatDateTime } from "@/lib/format";
import type { CalendarEvent, CalendarEventType } from "@/api/types";
import clsx from "clsx";

// Подписи типов и цвета — повторяют легенду макета buddy-calendar.html
const TYPE_LABELS: Record<CalendarEventType, string> = {
  block_review: "Ревью блока",
  mock_interview: "Mock-собес",
  real_interview: "Real-собес",
  final_technical: "Финальная техничка",
  final_roast: "Финальная прожарка",
  custom: "Другое",
};

const TYPE_SHORT: Record<CalendarEventType, string> = {
  block_review: "Ревью",
  mock_interview: "Mock",
  real_interview: "Real",
  final_technical: "Техничка",
  final_roast: "Прожарка",
  custom: "Другое",
};

const TYPE_COLOR: Record<CalendarEventType, string> = {
  block_review: "var(--warning)",
  mock_interview: "var(--secondary)",
  real_interview: "var(--primary)",
  final_technical: "#5F8268",
  final_roast: "#AF5840",
  custom: "var(--text-2)",
};

// Порядок легенды по макету (real опущен в легенде, но поддержан фильтром API)
const LEGEND_ORDER: CalendarEventType[] = [
  "block_review",
  "mock_interview",
  "final_technical",
  "final_roast",
  "custom",
];

type View = "month" | "week";

export function BuddyCalendar() {
  const [month, setMonth] = useState(() => new Date());
  const [view, setView] = useState<View>("month");
  const [studentId, setStudentId] = useState<string>("");
  const [type, setType] = useState<CalendarEventType | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const queryClient = useQueryClient();

  const studentsQ = useQuery({ queryKey: ["buddy-students"], queryFn: listMyStudents });

  const range = useMemo(() => {
    const s = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const e = new Date(month.getFullYear(), month.getMonth() + 2, 1);
    return { from: s.toISOString(), to: e.toISOString() };
  }, [month]);

  const eventsQ = useQuery({
    queryKey: [
      "buddy-calendar",
      studentId,
      type,
      month.getFullYear(),
      month.getMonth(),
    ],
    queryFn: () =>
      listEvents({
        from: range.from,
        to: range.to,
        student_id: studentId || undefined,
        type: (type || undefined) as CalendarEventType | undefined,
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["buddy-calendar"] });

  const studentName = (id?: string) =>
    (studentsQ.data ?? []).find((s) => s.id === id)?.display_name;

  const events = eventsQ.data ?? [];
  const hasFilters = !!studentId || !!type;

  // Месяц для шапки сетки (на русском)
  const monthTitle = month.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        eyebrow="Календарь"
        title="События всех учеников"
        description="Планируйте ревью блоков, mock-собеседования и финалки. Фильтруйте по ученику, типу и периоду."
        right={
          <div className="flex items-center gap-3">
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
            <button
              className="btn btn-secondary"
              onClick={() => setCreateOpen(true)}
            >
              + Событие
            </button>
          </div>
        }
      />

      <div className="card p-5">
        {/* Шапка месяца + навигация */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold capitalize -tracking-tight">
            {monthTitle}
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm"
              aria-label="Предыдущий месяц"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              ←
            </button>
            <button
              className="btn btn-sm"
              aria-label="Следующий месяц"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              →
            </button>
          </div>
        </div>

        {/* Фильтры (§18.7) */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <span className="caption">Фильтры</span>
          <select
            className="select !w-auto"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={studentsQ.isLoading}
          >
            <option value="">Все ученики</option>
            {(studentsQ.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
          <select
            className="select !w-auto"
            value={type}
            onChange={(e) => setType(e.target.value as CalendarEventType | "")}
          >
            <option value="">Все типы</option>
            {LEGEND_ORDER.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              className="btn btn-sm"
              onClick={() => {
                setStudentId("");
                setType("");
              }}
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Легенда */}
        <div className="flex items-center gap-4 flex-wrap mb-5">
          {LEGEND_ORDER.map((t) => (
            <span key={t} className="flex items-center gap-1.5 caption normal-case tracking-normal font-sans text-text-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: TYPE_COLOR[t] }}
              />
              {TYPE_LABELS[t]}
            </span>
          ))}
        </div>

        {/* Контент: loading / error / данные */}
        {eventsQ.isLoading ? (
          <div className="min-h-[40vh] grid place-items-center">
            <PageLoader />
          </div>
        ) : eventsQ.isError ? (
          <div className="card p-8 text-center">
            <div className="text-[14px] font-semibold mb-1">
              Не удалось загрузить календарь
            </div>
            <div className="text-text-3 text-[13px] mb-4">
              Проверьте соединение и попробуйте ещё раз.
            </div>
            <button className="btn btn-sm" onClick={() => eventsQ.refetch()}>
              Повторить
            </button>
          </div>
        ) : view === "month" ? (
          <CalendarGrid
            events={events}
            month={month}
            onPrev={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            onNext={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            onEventClick={(ev) => setEditEvent(ev)}
          />
        ) : (
          <AgendaView
            events={events}
            studentName={studentName}
            onEventClick={(ev) => setEditEvent(ev)}
          />
        )}
      </div>

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        studentChoices={studentsQ.data ?? []}
        defaultStudentId={studentId || undefined}
        onCreated={invalidate}
      />

      <EditEventModal
        event={editEvent}
        onClose={() => setEditEvent(null)}
        onChanged={invalidate}
      />
    </div>
  );
}

// ===== Agenda / 7 дней (вид «week» из макета) =====

function AgendaView({
  events,
  studentName,
  onEventClick,
}: {
  events: CalendarEvent[];
  studentName: (id?: string) => string | undefined;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 86400 * 1000);

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => {
          const d = new Date(e.start_datetime);
          return d >= startOfDay(now) && d <= horizon;
        })
        .sort(
          (a, b) =>
            new Date(a.start_datetime).getTime() -
            new Date(b.start_datetime).getTime(),
        ),
    [events],
  );

  if (upcoming.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-[14px] font-semibold mb-1">
          На ближайшие 7 дней событий нет
        </div>
        <div className="text-text-3 text-[13px]">
          Создайте событие или смените фильтры.
        </div>
      </div>
    );
  }

  // Группировка по дню
  const groups: { key: string; date: Date; items: CalendarEvent[] }[] = [];
  for (const ev of upcoming) {
    const d = new Date(ev.start_datetime);
    const key = isoDay(d);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, date: d, items: [] };
      groups.push(g);
    }
    g.items.push(ev);
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="caption mb-3">{dayHeading(g.date, now)}</div>
          <div className="space-y-2.5">
            {g.items.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="elevated p-4 flex items-center gap-4 w-full text-left transition-all hover:border-border-bright"
              >
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ background: TYPE_COLOR[ev.type] }}
                />
                <div className="font-mono text-[14px] font-semibold w-14 shrink-0">
                  {new Date(ev.start_datetime).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold leading-snug truncate">
                    {ev.title}
                  </div>
                  <div className="text-[12px] text-text-2 truncate">
                    {studentName(ev.student_id) ?? "Без ученика"}
                    {ev.description && ` · ${ev.description}`}
                  </div>
                </div>
                <span
                  className="pill shrink-0"
                  style={{
                    color: TYPE_COLOR[ev.type],
                    borderColor: `color-mix(in oklab, ${TYPE_COLOR[ev.type]} 40%, transparent)`,
                  }}
                >
                  {TYPE_SHORT[ev.type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Редактирование / удаление события (§18.2) =====

function EditEventModal({
  event,
  onClose,
  onChanged,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CalendarEventType>("mock_interview");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [reminder, setReminder] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  // ключ для повторной инициализации формы при смене события
  const [seeded, setSeeded] = useState<string | null>(null);

  if (event && seeded !== event.id) {
    setSeeded(event.id);
    setTitle(event.title);
    setType(event.type);
    setStart(toLocalInput(event.start_datetime));
    setEnd(event.end_datetime ? toLocalInput(event.end_datetime) : "");
    setDescription(event.description ?? "");
    setReminder(event.reminder_enabled);
    setConfirmDel(false);
  }

  const saveMut = useMutation({
    mutationFn: () =>
      updateEvent(event!.id, {
        title,
        type,
        start_datetime: new Date(start).toISOString(),
        end_datetime: end ? new Date(end).toISOString() : undefined,
        description: description || undefined,
        reminder_enabled: reminder,
      }),
    onSuccess: () => {
      onChanged();
      handleClose();
    },
  });

  const delMut = useMutation({
    mutationFn: () => deleteEvent(event!.id),
    onSuccess: () => {
      onChanged();
      handleClose();
    },
  });

  const handleClose = () => {
    setSeeded(null);
    onClose();
  };

  if (!event) return null;

  return (
    <Modal open={true} onClose={handleClose} title="Редактировать событие" width={580}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Название</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="caption mb-1.5 block">Тип события</label>
          <select
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value as CalendarEventType)}
          >
            <option value="block_review">Ревью блока</option>
            <option value="mock_interview">Mock-собеседование</option>
            <option value="real_interview">Real-собеседование</option>
            <option value="final_technical">Финальная техничка</option>
            <option value="final_roast">Финальная прожарка</option>
            <option value="custom">Другое</option>
          </select>
        </div>
        <div>
          <label className="caption mb-1.5 block">Начало</label>
          <input
            type="datetime-local"
            className="input"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <label className="caption mb-1.5 block">Конец (опц.)</label>
          <input
            type="datetime-local"
            className="input"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Описание</label>
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Тема встречи, ссылка на звонок…"
          />
        </div>
        <label className="col-span-2 flex items-center gap-2 caption normal-case font-sans tracking-normal text-text-2">
          <input
            type="checkbox"
            checked={reminder}
            onChange={(e) => setReminder(e.target.checked)}
          />
          Напоминание
        </label>
      </div>

      <div className="flex items-center justify-between mt-5">
        {confirmDel ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-text-2">Удалить?</span>
            <button
              className="btn btn-sm btn-danger"
              disabled={delMut.isPending}
              onClick={() => delMut.mutate()}
            >
              {delMut.isPending ? <Spinner size={14} /> : "Да, удалить"}
            </button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>
              Нет
            </button>
          </div>
        ) : (
          <button
            className="btn btn-sm text-danger"
            onClick={() => setConfirmDel(true)}
          >
            Удалить
          </button>
        )}
        <div className="flex gap-3">
          <button className="btn" onClick={handleClose}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            disabled={saveMut.isPending || !title || !start}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? <Spinner size={16} /> : "Сохранить"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ===== helpers =====

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayHeading(d: Date, now: Date): string {
  const diff = Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000,
  );
  const long = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  if (diff === 0) return `Сегодня · ${long}`;
  if (diff === 1) return `Завтра · ${long}`;
  return long;
}

// ISO -> значение для <input type="datetime-local"> (локальное время)
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
