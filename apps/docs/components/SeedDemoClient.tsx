import { humation1 } from "@humation/assets-humation-1";
import { Avatar } from "@humation/react";
import { useEffect, useId, useRef, useState } from "react";

const SAMPLE_SEEDS = [
  "felix",
  "ayaka@example.com",
  "user_10482",
  "sukiyaki-taro",
  "orange",
  "a1b2c3",
];

interface Props {
  /** サーバで Shiki に通したコード 1 行の中身。`[data-seed]` に seed が入る。 */
  codeInner: string;
  defaultSeed: string;
}

export default function SeedDemoClient({ codeInner, defaultSeed }: Props) {
  const inputId = useId();
  const codeRef = useRef<HTMLElement>(null);
  const [seed, setSeed] = useState(defaultSeed);
  const [copied, setCopied] = useState(false);
  const code = `<Avatar assets={humation1} seed="${seed}" size={112} />`;

  // codeInner は変わらないので、React は初回以降このコードに触らない。
  // 差し替えるのはスロットのテキストだけ。
  useEffect(() => {
    const slot = codeRef.current?.querySelector("[data-seed]");
    if (slot) {
      slot.textContent = seed;
    }
  }, [seed]);

  const shuffle = () => {
    const candidates = SAMPLE_SEEDS.filter((sample) => sample !== seed);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    setSeed(next ?? defaultSeed);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="not-prose border-border bg-background my-6 overflow-hidden rounded-xl border">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="bg-muted grid size-28 shrink-0 place-items-center overflow-hidden rounded-lg">
          <Avatar
            assets={humation1}
            seed={seed}
            size={112}
            title={`Avatar for ${seed}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <label
            htmlFor={inputId}
            className="text-muted-foreground text-xs font-semibold tracking-wide"
          >
            seed
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id={inputId}
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              spellCheck={false}
              className="border-border bg-background text-foreground focus:border-muted-foreground min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-sm transition-colors outline-none"
            />
            <button
              type="button"
              aria-label="Random seed"
              onClick={shuffle}
              className="border-border text-muted-foreground hover:text-foreground grid size-9.5 shrink-0 place-items-center rounded-lg border transition-[color,transform] duration-150 ease-out active:scale-[0.97]"
            >
              <ShuffleIcon />
            </button>
          </div>
          {/* .prose の段落余白は not-prose の中まで効き、ユーティリティより強い。
              島の中では <p> を使わない。 */}
          <div className="text-muted-foreground mt-2 text-[13px] leading-6">
            The same seed always renders the same avatar for a given asset
            package version.
          </div>
        </div>
      </div>

      <div className="border-border bg-background relative border-t">
        <div className="humation-code overflow-x-auto px-4 py-3 pr-16 font-mono text-sm leading-6 whitespace-nowrap">
          <code
            ref={codeRef}
            aria-label={code}
            dangerouslySetInnerHTML={{ __html: codeInner }}
          />
        </div>
        <div
          aria-hidden="true"
          className="bg-background pointer-events-none absolute inset-y-0 right-0 w-12"
        />
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
          onClick={copyCode}
          className="bg-background text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-md transition-[color,transform] duration-150 ease-out active:scale-[0.97]"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}

function ShuffleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="m18 14 4 4-4 4" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 18h1.5c2.5 0 4.9-1.2 6.4-3.2L14.1 9A8 8 0 0 1 20.5 6H22" />
      <path d="M2 6h1.5a8 8 0 0 1 6.4 3.2l.5.7" />
      <path d="M14.1 15a8 8 0 0 0 6.4 3H22" />
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
      className="size-4"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
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
      className="size-4"
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}
