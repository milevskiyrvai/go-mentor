import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  convertBonus,
  createOneOnOne,
  myBonuses,
  myOneOnOne,
  myTransactions,
} from "@/api/bonus";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { extractError } from "@/api/client";
import type { BonusOpType, BonusTransaction, OneOnOneRequest } from "@/api/types";

const ONE_ON_ONE_COST = 1000;
const STEP = 100; // 100 бонусов = 1% скидки

/** Метаданные операции: подпись, направление (credit/debit) и иконка. */
const OP_META: Record<
  BonusOpType,
  { title: string; desc: string; dir: "credit" | "debit"; icon: "ach" | "minus" | "plus" | "arrow" }
> = {
  achievement_reward: { title: "Начисление за достижение", desc: "Достижение", dir: "credit", icon: "ach" },
  discount_conversion: { title: "Конвертация в скидку", desc: "Скидка постоплаты", dir: "debit", icon: "arrow" },
  one_on_one_spend: { title: "Заявка 1×1 с ментором", desc: "Списание за заявку", dir: "debit", icon: "arrow" },
  manual_adjustment: { title: "Ручная корректировка", desc: "Администратор", dir: "credit", icon: "plus" },
  refund: { title: "Возврат бонусов", desc: "Бонусы возвращены", dir: "credit", icon: "plus" },
};

function shortDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  } catch {
    return "";
  }
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function comma(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

/** Иконки операций (повторяют SVG из макета). */
function TxnIcon({ kind }: { kind: "ach" | "minus" | "plus" | "arrow" }) {
  if (kind === "ach")
    return (
      <svg className="i" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <circle cx="12" cy="9" r="6" />
        <path d="M9 14l-2 7 5-3 5 3-2-7" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "plus")
    return (
      <svg className="i" style={{ width: 17, height: 17 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    );
  // arrow (debit)
  return (
    <svg className="i" style={{ width: 17, height: 17 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14M13 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StudentBonuses() {
  const queryClient = useQueryClient();
  const overviewQ = useQuery({ queryKey: ["bonuses"], queryFn: myBonuses });
  const txQ = useQuery({ queryKey: ["bonus-tx"], queryFn: myTransactions });
  const oneOnOneQ = useQuery({ queryKey: ["one-on-one"], queryFn: myOneOnOne });

  const [convertOpen, setConvertOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [convAmount, setConvAmount] = useState(STEP);
  const [error, setError] = useState<string | null>(null);

  const ov = overviewQ.data;
  const cap = ov?.discount_cap ?? 15;
  const pct = ov?.discount_percent ?? 0;
  const balance = ov?.balance ?? 0;
  const capped = pct >= cap;

  // Максимум для конвертации: ограничен и балансом, и оставшимся до потолка.
  const maxConvert = useMemo(() => {
    const byBalance = Math.floor(balance / STEP) * STEP;
    const byCap = Math.floor((cap - pct) * 100 / STEP) * STEP;
    return Math.max(0, Math.min(byBalance, byCap));
  }, [balance, cap, pct]);

  const convertMut = useMutation({
    mutationFn: (amount: number) => convertBonus(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["bonus-tx"] });
      setConvertOpen(false);
      setError(null);
    },
    onError: (e) => {
      const err = extractError(e);
      setError(
        err.code === "insufficient_funds"
          ? "Недостаточно бонусов"
          : err.code === "discount_capped"
            ? `Скидка уже достигла потолка ${cap}%`
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
      setError(null);
    },
    onError: () => setError("Не удалось создать заявку"),
  });

  // -------- состояния --------
  if (overviewQ.isLoading || txQ.isLoading || oneOnOneQ.isLoading) return <PageLoader />;

  if (overviewQ.isError || !ov) {
    return (
      <div>
        <PageHeader eyebrow="Экономика" title="Бонусы" />
        <div className="card card-pad text-center" style={{ color: "var(--danger)" }}>
          Не удалось загрузить баланс бонусов. Обновите страницу.
        </div>
      </div>
    );
  }

  const tx = txQ.data ?? [];
  const oo = oneOnOneQ.data ?? [];

  // Сводка по операциям (вместо плейсхолдеров макета — реальные числа).
  const totalEarned = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalConverted = tx
    .filter((t) => t.type === "discount_conversion")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const achievementsCount = tx.filter((t) => t.type === "achievement_reward").length;

  const oneOnOneAvailable = Math.floor(balance / ONE_ON_ONE_COST);

  // Превью конвертации для шкалы.
  const previewPct = Math.min(cap, pct + convAmount / 100);
  const ghostLeft = (pct / cap) * 100;
  const ghostWidth = ((previewPct - pct) / cap) * 100;

  const openConvert = () => {
    setConvAmount(Math.min(STEP, maxConvert || STEP));
    setError(null);
    setConvertOpen(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Экономика"
        title="Бонусы"
        description={
          <>
            Баланс <b className="num">{fmt(balance)}</b> бонусов · скидка постоплаты{" "}
            <b className="num">{comma(pct)}%</b> из {cap}%
          </>
        }
        right={
          capped ? (
            <span className="status-badge success">
              <span className="dot" />
              Скидка активна
            </span>
          ) : pct > 0 ? (
            <span className="status-badge success">
              <span className="dot" />
              Скидка активна
            </span>
          ) : (
            <span className="status-badge">
              <span className="dot" />
              Скидки пока нет
            </span>
          )
        }
      />

      {/* hero: баланс + конвертация */}
      <div className="bonus-hero" style={{ marginBottom: 22 }}>
        {/* баланс */}
        <div className="bcard bal">
          <div className="lbl">Баланс бонусов</div>
          <div className="bal-num">
            <span className="v num">{fmt(balance)}</span>
            <span className="u">бонусов</span>
          </div>
          <div className="bal-facts">
            <div className="f">
              <div className="k">Начислено за всё время</div>
              <div className="n num">{fmt(totalEarned)}</div>
            </div>
            <div className="f">
              <div className="k">Конвертировано в скидку</div>
              <div className="n num minus">{totalConverted > 0 ? `−${fmt(totalConverted)}` : "0"}</div>
            </div>
            <div className="f">
              <div className="k">Достижений получено</div>
              <div className="n num">{achievementsCount}</div>
            </div>
          </div>
        </div>

        {/* скидка постоплаты + конвертация */}
        <div className="bcard">
          <div className="lbl">Скидка постоплаты</div>
          <div className="disc-num">
            <span className="v num">
              {comma(pct)}
              <span style={{ fontSize: 26 }}>%</span>
            </span>
            <span className="u">из {cap}% максимум</span>
          </div>
          <div className="scale">
            <div className="track">
              <div className="fill" style={{ width: `${(pct / cap) * 100}%` }} />
            </div>
            <div className="ticks">
              <span>0%</span>
              <span>{Math.round(cap / 3)}%</span>
              <span>{Math.round((cap * 2) / 3)}%</span>
              <span>{cap}%</span>
            </div>
          </div>
          <div className="convert">
            {capped ? (
              <div className="readout" style={{ marginLeft: 0 }}>
                Скидка достигла потолка <b>{cap}%</b>
              </div>
            ) : maxConvert < STEP ? (
              <div className="readout" style={{ marginLeft: 0 }}>
                Нужно ещё бонусов для конвертации
              </div>
            ) : (
              <>
                <div className="readout">
                  100 бонусов = <b>1% скидки</b>
                </div>
                <button className="btn secondary conv-btn" type="button" onClick={openConvert}>
                  Конвертировать
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* две колонки: история + 1×1 */}
      <div className="cols c-2-1" style={{ alignItems: "start" }}>
        {/* история операций */}
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-head">
            <h3>История операций</h3>
            <span className="meta">{tx.length} операций</span>
          </div>
          {tx.length === 0 ? (
            <div className="text-text-3 text-[13px]" style={{ padding: "26px 2px" }}>
              Пока нет операций. Бонусы начисляются за достижения и пройденные материалы.
            </div>
          ) : (
            <div className="ledger">
              {tx.map((t) => (
                <LedgerRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* заявки 1×1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card card-pad">
            <div className="card-head">
              <h3>Заявка 1×1 с ментором</h3>
              <span className="meta">{fmt(ONE_ON_ONE_COST)} = 1 заявка</span>
            </div>
            <div className="req-cost">
              <div className="coin">1×1</div>
              <div>
                <div className="ct">
                  Доступно <span className="num">{oneOnOneAvailable}</span>{" "}
                  {oneOnOneAvailable === 1 ? "заявка" : "заявки"}
                </div>
                <div className="cs">Бонусы спишутся при одобрении администратором</div>
              </div>
              <button
                className="btn primary req-btn"
                type="button"
                disabled={balance < ONE_ON_ONE_COST}
                onClick={() => {
                  setError(null);
                  setRequestOpen(true);
                }}
              >
                {balance < ONE_ON_ONE_COST ? `Нужно ещё ${fmt(ONE_ON_ONE_COST - balance)}` : "Создать заявку"}
              </button>
            </div>

            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                margin: "4px 0 6px",
              }}
            >
              Мои заявки
            </div>

            {oo.length === 0 ? (
              <div className="text-text-3 text-[12px]" style={{ padding: "8px 2px" }}>
                Заявок пока нет.
              </div>
            ) : (
              oo.map((r, idx) => <RequestRow key={r.id} r={r} index={oo.length - idx} />)
            )}
          </div>

          {/* тизер достижения за первую 1×1 */}
          <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              className="seal"
              data-seal="amber"
              style={{ flex: "0 0 52px", width: 52, height: 52 }}
            >
              <span className="gl" style={{ fontSize: 17 }}>
                ×1
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Достижение «1×1 игрок»</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
                Заверши первую заявку 1×1 и получи бонусы
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* модалка конвертации со степпером (логика из макета) */}
      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Конвертация в скидку">
        <p className="text-text-2 text-[13px] mb-4 leading-snug">
          100 бонусов = 1% скидки постоплаты. Максимум до потолка {cap}% — {fmt(maxConvert)} бонусов.
        </p>

        <div className="scale" style={{ marginBottom: 18 }}>
          <div className="track">
            <div className="fill" style={{ width: `${(pct / cap) * 100}%` }} />
            <div className="ghost" style={{ left: `${ghostLeft}%`, width: `${ghostWidth}%` }} />
          </div>
          <div className="ticks">
            <span>0%</span>
            <span>{Math.round(cap / 3)}%</span>
            <span>{Math.round((cap * 2) / 3)}%</span>
            <span>{cap}%</span>
          </div>
        </div>

        <div className="convert" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <div className="stepper">
            <button
              type="button"
              aria-label="меньше"
              disabled={convAmount <= STEP}
              onClick={() => setConvAmount((a) => Math.max(STEP, a - STEP))}
            >
              −
            </button>
            <span className="amt">
              <span className="num">{fmt(convAmount)}</span>
            </span>
            <button
              type="button"
              aria-label="больше"
              disabled={convAmount >= maxConvert}
              onClick={() => setConvAmount((a) => Math.min(maxConvert, a + STEP))}
            >
              +
            </button>
          </div>
          <div className="readout">
            +{comma(convAmount / 100)}% → <b>{comma(previewPct)}% скидки</b>
          </div>
        </div>

        {error && (
          <div className="text-[12px] px-3 py-2 rounded-md border border-danger/40 bg-danger/10 text-danger mt-4">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end mt-5">
          <button className="btn" onClick={() => setConvertOpen(false)}>
            Отмена
          </button>
          <button
            className="btn btn-secondary"
            disabled={convertMut.isPending || convAmount < STEP || convAmount > maxConvert}
            onClick={() => convertMut.mutate(convAmount)}
          >
            {convertMut.isPending ? "Конвертация…" : "Конвертировать"}
          </button>
        </div>
      </Modal>

      {/* модалка 1×1 */}
      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Заявка на 1×1 с ментором">
        <p className="text-text-2 text-[13px] mb-4 leading-snug">
          {fmt(ONE_ON_ONE_COST)} бонусов = одна заявка. Бонусы не списываются сейчас — это
          произойдёт только когда администратор одобрит заявку. Если на момент одобрения у вас будет
          меньше {fmt(ONE_ON_ONE_COST)} бонусов, заявка не подтвердится.
        </p>
        <div className="text-[12px] text-text-3 font-mono mb-2">
          Ваш баланс: <span className="text-text font-bold">{fmt(balance)}</span> бонусов
        </div>
        {error && (
          <div className="text-[12px] px-3 py-2 rounded-md border border-danger/40 bg-danger/10 text-danger mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-3 justify-end mt-5">
          <button className="btn" onClick={() => setRequestOpen(false)}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            disabled={requestMut.isPending || balance < ONE_ON_ONE_COST}
            onClick={() => requestMut.mutate()}
          >
            {requestMut.isPending ? "Создание…" : "Создать заявку"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/** Строка истории операций — повторяет .txn из макета. */
function LedgerRow({ t }: { t: BonusTransaction }) {
  const meta = OP_META[t.type] ?? OP_META.manual_adjustment;
  const amount = Math.abs(t.amount);
  const sign = t.amount > 0 ? "+" : t.amount < 0 ? "−" : "";
  return (
    <div className={`txn ${meta.dir}`}>
      <div className="ic">
        <TxnIcon kind={meta.icon} />
      </div>
      <div>
        <div className="tt">{meta.title}</div>
        <div className="ds">{t.reason || meta.desc}</div>
      </div>
      <div className="right">
        <div className="a num">
          {sign}
          {fmt(amount)}
        </div>
        <div className="when">{shortDate(t.created_at)}</div>
      </div>
    </div>
  );
}

/** Строка заявки 1×1 — повторяет .req из макета. */
function RequestRow({ r, index }: { r: OneOnOneRequest; index: number }) {
  const created = shortDate(r.created_at);
  const note =
    r.status === "pending"
      ? `Создана ${created} · −1 000 при одобрении`
      : r.status === "approved"
        ? `${created} · списано 1 000`
        : r.status === "completed"
          ? `${created} · списано 1 000`
          : r.status === "rejected"
            ? `${created} · бонусы возвращены`
            : `${created} · отменена`;

  // StatusBadge ожидает токены статусов; маппим 1×1 → корректные tone/подписи.
  const badgeStatus =
    r.status === "approved"
      ? "approved_request"
      : r.status === "completed"
        ? "completed"
        : r.status === "rejected"
          ? "rejected"
          : r.status === "cancelled"
            ? "cancelled"
            : "pending";

  return (
    <div className="req">
      <div className="rn num">{String(index).padStart(2, "0")}</div>
      <div>
        <div className="rt">Заявка 1×1 с ментором</div>
        <div className="rd">{note}</div>
      </div>
      <StatusBadge status={badgeStatus} className="req-status" />
    </div>
  );
}
