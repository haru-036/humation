import { humation1 } from "@humation/assets-humation-1";
import { createPartPreview } from "@humation/core";
import { useMemo, useState } from "react";

const SLOTS = ["head", "body", "bottom", "item", "glasses"] as const;
type Slot = (typeof SLOTS)[number];

type Entry = {
  id: string;
  name: string;
  slot: string;
  previewSrc: string;
};

// 全パーツ分のプレビューをここで生成する。props で渡すと SSR 済みの
// マークアップと island の props JSON に二重に載ってしまう。
function buildEntries(): Entry[] {
  return humation1.parts
    .filter((part) => SLOTS.includes(part.selectionSlot as Slot))
    // `none` は「何も着けない」を表す空のパーツで、プレビューが白紙になる。
    // 選び方は本文の Empty slots で説明しているので一覧には出さない。
    .filter((part) => (part.name ?? part.id) !== "none")
    .map((part) => ({
      id: part.id,
      name: part.name ?? part.id,
      slot: part.selectionSlot,
      previewSrc: createPartPreview(humation1, part).toDataUri(),
    }));
}

export default function PartsBrowser() {
  const entries = useMemo(() => buildEntries(), []);
  const [query, setQuery] = useState("");
  const [slot, setSlot] = useState<Slot | "all">("all");
  const [copied, setCopied] = useState("");

  const visible = entries.filter(
    (entry) =>
      (slot === "all" || entry.slot === slot) &&
      (query === "" || entry.name.includes(query.trim().toLowerCase()))
  );

  async function copyName(entry: Entry) {
    try {
      await navigator.clipboard.writeText(entry.name);
      setCopied(entry.id);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className="not-prose">
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search parts"
          spellCheck={false}
          aria-label="Search parts"
          className="min-w-40 flex-1 rounded-md border border-[var(--blume-border)] bg-[var(--blume-background)] px-3 py-1.5 text-sm outline-none focus:border-[var(--blume-muted-foreground)]"
        />
        <div className="flex flex-wrap gap-1">
          {(["all", ...SLOTS] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSlot(item)}
              aria-pressed={item === slot}
              className={
                item === slot
                  ? "rounded-md bg-[var(--blume-muted)] px-2.5 py-1.5 font-mono text-[12px] font-medium text-[var(--blume-foreground)]"
                  : "rounded-md px-2.5 py-1.5 font-mono text-[12px] text-[var(--blume-muted-foreground)] transition hover:text-[var(--blume-foreground)]"
              }
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 text-[13px] text-[var(--blume-muted-foreground)]">
        {visible.length} of {entries.length} parts
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => copyName(entry)}
              title={`Click to copy "${entry.name}"`}
              className="group relative w-full rounded-md border border-[var(--blume-border)] bg-[var(--humation-card)] p-3 text-left transition hover:border-[var(--blume-muted-foreground)]"
            >
              {/* 絶対配置。名前の行に置くと幅を奪って長い名前が折り返す。 */}
              <span
                aria-hidden="true"
                className={
                  copied === entry.id
                    ? "absolute top-2 right-2 text-[var(--blume-accent)]"
                    : "absolute top-2 right-2 text-[var(--blume-muted-foreground)] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                }
              >
                {copied === entry.id ? <CheckIcon /> : <CopyIcon />}
              </span>
              {/* 線画は背景が透明なので、暗い地では黒い部分が消える。
                  アバターのプレートと同じ扱いで、ダークのときだけ下に敷く。 */}
              <img
                src={entry.previewSrc}
                alt=""
                loading="lazy"
                data-no-zoom
                className="mx-auto h-16 w-16 rounded-sm dark:bg-[#F6F5F4]"
              />
              {/* .prose の段落余白は not-prose の中まで効くので <p> は使わない。 */}
              <div className="mt-2 font-mono text-[11px] leading-4 break-all text-[var(--blume-foreground)]">
                {entry.name}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <div className="mt-6 text-[14px] text-[var(--blume-muted-foreground)]">
          No parts match “{query}”.
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
