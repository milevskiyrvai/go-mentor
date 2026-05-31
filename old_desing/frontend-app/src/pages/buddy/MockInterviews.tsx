import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyStudents } from "@/api/users";
import { interviewsCatalog } from "@/api/interviews";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { Avatar } from "@/components/Sidebar";

/**
 * Buddy-сводный экран: даёт ссылки на отдельных учеников где можно
 * назначать mock + видит общий каталог real-собеседований.
 */
export function BuddyMockInterviews() {
  const studentsQ = useQuery({ queryKey: ["buddy-students"], queryFn: listMyStudents });
  const realQ = useQuery({ queryKey: ["interviews-catalog-all"], queryFn: () => interviewsCatalog() });

  if (studentsQ.isLoading || realQ.isLoading) return <PageLoader />;
  const students = studentsQ.data ?? [];
  const studentIds = new Set(students.map((s) => s.id));
  const realByMyStudents = (realQ.data ?? []).filter((iv) => studentIds.has(iv.student_id));

  return (
    <div>
      <PageHeader
        eyebrow="Buddy"
        title="Mock-собеседования"
        description="Назначайте mock-собеседования прямо из карточки ученика. Здесь — обзор последних real-разборов ваших учеников."
      />

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-4 -tracking-tight">Назначить mock</h2>
        <div className="grid grid-cols-2 gap-3">
          {students.map((s) => (
            <a
              key={s.id}
              href={`/buddy/students/${s.id}`}
              className="elevated p-4 flex items-center gap-3 hover:border-border-bright"
            >
              <Avatar name={s.display_name} url={s.avatar_url} role="student" size={42} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14px] truncate">{s.display_name}</div>
                <div className="text-[12px] text-text-2">Прогресс {s.overall_percent}%</div>
              </div>
              <span className="text-primary font-mono">→</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-semibold mb-4 -tracking-tight">
          Real-разборы моих учеников ({realByMyStudents.length})
        </h2>
        <div className="space-y-3">
          {realByMyStudents.length === 0 && (
            <div className="card p-6 text-text-3 text-[13px]">Real-разборов пока нет.</div>
          )}
          {realByMyStudents.map((iv) => {
            const s = students.find((x) => x.id === iv.student_id);
            return (
              <div key={iv.id} className="elevated p-4 flex items-center gap-4">
                {s && <Avatar name={s.display_name} url={s.avatar_url} role="student" size={36} />}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold">
                    {iv.company || "Компания не указана"}
                    {iv.position && <span className="text-text-2 font-normal"> · {iv.position}</span>}
                  </div>
                  {s && <div className="text-[12px] text-text-2 mt-0.5">{s.display_name}</div>}
                </div>
                <div className="caption">{iv.result || "—"}</div>
                {iv.url && (
                  <a href={iv.url} target="_blank" rel="noreferrer" className="btn btn-sm">
                    Открыть ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
