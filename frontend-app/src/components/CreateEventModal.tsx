import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createEvent } from "@/api/calendar";
import { Modal } from "@/components/Modal";

export function CreateEventModal({
  open,
  onClose,
  defaultStudentId,
  studentChoices,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
  studentChoices?: { id: string; display_name: string }[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<
    | "mock_interview"
    | "real_interview"
    | "block_review"
    | "final_technical"
    | "final_roast"
    | "custom"
  >("mock_interview");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [reminder, setReminder] = useState(true);
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");

  const mut = useMutation({
    mutationFn: () =>
      createEvent({
        title,
        type,
        start_datetime: new Date(start).toISOString(),
        end_datetime: end ? new Date(end).toISOString() : undefined,
        description: description || undefined,
        reminder_enabled: reminder,
        student_id: studentId || undefined,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
      setTitle("");
      setStart("");
      setEnd("");
      setDescription("");
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Новое событие" width={580}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Название</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Тип</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="mock_interview">Mock</option>
            <option value="real_interview">Real-разбор</option>
            <option value="block_review">Ревью блока</option>
            <option value="final_technical">Финал · Техничка</option>
            <option value="final_roast">Финал · Прожарка</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {studentChoices && (
          <div>
            <label className="caption mb-1.5 block">Ученик</label>
            <select
              className="select"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">— не выбран —</option>
              {studentChoices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="caption mb-1.5 block">Начало</label>
          <input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="caption mb-1.5 block">Конец (опц.)</label>
          <input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="caption mb-1.5 block">Описание</label>
          <textarea
            className="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
      <div className="flex gap-3 justify-end mt-5">
        <button className="btn" onClick={onClose}>
          Отмена
        </button>
        <button
          className="btn btn-primary"
          disabled={mut.isPending || !title || !start}
          onClick={() => mut.mutate()}
        >
          Создать
        </button>
      </div>
    </Modal>
  );
}
