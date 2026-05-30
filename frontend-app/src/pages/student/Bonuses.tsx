import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { convertBonus, createOneOnOne, myBonuses, myOneOnOne, myTransactions } from "@/api/bonus";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { BonusCoin } from "@/components/BonusCoin";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { formatDateTime } from "@/lib/format";
import type { BonusOpType } from "@/api/types";
import { extractError } from "@/api/client";

const OP_LABEL: Record<BonusOpType, { label: string; sign: "+" | "-" | "" }> = {
  achievement_reward: { label: "Достижение", sign: "+" },
  discount_conversion: { label: "Конвертация в скидку", sign: "-" },
  one_on_one_spend: { label: "Заявка 1×1", sign: "-" },
  manual_adjustment: { label: "Ручная корректировка", sign: "" },
  refund: { label: "Возврат", sign: "+" },
};

export function StudentBonuses() {
  const queryClient = useQueryClient();
  const overviewQ = useQuery({ queryKey: ["bonuses"], queryFn: myBonuses });
  const txQ = useQuery({ queryKey: ["bonus-tx"], queryFn: myTransactions });
  const oneOnOneQ = useQuery({ queryKey: ["one-on-one"], queryFn: myOneOnOne });
  const [convertOpen, setConvertOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const convertMut = useMutation({
    mutationFn: (amount: number) => convertBonus(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["bonus-tx"] });
      setConvertOpen(false);
      setConvertAmount("");
      setError(null);
    },
    onError: (e) => {
      const err = extractError(e);
      setError(
        err.code === "insufficient_funds"
          ? "Недостаточно бонусов"
          : err.code === "discount_capped"
            ? "Скидка уже достигла потолка 15%"
            : err.code === "invalid_amount"
              ? "Неверная сумма (кратно 100)"
              : "Не удалось конвертировать",
      );
    },
  });

  const requestMut = useMutation({
    mutationFn: () => createOneOnOne(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["one-on-one"] });
      setRequestOpen(false);
    },
    onError: () => {
      setError("Не удалось создать заявку");
    },
  });

  if (overviewQ.isLoading || txQ.isLoading || oneOnOneQ.isLoading) return <PageLoader />;

  const ov = overviewQ.data!;
  const tx = txQ.data ?? [];
  const oo = oneOnOneQ.data ?? [];
  const cap = ov.discount_cap ?? 15;
  const pct = ov.discount_percent ?? 0;
  const capped = pct >= cap;

  return (
    <div>
      <PageHeader
        eyebrow="Экономика"
        title="Бонусы и скидка"
        description="Бонусы начисляются за пройденные материалы и достижения. Конвертируйте их в скидку постоплаты или заявку 1×1."
      />

      {/* Top dashboard: balance + discount + 1x1 */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* Balance */}
        <div
          className="card p-6 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--secondary) 6%, var(--surface)), var(--surface))",
          }}
        >
          <div
            className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(closest-side, rgba(255,61,154,0.22), transparent 70%)",
            }}
          />
          <div className="caption mb-3">Текущий баланс</div>
          <div className="flex items-center gap-3">
            <BonusCoin size={42} variant="secondary" />
            <div
              className="font-mono font-bold text-secondary text-[44px] -tracking-[0.02em] leading-none"
              style={{ textShadow: "0 0 24px rgba(255,61,154,0.5)" }}
            >
              {ov.balance}
            </div>
          </div>
          <div className="caption mt-4 text-text-2 normal-case font-sans tracking-normal">
            Бонусы копятся без ограничений и не сгорают.
          </div>
        </div>

        {/* Discount conversion */}
        <div className="card p-6">
          <div className="caption mb-3">Текущая скидка постоплаты</div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-mono font-bold text-primary text-[44px] -tracking-[0.02em]">
              {pct.toFixed(0)}%
            </span>
            <span className="text-text-3 font-mono text-[13px]">/ {cap}%</span>
          </div>
          {/* discount scale with ticks */}
          <div className="relative h-2.5 rounded-full bg-bg border border-border overflow-hidden mb-2">
            <div
              className="absolute inset-y-0 left-0 pbar-fill"
              style={{ width: `${(pct / cap) * 100}%` }}
            />
            {[...Array(cap)].map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border-bright"
                style={{ left: `${((i + 1) / cap) * 100}%` }}
              />
            ))}
          </div>
          <div className="text-[11px] text-text-3 font-mono uppercase tracking-wider mb-4">
            100 бонусов = 1% скидки
          </div>
          <button
            className="btn btn-primary w-full"
            disabled={capped || ov.balance < 100}
            onClick={() => setConvertOpen(true)}
          >
            {capped ? "Достигнут потолок 15%" : "Конвертировать в скидку"}
          </button>
        </div>

        {/* 1x1 */}
        <div className="card p-6">
          <div className="caption mb-3">Заявка 1×1 с ментором</div>
          <div className="font-mono font-bold text-[44px] -tracking-[0.02em] text-text leading-none">
            1000
          </div>
          <div className="text-[12px] text-text-2 mt-1">бонусов = 1 заявка</div>
          <div className="text-[11px] text-text-3 font-mono uppercase tracking-wider mt-3 mb-4">
            При создании бонусы не списываются — только при approve Admin
          </div>
          <button
            className="btn btn-secondary w-full"
            disabled={ov.balance < 1000}
            onClick={() => setRequestOpen(true)}
          >
            {ov.balance < 1000 ? `Нужно ${1000 - ov.balance} ещё` : "Создать заявку"}
          </button>
        </div>
      </div>

      {/* 1x1 requests list */}
      <section className="mb-10">
        <SectionHead title="Мои заявки 1×1" count={oo.length} />
        {oo.length === 0 ? (
          <div className="card p-6 text-text-3 text-[13px]">Заявок пока нет.</div>
        ) : (
          <div className="space-y-2.5">
            {oo.map((r) => (
              <div key={r.id} className="elevated p-4 flex items-center justify-between">
                <div>
                  <div className="caption mb-1">Заявка</div>
                  <div className="font-mono text-[12px] text-text-2">{r.id.slice(0, 8)}…</div>
                  <div className="text-[11px] text-text-3 mt-1 font-mono">
                    Создана: {formatDateTime(r.created_at)}
                    {r.processed_at && ` · Обработана: ${formatDateTime(r.processed_at)}`}
                  </div>
                </div>
                <StatusBadge status={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : r.status === "completed" ? "completed" : r.status === "cancelled" ? "cancelled" : "pending"} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transactions */}
      <section>
        <SectionHead title="История операций" count={tx.length} />
        {tx.length === 0 ? (
          <div className="card p-6 text-text-3 text-[13px]">История пуста.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] text-text-3 font-mono uppercase tracking-wider px-5 py-3">Дата</th>
                  <th className="text-left text-[11px] text-text-3 font-mono uppercase tracking-wider px-5 py-3">Тип</th>
                  <th className="text-left text-[11px] text-text-3 font-mono uppercase tracking-wider px-5 py-3">Причина</th>
                  <th className="text-right text-[11px] text-text-3 font-mono uppercase tracking-wider px-5 py-3">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((t) => {
                  const meta = OP_LABEL[t.type];
                  const amount = Math.abs(t.amount);
                  const sign = t.amount > 0 ? "+" : t.amount < 0 ? "-" : "";
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-elevated/40">
                      <td className="px-5 py-3 font-mono text-[12px] text-text-2 whitespace-nowrap">
                        {formatDateTime(t.created_at)}
                      </td>
                      <td className="px-5 py-3 text-[13px]">{meta?.label ?? t.type}</td>
                      <td className="px-5 py-3 text-[13px] text-text-2">{t.reason ?? "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`font-mono font-bold text-[14px] ${
                            t.amount > 0 ? "text-success" : t.amount < 0 ? "text-danger" : "text-text-2"
                          }`}
                        >
                          {sign}
                          {amount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Convert modal */}
      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Конвертация в скидку">
        <p className="text-text-2 text-[13px] mb-4 leading-snug">
          Введите количество бонусов (кратно 100). 100 бонусов = 1% скидки. Максимум —{" "}
          {Math.max(0, (cap - pct) * 100)} бонусов до потолка {cap}%.
        </p>
        <input
          className="input mb-2"
          type="number"
          step={100}
          min={100}
          max={Math.min(ov.balance, (cap - pct) * 100)}
          placeholder="300"
          value={convertAmount}
          onChange={(e) => setConvertAmount(e.target.value)}
        />
        <div className="text-[12px] text-text-3 font-mono mb-4">
          = {Math.floor(Number(convertAmount || 0) / 100)}% скидки
        </div>
        {error && (
          <div className="text-[12px] px-3 py-2 rounded-md border border-danger/40 bg-danger/10 text-danger mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button className="btn" onClick={() => setConvertOpen(false)}>Отмена</button>
          <button
            className="btn btn-primary"
            disabled={convertMut.isPending || !convertAmount || Number(convertAmount) < 100}
            onClick={() => convertMut.mutate(Number(convertAmount))}
          >
            Конвертировать
          </button>
        </div>
      </Modal>

      {/* 1x1 modal */}
      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Заявка на 1×1 с ментором">
        <p className="text-text-2 text-[13px] mb-4 leading-snug">
          1000 бонусов = одна заявка. Бонусы не списываются сейчас — это произойдёт только когда Admin одобрит заявку.
          Если у вас будет меньше 1000 бонусов на момент approve, заявка не подтвердится.
        </p>
        <div className="text-[12px] text-text-3 font-mono mb-4">
          Ваш баланс: <span className="text-text font-bold">{ov.balance}</span>
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn" onClick={() => setRequestOpen(false)}>Отмена</button>
          <button
            className="btn btn-secondary"
            disabled={requestMut.isPending}
            onClick={() => requestMut.mutate()}
          >
            Создать заявку
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-3 mb-5">
      <h2 className="text-[18px] font-semibold -tracking-tight">{title}</h2>
      {count !== undefined && (
        <span className="caption font-mono">{count}</span>
      )}
    </div>
  );
}
