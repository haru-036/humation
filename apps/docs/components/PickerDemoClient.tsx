import { useState } from "react";

// 選択肢は .astro 側でビルド時に作る。island が持つのは選択状態だけなので、
// マニフェストと @humation/core はブラウザに載らない。
export interface PartOption {
  id: string;
  name: string;
  previewSrc: string;
}

interface Props {
  options: PartOption[];
  defaultId: string;
}

export default function PickerDemoClient({ options, defaultId }: Props) {
  const [selectedId, setSelectedId] = useState(defaultId);
  const selected = options.find((part) => part.id === selectedId);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        {/* .prose の段落余白は not-prose の中まで効き、ユーティリティより強い。
            島の中では <p> を使わない。 */}
        <div className="text-[13px] font-medium text-[var(--blume-foreground)]">
          Body
        </div>
        <div className="font-mono text-[12px] text-[var(--blume-muted-foreground)]">
          {selected?.name}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {options.map((part) => (
          <li key={part.id}>
            <button
              type="button"
              title={part.name}
              aria-label={`Select ${part.name}`}
              aria-pressed={selectedId === part.id}
              onClick={() => setSelectedId(part.id)}
              className={
                selectedId === part.id
                  ? "grid h-16 w-16 place-items-center rounded-md bg-[var(--blume-muted)] ring-1 ring-[var(--blume-accent)] ring-inset transition-transform duration-150 active:scale-[0.97]"
                  : "grid h-16 w-16 place-items-center rounded-md transition-[background-color,transform] duration-150 hover:bg-[var(--blume-muted)] active:scale-[0.97]"
              }
            >
              <img
                src={part.previewSrc}
                alt=""
                loading="lazy"
                data-no-zoom
                className="h-14 w-14"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
