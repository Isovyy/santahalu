"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { OSHI_DATA } from "@/lib/oshi-data";

const RELATIONSHIP_OPTIONS = ["Romantic", "Platonic", "Queerplatonic"];
const YUME_TYPE_RECEIVE_OPTIONS = ["HL", "GL", "BL"];
const CONTENT_TYPE_OPTIONS = ["Art", "Writing"];
const LANGUAGE_OPTIONS = ["Indonesia", "English"];
const OTHER = "Yang lain";

const FANDOM_YUME_OPTIONS = [
  "Arknights",
  "Blue Lock",
  "Bungo Stray Dogs",
  "Ensemble Stars",
  "Demon Slayer",
  "Fate Grand Order",
  "Fire Emblem",
  "Genshin Impact",
  "Helios Rising Heroes",
  "Honkai Star Rail",
  "Hypnosis Mic",
  "IDOLiSH7",
  "Ikemen Series",
  "Love and Deep Space",
  "Mahoyaku",
  "My Hero Academia",
  "Obey Me!",
  "Paradox Live",
  "Persona",
  "Project Sekai",
  "Tears of Themis",
  "Tokyo Debunker",
  "Touken Ranbu",
  "Twisted Wonderland",
  "Zenless Zone Zero",
];

// One shared list so a receiver's fandom always matches a giver's accepted fandom exactly.
const FANDOM_ALL = Array.from(
  new Set([
    ...FANDOM_YUME_OPTIONS,
    ...OSHI_DATA.map((d) => d.fandom),
  ]),
).sort((a, b) => a.localeCompare(b));

const ANY_FANDOM = "Apa saja";

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

interface AvoidEntry {
  character: string;
  fandom: string;
}

interface FormState {
  consent: boolean;
  email: string;
  twtUser: string;
  yumeshipName: string;
  oshiName: string;
  relationshipType: string;
  yumeTypeReceiveOption: string;
  yumeTypeReceiveOther: string;
  fandomYumeOption: string;
  fandomYumeOther: string;
  contentType: string[];
  languageReceive: string[];
  languageGive: string[];
  fandomGive: string[];
  avoidList: AvoidEntry[];
  yumeDocuLink: string;
  notes: string;
}

const initialState: FormState = {
  consent: false,
  email: "",
  twtUser: "",
  yumeshipName: "",
  oshiName: "",
  relationshipType: "",
  yumeTypeReceiveOption: "",
  yumeTypeReceiveOther: "",
  fandomYumeOption: "",
  fandomYumeOther: "",
  contentType: [],
  languageReceive: [],
  languageGive: [],
  fandomGive: [],
  avoidList: [],
  yumeDocuLink: "",
  notes: "",
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {hint && <span className="block text-xs text-gray-400">{hint}</span>}
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-300";

function RadioGroup({
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
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={(e) => onChange(e.target.value)}
          />
          {opt}
        </label>
      ))}
      {withOther && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name={name}
            value={OTHER}
            checked={value === OTHER}
            onChange={(e) => onChange(e.target.value)}
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

// "|" and ";" delimit the stored value, so they can't appear inside a name.
function cleanAvoidText(s: string): string {
  return s.replace(/[|;]/g, " ").replace(/\s+/g, " ").trim();
}

function AvoidListInput({
  values,
  onChange,
}: {
  values: AvoidEntry[];
  onChange: (v: AvoidEntry[]) => void;
}) {
  const [character, setCharacter] = useState("");
  const [fandom, setFandom] = useState("");

  const suggestions = useMemo(() => {
    const selected = OSHI_DATA.find((d) => d.fandom.toLowerCase() === fandom.trim().toLowerCase());
    return selected ? selected.characters : [];
  }, [fandom]);

  const canAdd = cleanAvoidText(character) !== "" && cleanAvoidText(fandom) !== "";

  function add() {
    const entry = { character: cleanAvoidText(character), fandom: cleanAvoidText(fandom) };
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
              className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 py-1 pl-3 pr-1 text-sm text-red-500"
            >
              {v.character} <span className="text-red-300">({v.fandom})</span>
              <button
                type="button"
                aria-label={`Hapus ${v.character}`}
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-red-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="text"
          className={inputClass}
          placeholder="Fandom"
          list="avoid-fandoms"
          autoComplete="off"
          value={fandom}
          onChange={(e) => setFandom(e.target.value)}
        />
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
        <button
          type="button"
          disabled={!canAdd}
          onClick={add}
          className="rounded-lg border border-teal-200 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 disabled:opacity-40"
        >
          Tambah
        </button>
      </div>
      <datalist id="avoid-fandoms">
        {FANDOM_ALL.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <datalist id="avoid-characters">
        {suggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}

function FandomMultiSelect({
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
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" checked={any} onChange={(e) => toggleAny(e.target.checked)} />
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

function CheckboxGroup({
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
        <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.includes(opt)}
            onChange={() => onChange(toggle(values, opt))}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const oshiSuggestions = useMemo(() => {
    const selected = OSHI_DATA.find((d) => d.fandom === form.fandomYumeOption);
    const pool = selected ? [selected] : OSHI_DATA;
    return pool.flatMap((d) => d.characters.map((name) => ({ name, fandom: d.fandom })));
  }, [form.fandomYumeOption]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const yumeTypeReceive =
      form.yumeTypeReceiveOption === OTHER
        ? form.yumeTypeReceiveOther.trim()
        : form.yumeTypeReceiveOption;

    const fandomYume =
      form.fandomYumeOption === OTHER ? form.fandomYumeOther.trim() : form.fandomYumeOption;

    if (form.fandomGive.length === 0) {
      setError("Pilih minimal satu fandom yang diterima (atau centang 'Apa saja').");
      setStatus("error");
      return;
    }

    const payload = {
      consent: form.consent,
      email: form.email,
      twtUser: form.twtUser,
      yumeshipName: form.yumeshipName,
      oshiName: form.oshiName,
      relationshipType: form.relationshipType,
      yumeTypeReceive,
      fandomYume,
      contentType: form.contentType.join(", "),
      languageReceive: form.languageReceive.join(", "),
      languageGive: form.languageGive.join(", "),
      fandomGive: form.fandomGive.join(", "),
      avoidList: form.avoidList.map((a) => `${a.character} | ${a.fandom}`).join("; "),
      yumeDocuLink: form.yumeDocuLink,
      notes: form.notes,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error — please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold text-teal-500">Kamu berhasil terdaftar! 🎁</h1>
        <p className="mt-3 text-gray-500">
          Terima kasih sudah mendaftar Santahalu Secret Santa. Kamu bisa submit formulir ini lagi
          dengan email yang sama untuk mengupdate jawabanmu.
        </p>
        <button
          className="mt-6 rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-600 hover:bg-teal-50"
          onClick={() => {
            setForm(initialState);
            setStatus("idle");
          }}
        >
          Submit respon lain
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <Image src="/yumefess-icon.png" alt="Yumefess" width={80} height={80} />
        </div>
        <h1 className="mb-1 text-3xl font-bold text-teal-500">Secret Santa 2025</h1>
        <p className="text-sm text-gray-400">Santahalu registration</p>
      </div>

      <section className="mt-6 space-y-3 rounded-2xl border border-teal-100 bg-white shadow-sm p-5 text-sm text-gray-500">
        <h2 className="text-base font-medium text-gray-700">
          #SantaHalu: Secret Santa EVENT RULES
        </h2>

        <div>
          <p className="font-medium text-gray-600">I - Registration</p>
          <p className="mt-1">
            Kuota pendaftaran 100 orang. Pada saat pendaftaran, harus menyertakan hal hal berikut:
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>
              Referensi oc/sona dan referensi cc/oshi, dynamic yumeship, background yumeship,
              timeline dan lain-lain SELENGKAP-LENGKAPNYA pada Google Document yang disediakan.
            </li>
            <li>Nama yumeship.</li>
            <li>
              Previous works/karya-karya yumeship yang sudah ada sebagai referensi lebih lanjut
              (jika ada).
            </li>
            <li>Preferensi bahasa.</li>
          </ol>
        </div>

        <div>
          <p className="font-medium text-gray-600">II - Gift</p>
          <p className="mt-1">
            Setiap pendaftar menjadi &quot;Secret Santa&quot; bagi pendaftar yang lain. Setiap
            Secret Santa akan diberikan satu nama MELALUI EMAIL yang harus diberi hadiah berupa
            karya art/writing tentang yumeship mereka. Ketentuan karya sebagai berikut:
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Karya bertema musim dingin/natal/tahun baru.</li>
            <li>
              Art minimal colored sketch. Minimal BUST UP untuk non-chibi dan HALF BODY untuk
              chibi.
            </li>
            <li>Writing minimal 1000 words.</li>
          </ol>
        </div>

        <div>
          <p className="font-medium text-gray-600">III - Consequences</p>
          <p className="mt-1">
            Setiap peserta diharapkan bertanggungjawab dan mengerti terhadap event Secret Santa
            ini. Karena penerima Secret Santa digacha, maka writer bisa saja mendapat art, dan
            sebaliknya. Bagaimanapun, Secret Santa akan dicocokkan sesuai fandom dan oshi. Kami
            akan mengusahakan untuk tidak memasangkan yang oshinya sama.
          </p>
        </div>

        <p className="font-medium text-amber-600">
          ⚠ TIDAK MENGUMPULKAN KARYA TANPA KETERANGAN AKAN DIBLOCK OLEH @mlytfess, DI-BAN DARI
          EVENT-EVENT SELANJUTNYA DAN AKAN KAMI POST DI @MLYTFESS ⚠
        </p>

        <p>
          Pertanyaan, kritik, dan saran lebih lanjut bisa disampaikan melalui: @FATUIUWU /{" "}
          ryuka.izumi@gmail.com
        </p>
      </section>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <label className="flex items-start gap-2 rounded-2xl border border-teal-100 bg-white shadow-sm p-4 text-sm text-gray-700">
          <input
            type="checkbox"
            required
            className="mt-1"
            checked={form.consent}
            onChange={(e) => update("consent", e.target.checked)}
          />
          <span>
            Saya sudah mengerti peraturan event Secret Santa dan akan bertanggung jawab
            mengerjakan bagian saya. <span className="text-teal-500">*</span>
            <br />
            <span className="text-gray-400">
              Iya saya PAHAM dan akan bertanggung jawab serta bersedia untuk mendapatkan pinalti
              jika tidak memenuhi kewajiban saya.
            </span>
          </span>
        </label>

        <Field
          label="Email"
          required
          hint="Pengumuman penerima, konfirmasi, dan hadiah akan dikirim lewat email."
        >
          <input
            type="email"
            required
            className={inputClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>

        <Field
          label="Username twitter"
          required
          hint="Sertakan @ (bila ingin mengganti username selama event berlangsung mohon lapor ke @FATUIUWU)"
        >
          <input
            type="text"
            required
            className={inputClass}
            value={form.twtUser}
            onChange={(e) => update("twtUser", e.target.value)}
          />
        </Field>

        <Field label="Nama yumeship" required>
          <input
            type="text"
            required
            className={inputClass}
            value={form.yumeshipName}
            onChange={(e) => update("yumeshipName", e.target.value)}
          />
        </Field>

        <Field label="Fandom yumeshipmu" required>
          <select
            required
            className={inputClass}
            value={form.fandomYumeOption}
            onChange={(e) => update("fandomYumeOption", e.target.value)}
          >
            <option value="" disabled>
              Pilih fandom
            </option>
            {FANDOM_ALL.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
            <option value={OTHER}>{OTHER}</option>
          </select>
          {form.fandomYumeOption === OTHER && (
            <input
              type="text"
              required
              className={inputClass + " mt-2"}
              placeholder="Tulis fandommu"
              value={form.fandomYumeOther}
              onChange={(e) => update("fandomYumeOther", e.target.value)}
            />
          )}
        </Field>

        <Field label="Nama cc/oshi" required hint="Karakter canon yang di yume">
          <input
            type="text"
            required
            className={inputClass}
            list="oshi-suggestions"
            autoComplete="off"
            value={form.oshiName}
            onChange={(e) => update("oshiName", e.target.value)}
          />
          <datalist id="oshi-suggestions">
            {oshiSuggestions.map((c) => (
              <option key={`${c.fandom}:${c.name}`} value={c.name} label={c.fandom} />
            ))}
          </datalist>
        </Field>

        <Field label="Tipe Yumeship" required>
          <RadioGroup
            name="relationshipType"
            options={RELATIONSHIP_OPTIONS}
            value={form.relationshipType}
            onChange={(v) => update("relationshipType", v)}
          />
        </Field>

        <Field label="Yumeship type" hint="Bila Romantic/Queerplatonic">
          <RadioGroup
            name="yumeTypeReceive"
            options={YUME_TYPE_RECEIVE_OPTIONS}
            value={form.yumeTypeReceiveOption}
            onChange={(v) => update("yumeTypeReceiveOption", v)}
            withOther
            otherValue={form.yumeTypeReceiveOther}
            onOtherChange={(v) => update("yumeTypeReceiveOther", v)}
          />
        </Field>

        <Field label="Karya yang diberi berupa" required hint="Centang semua yang termasuk">
          <CheckboxGroup
            options={CONTENT_TYPE_OPTIONS}
            values={form.contentType}
            onChange={(v) => update("contentType", v)}
          />
        </Field>

        <Field
          label="Bahasa yang bersedia kamu terima"
          required
          hint="Centang semua yang termasuk"
        >
          <CheckboxGroup
            options={LANGUAGE_OPTIONS}
            values={form.languageReceive}
            onChange={(v) => update("languageReceive", v)}
          />
        </Field>

        <Field
          label="Bahasa yang bersedia kamu tulis"
          hint="Jika writing, centang semua yang termasuk"
        >
          <CheckboxGroup
            options={LANGUAGE_OPTIONS}
            values={form.languageGive}
            onChange={(v) => update("languageGive", v)}
          />
        </Field>

        <Field
          label="Fandom yang diterima"
          required
          hint="Bila semua cukup centang 'Apa saja'. Cari fandom lalu klik untuk menambah. Fandom yang tidak ada di daftar bisa ditambahkan dengan mengetik namanya."
        >
          <FandomMultiSelect
            values={form.fandomGive}
            onChange={(v) => update("fandomGive", v)}
          />
        </Field>

        <Field
          label="Dokumen Yumeship"
          required
          hint="Tempel link ke Google Doc/Drive yang berisi referensi yumeshipmu (bukan upload file)"
        >
          <input
            type="url"
            required
            className={inputClass}
            placeholder="https://..."
            value={form.yumeDocuLink}
            onChange={(e) => update("yumeDocuLink", e.target.value)}
          />
        </Field>

        <Field
          label="Karakter yang ingin dihindari"
          hint="Opsional. Karakter dari fandom tertentu yang tidak ingin kamu buatkan hadiah. Isi fandom dan nama karakter, lalu klik Tambah (bisa lebih dari satu)."
        >
          <AvoidListInput
            values={form.avoidList}
            onChange={(v) => update("avoidList", v)}
          />
        </Field>

        <Field label="Notes">
          <textarea
            className={inputClass}
            rows={4}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 active:bg-teal-600 disabled:opacity-50"
        >
          {status === "submitting" ? "Mengirim..." : "Daftar"}
        </button>
      </form>
    </main>
  );
}
