import * as React from "react";
import { practiceFormatLabel, type PracticeFormat } from "../../server/src/sentenceBank";

export function ClassroomFormatSelect({ value, disabled, stenography, onChange }: {
  value: PracticeFormat;
  disabled: boolean;
  stenography: boolean;
  onChange: (format: PracticeFormat) => void;
}) {
  const id = React.useId();
  return (
    <label htmlFor={id} className="text-xs text-white/70">
      Gameplay Format
      <select
        id={id} value={value} disabled={disabled}
        onChange={event => onChange(event.target.value as PracticeFormat)}
        className="mt-1 w-full rounded bg-[#d7d7df] px-2 py-2 text-sm text-[#161a3b] disabled:opacity-70"
      >
        {(["word-phrase", "full-sentence"] as const).map(format => (
          <option key={format} value={format} disabled={stenography && format === "word-phrase"}>
            {practiceFormatLabel(format)}
          </option>
        ))}
      </select>
      {stenography ? <span className="mt-1 block">Gregg crops await verification; classroom play uses Full Sentence.</span> : null}
    </label>
  );
}
