"use client";

import { useMemo, useState } from "react";
import { OSHI_DATA } from "@/lib/oshi-data";
import { AVOID_WHOLE_FANDOM } from "@/lib/avoidList";
import { FANDOM_ALL } from "@/lib/fandoms";

export { FANDOM_ALL };

export const RELATIONSHIP_OPTIONS = ["Romantic", "Platonic", "Queerplatonic"];
export const CONTENT_TYPE_OPTIONS = ["Art", "Writing"];
export const LANGUAGE_OPTIONS = ["Indonesia", "English"];
export const OTHER = "Yang lain";

export const ANY_FANDOM = "Apa saja";

const POPULAR_FANDOMS = [
  "Genshin Impact",
  "Honkai Star Rail",
  "Ensemble Stars",
  "Twisted Wonderland",
  "Tokyo Debunker",
  "Hypnosis Mic",
  "Project Sekai",
  "Touken Ranbu",
  "Love and Deep Space",
  "Obey Me!",
];

export interface AvoidEntry {
  character: string;
  fandom: string;
}

export function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function splitMulti(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// Mirrors the "Character | Fandom; Character | Fandom" convention the forms write.
export function parseAvoidListValue(value: string): AvoidEntry[] {
  return value
    .split(";")
    .map((entry) => {
      const [character = "", fandom = ""] = entry.split("|");
      return { character: character.trim(), fandom: fandom.trim() };
    })
    .filter((a) => a.character);
}

export const inputClass =
  "w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-300";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-teal-100 bg-white p-6 shadow-sm">
      <span className="block text-[15px] font-medium text-gray-800">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {hint && <span className="block text-xs text-gray-400">{hint}</span>}
      {children}
    </div>
  );
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  withOther,
  otherValue,
  onOtherChange,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  withOther?: boolean;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={(e) => onChange(e.target.value)}
            className="h-4 w-4 accent-teal-500"
          />
          {opt}
        </label>
      ))}
      {withOther && (
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="radio"
            name={name}
            value={OTHER}
            checked={value === OTHER}
            onChange={(e) => onChange(e.target.value)}
            className="h-4 w-4 accent-teal-500"
          />
          {OTHER}
          {value === OTHER && (
            <input
              type="text"
              className={inputClass + " ml-2"}
              value={otherValue}
              onChange={(e) => onOtherChange?.(e.target.value)}
            />
          )}
        </label>
      )}
    </div>
  );
}

export function CheckboxGroup({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.includes(opt)}
            onChange={() => onChange(toggle(values, opt))}
            className="h-4 w-4 accent-teal-500"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

// "|" and ";" delimit the stored value so they can't appear inside a name.
function cleanAvoidText(s: string): string {
  return s.replace(/[|;]/g, " ").replace(/\s+/g, " ").trim();
}

export function AvoidListInput({
  values,
  onChange,
}: {
  values: AvoidEntry[];
  onChange: (v: AvoidEntry[]) => void;
}) {
  const [character, setCharacter] = useState("");
  const [fandom, setFandom] = useState("");
  const [wholeFandom, setWholeFandom] = useState(false);
  const [fandomOpen, setFandomOpen] = useState(false);

  const suggestions = useMemo(() => {
    const selected = OSHI_DATA.find((d) => d.fandom.toLowerCase() === fandom.trim().toLowerCase());
    return selected ? selected.characters : [];
  }, [fandom]);

  const fandomQ = fandom.trim().toLowerCase();
  const fandomResults = useMemo(() => {
    if (!fandomQ) return [];
    return FANDOM_ALL.filter((f) => f.toLowerCase().includes(fandomQ));
  }, [fandomQ]);
  const fandomExactExists = FANDOM_ALL.some((f) => f.toLowerCase() === fandomQ);

  const canAdd = wholeFandom
    ? cleanAvoidText(fandom) !== ""
    : cleanAvoidText(character) !== "" && cleanAvoidText(fandom) !== "";

  function add() {
    const entry = {
      character: wholeFandom ? AVOID_WHOLE_FANDOM : cleanAvoidText(character),
      fandom: cleanAvoidText(fandom),
    };
    if (!entry.character || !entry.fandom) return;
    const dup = values.some(
      (v) =>
        v.character.toLowerCase() === entry.character.toLowerCase() &&
        v.fandom.toLowerCase() === entry.fandom.toLowerCase(),
    );
    if (!dup) onChange([...values, entry]);
    setCharacter("");
  }

  return (
    <div className="space-y-3">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((v, i) => (
            <li
              key={`${v.fandom}:${v.character}`}
              className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1 text-sm text-emerald-600"
            >
              {v.character === AVOID_WHOLE_FANDOM ? (
                <>Seluruh fandom: {v.fandom}</>
              ) : (
                <>
                  {v.character} <span className="text-emerald-400">({v.fandom})</span>
                </>
              )}
              <button
                type="button"
                aria-label={`Hapus ${v.character === AVOID_WHOLE_FANDOM ? v.fandom : v.character}`}
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-emerald-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={wholeFandom}
          onChange={(e) => setWholeFandom(e.target.checked)}
          className="h-4 w-4 accent-teal-500"
        />
        Kecualikan seluruh fandom (bukan cuma satu karakter)
      </label>

      <div className={`grid gap-2 ${wholeFandom ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-[1fr_1fr_auto]"}`}>
        <div className="relative">
          <input
            type="text"
            className={inputClass}
            placeholder="Fandom"
            autoComplete="off"
            value={fandom}
            onChange={(e) => {
              setFandom(e.target.value);
              setFandomOpen(true);
            }}
            onFocus={() => setFandomOpen(true)}
            onBlur={() => setFandomOpen(false)}
          />
          {fandomOpen && fandomQ && (fandomResults.length > 0 || !fandomExactExists) && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-teal-200 bg-white shadow-lg">
              {fandomResults.map((f) => (
                <li key={f}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFandom(f);
                      setFandomOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-teal-50"
                  >
                    {f}
                  </button>
                </li>
              ))}
              {!fandomExactExists && (
                <li className="border-t border-teal-100 px-3 py-2 text-left text-sm text-gray-400">
                  Fandom tidak ada di daftar? Tetap ketik namanya.
                </li>
              )}
            </ul>
          )}
        </div>
        {!wholeFandom && (
          <input
            type="text"
            className={inputClass}
            placeholder="Nama karakter"
            list="avoid-characters"
            autoComplete="off"
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        )}
        <button
          type="button"
          disabled={!canAdd}
          onClick={add}
          className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 disabled:opacity-40"
        >
          Tambah
        </button>
      </div>
      <datalist id="avoid-characters">
        {suggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}

export function FandomMultiSelect({
  values,
  onChange,
}: {
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const any = values.includes(ANY_FANDOM);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return FANDOM_ALL.filter((f) => !values.includes(f) && f.toLowerCase().includes(q));
  }, [q, values]);

  const exactExists = FANDOM_ALL.some((f) => f.toLowerCase() === q) || values.some((v) => v.toLowerCase() === q);

  function add(name: string) {
    // Commas separate fandoms in the stored value, so they can't appear inside a name.
    const clean = name.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    if (!clean || values.includes(clean)) return;
    onChange([...values, clean]);
    setQuery("");
  }

  function remove(name: string) {
    onChange(values.filter((v) => v !== name));
  }

  function toggleAny(checked: boolean) {
    onChange(checked ? [ANY_FANDOM] : []);
    setQuery("");
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={any}
          onChange={(e) => toggleAny(e.target.checked)}
          className="h-4 w-4 accent-teal-500"
        />
        {ANY_FANDOM}
      </label>

      {!any && (
        <>
          {values.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {values.map((v) => (
                <li
                  key={v}
                  className="flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 py-1 pl-3 pr-1 text-sm text-teal-700"
                >
                  {v}
                  <button
                    type="button"
                    aria-label={`Hapus ${v}`}
                    onClick={() => remove(v)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-teal-500 hover:bg-teal-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="relative">
            <input
              type="text"
              className={inputClass}
              placeholder="Cari fandom..."
              value={query}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[0]) add(results[0]);
                  else if (q && !exactExists) add(query);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
            {open && q && (results.length > 0 || !exactExists) && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-teal-200 bg-white shadow-lg">
                {results.map((f) => (
                  <li key={f}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => add(f)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-teal-50"
                    >
                      {f}
                    </button>
                  </li>
                ))}
                {!exactExists && (
                  <li>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => add(query)}
                      className="w-full border-t border-teal-100 px-3 py-2 text-left text-sm text-teal-600 hover:bg-teal-50"
                    >
                      {OTHER}: tambah &quot;{query.trim()}&quot;
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>

          {!q && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">Contoh:</span>
              {POPULAR_FANDOMS.filter((f) => !values.includes(f)).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => add(f)}
                  className="rounded-full border border-teal-200 px-3 py-1 text-xs text-gray-600 hover:bg-teal-50"
                >
                  + {f}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Free-text with suggestions. No native <select>/<datalist>, so no browser dropdown arrow.
export function FandomSingleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return FANDOM_ALL.filter((f) => f.toLowerCase().includes(q));
  }, [q]);

  const exactExists = FANDOM_ALL.some((f) => f.toLowerCase() === q);

  return (
    <div className="relative">
      <input
        type="text"
        required
        className={inputClass}
        placeholder="Cari atau ketik fandom..."
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && q && (results.length > 0 || !exactExists) && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-teal-200 bg-white shadow-lg">
          {results.map((f) => (
            <li key={f}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(f);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-teal-50"
              >
                {f}
              </button>
            </li>
          ))}
          {!exactExists && (
            <li className="border-t border-teal-100 px-3 py-2 text-left text-sm text-gray-400">
              Fandom tidak ada di sugesti? Tetap ketik namanya, jawabanmu akan tersimpan apa adanya.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export interface OshiSuggestion {
  name: string;
  fandom: string;
}

// Free-text with suggestions. No native <select>/<datalist>, so no browser dropdown arrow.
export function OshiNameSelect({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: OshiSuggestion[];
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return suggestions.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 20);
  }, [q, suggestions]);

  return (
    <div className="relative">
      <input
        type="text"
        required
        className={inputClass}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && q && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-teal-200 bg-white shadow-lg">
          {results.map((s) => (
            <li key={`${s.fandom}:${s.name}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s.name);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-teal-50"
              >
                {s.name} <span className="text-gray-400">({s.fandom})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
