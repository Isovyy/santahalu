"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { OSHI_DATA } from "@/lib/oshi-data";
import type { FormCopy } from "@/lib/formCopyDefaults";
import {
  RELATIONSHIP_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  YUME_TYPE_OPTIONS,
  YUME_TYPE_GIVE_OPTIONS,
  ALL_YUME_TYPES,
  showsYumeTypeReceive,
  splitYumeTypeGive,
  joinYumeTypeGive,
  toggleYumeTypeGive,
  splitYumeTypeReceive,
  OTHER,
  AvoidEntry,
  splitMulti,
  parseAvoidListValue,
  inputClass,
  Field,
  RadioGroup,
  CheckboxGroup,
  AvoidListInput,
  FandomMultiSelect,
  FandomSingleSelect,
  OshiNameSelect,
  normalizeTwitterHandle,
} from "./RegisterFields";

interface FormState {
  consent: boolean;
  email: string;
  twtUser: string;
  yumeshipName: string;
  oshiName: string;
  relationshipType: string;
  fandomYume: string;
  contentType: string[];
  languageReceive: string[];
  languageGive: string[];
  fandomGive: string[];
  avoidList: AvoidEntry[];
  yumeDocuLink: string;
  notes: string;
  password: string;
  yumeTypeGive: string[];
  yumeTypeGiveOther: string;
  yumeTypeReceive: string;
  yumeTypeReceiveOther: string;
}

const initialState: FormState = {
  consent: false,
  email: "",
  twtUser: "",
  yumeshipName: "",
  oshiName: "",
  relationshipType: "",
  fandomYume: "",
  contentType: [],
  languageReceive: [],
  languageGive: [],
  fandomGive: [],
  avoidList: [],
  yumeDocuLink: "",
  notes: "",
  password: "",
  yumeTypeGive: [],
  yumeTypeGiveOther: "",
  yumeTypeReceive: "",
  yumeTypeReceiveOther: "",
};

function formatEditCodeDisplay(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

interface LookupParticipant {
  email: string;
  twtUser: string;
  yumeshipName: string;
  oshiName: string;
  relationshipType: string;
  fandomYume: string;
  contentType: string;
  languageReceive: string;
  fandomGive: string;
  yumeDocuLink: string;
  languageGive: string | null;
  notes: string | null;
  avoidList: string | null;
  yumeTypeGive: string;
  yumeTypeReceive: string | null;
}

function participantToForm(p: LookupParticipant): FormState {
  return {
    consent: true,
    email: p.email,
    twtUser: p.twtUser,
    yumeshipName: p.yumeshipName,
    oshiName: p.oshiName,
    relationshipType: p.relationshipType,
    fandomYume: p.fandomYume,
    contentType: splitMulti(p.contentType),
    languageReceive: splitMulti(p.languageReceive),
    languageGive: splitMulti(p.languageGive ?? ""),
    fandomGive: splitMulti(p.fandomGive),
    avoidList: parseAvoidListValue(p.avoidList ?? ""),
    yumeDocuLink: p.yumeDocuLink,
    notes: p.notes ?? "",
    password: "",
    ...splitYumeTypeGive(p.yumeTypeGive),
    ...splitYumeTypeReceive(p.yumeTypeReceive),
  };
}

function EditLookupPanel({
  copy,
  onLoaded,
}: {
  copy: FormCopy;
  onLoaded: (form: FormState, code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/register/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memuat jawaban.");
        setLoading(false);
        return;
      }
      onLoaded(participantToForm(data.participant), code);
      setLoading(false);
      setOpen(false);
    } catch {
      setError("Network error, coba lagi.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-left text-sm font-medium text-teal-700 shadow-sm hover:bg-teal-100"
      >
        {copy["editLookup.trigger"]}
        <span aria-hidden="true">&rarr;</span>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-teal-100 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium text-gray-800">{copy["editLookup.heading"]}</h2>
      <p className="mt-1 text-xs text-gray-400">{copy["editLookup.hint"]}</p>
      <form onSubmit={handleLookup} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          required
          placeholder={copy["editLookup.inputPlaceholder"]}
          className={inputClass}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {loading ? copy["editLookup.submitLoading"] : copy["editLookup.submitLabel"]}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 text-xs text-gray-400 hover:underline"
      >
        {copy["editLookup.cancelLabel"]}
      </button>
    </div>
  );
}

export default function RegisterForm({ copy }: { copy: FormCopy }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [newEditCode, setNewEditCode] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyEditCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  }

  const oshiSuggestions = useMemo(() => {
    const selected = OSHI_DATA.find((d) => d.fandom === form.fandomYume);
    const pool = selected ? [selected] : OSHI_DATA;
    return pool.flatMap((d) => d.characters.map((name) => ({ name, fandom: d.fandom })));
  }, [form.fandomYume]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const fandomYume = form.fandomYume.trim();

    if (form.fandomGive.length === 0) {
      setError("Pilih minimal satu fandom yang diterima (atau centang 'Apa saja').");
      setStatus("error");
      return;
    }

    if (form.contentType.includes("Writing") && form.languageGive.length === 0) {
      setError("Pilih minimal satu bahasa yang bersedia kamu tulis.");
      setStatus("error");
      return;
    }

    if (form.yumeTypeGive.length === 0) {
      setError("Pilih minimal satu tipe yume yang bersedia kamu terima.");
      setStatus("error");
      return;
    }
    const showYumeType2 = showsYumeTypeReceive(form.relationshipType);
    if (showYumeType2 && !form.yumeTypeReceive) {
      setError("Pilih tipe yumeship (2).");
      setStatus("error");
      return;
    }
    if (showYumeType2 && form.yumeTypeReceive === OTHER && !form.yumeTypeReceiveOther.trim()) {
      setError("Isi tipe yumeship (2) yang kamu maksud.");
      setStatus("error");
      return;
    }
    const yumeTypeGive = joinYumeTypeGive(form.yumeTypeGive, form.yumeTypeGiveOther);
    const yumeTypeReceive = !showYumeType2
      ? ""
      : form.yumeTypeReceive === OTHER
        ? form.yumeTypeReceiveOther.trim()
        : form.yumeTypeReceive;

    const payload = {
      consent: form.consent,
      email: form.email,
      twtUser: form.twtUser,
      yumeshipName: form.yumeshipName,
      oshiName: form.oshiName,
      relationshipType: form.relationshipType,
      fandomYume,
      yumeTypeGive,
      yumeTypeReceive,
      contentType: form.contentType.join(", "),
      languageReceive: form.languageReceive.join(", "),
      languageGive: form.languageGive.join(", "),
      fandomGive: form.fandomGive.join(", "),
      avoidList: form.avoidList.map((a) => `${a.character} | ${a.fandom}`).join("; "),
      yumeDocuLink: form.yumeDocuLink,
      notes: form.notes,
      password: form.password,
      editCode,
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
      if (data.editCode) setNewEditCode(data.editCode);
      setStatus("success");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  function relationshipLabel(opt: string): string {
    return copy[`option.relationshipType.${opt}` as keyof FormCopy] ?? opt;
  }

  function yumeTypeLabel(opt: string): string {
    return copy[`option.yumeType.${opt}` as keyof FormCopy] ?? opt;
  }

  function yumeTypeGiveLabel(opt: string): string {
    if (opt === ALL_YUME_TYPES) return copy["option.yumeTypeGive.All"];
    return yumeTypeLabel(opt);
  }

  function contentTypeLabel(opt: string): string {
    return copy[`option.contentType.${opt}` as keyof FormCopy] ?? opt;
  }

  function languageLabel(opt: string): string {
    return copy[`option.language.${opt}` as keyof FormCopy] ?? opt;
  }

  if (status === "success") {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 text-center">
        {newEditCode ? (
          <>
            <h1 className="text-3xl font-bold text-teal-500">{copy["success.registered.title"]}</h1>
            <p className="mt-3 text-gray-500">{copy["success.registered.body"]}</p>
            <div className="mt-5 w-full rounded-lg border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs text-gray-500">{copy["success.registered.codeHint"]}</p>
              <p className="mt-1 text-2xl font-bold tracking-wider text-teal-600">
                {formatEditCodeDisplay(newEditCode)}
              </p>
              <button
                type="button"
                onClick={() => copyEditCode(newEditCode)}
                className="mt-2 text-xs font-medium text-teal-600 hover:underline"
              >
                {copyState === "copied"
                  ? "Tersalin!"
                  : copyState === "failed"
                    ? "Gagal menyalin, salin manual"
                    : copy["success.registered.copyButton"]}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-teal-500">{copy["success.updated.title"]}</h1>
            <p className="mt-3 text-gray-500">{copy["success.updated.body"]}</p>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-teal-100 bg-white shadow-sm">
        <div className="h-2 bg-teal-400" />
        <div className="p-6 text-center">
          <div className="mb-3 flex justify-center">
            <Image src="/yumefess-icon.png" alt="Yumefess" width={72} height={72} />
          </div>
          <h1 className="mb-1 text-3xl font-bold text-teal-500">{copy["header.title"]}</h1>
          <p className="text-sm text-gray-400">{copy["header.subtitle"]}</p>
        </div>
      </div>

      <EditLookupPanel
        copy={copy}
        onLoaded={(loadedForm, code) => {
          setForm(loadedForm);
          setEditCode(code);
        }}
      />

      <section className="space-y-3 rounded-lg border border-teal-100 bg-white shadow-sm p-6 text-sm text-gray-500">
        <h2 className="text-base font-medium text-gray-700">{copy["rules.heading"]}</h2>

        <div>
          <p className="font-medium text-gray-600">{copy["rules.section1.title"]}</p>
          <p className="mt-1">{copy["rules.section1.intro"]}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>
              {copy["rules.section1.item1"]}{" "}
              <a
                href="https://docs.google.com/document/d/1o5zuy5-cCCsJ0nJ8IBzfa9jEFkJChwtgqhYvLltMZxg/edit?tab=t.0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-500 hover:underline"
              >
                Template
              </a>
            </li>
            <li>{copy["rules.section1.item2"]}</li>
            <li>{copy["rules.section1.item3"]}</li>
            <li>{copy["rules.section1.item4"]}</li>
          </ol>
        </div>

        <div>
          <p className="font-medium text-gray-600">{copy["rules.section2.title"]}</p>
          <p className="mt-1">{copy["rules.section2.intro"]}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>{copy["rules.section2.item1"]}</li>
            <li>{copy["rules.section2.item2"]}</li>
            <li>{copy["rules.section2.item3"]}</li>
          </ol>
        </div>

        <div>
          <p className="font-medium text-gray-600">{copy["rules.section3.title"]}</p>
          <p className="mt-1">{copy["rules.section3.body"]}</p>
        </div>

        <p className="font-medium text-amber-600">{copy["rules.warning"]}</p>

        <p>{copy["rules.contact"]}</p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-start gap-3 rounded-lg border border-teal-100 bg-white shadow-sm p-6 text-sm text-gray-700">
          <input
            type="checkbox"
            required
            className="mt-1 h-4 w-4 accent-teal-500"
            checked={form.consent}
            onChange={(e) => update("consent", e.target.checked)}
          />
          <span>
            {copy["consent.label"]} <span className="text-teal-500">*</span>
            <br />
            <span className="text-gray-400">{copy["consent.sublabel"]}</span>
          </span>
        </label>

        <Field label={copy["field.email.label"]} required hint={copy["field.email.hint"]}>
          <input
            type="email"
            required
            className={inputClass}
            placeholder="nama@email.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>

        <Field label={copy["field.twtUser.label"]} required hint={copy["field.twtUser.hint"]}>
          <input
            type="text"
            required
            className={inputClass}
            placeholder="@username"
            value={form.twtUser}
            onChange={(e) => update("twtUser", normalizeTwitterHandle(e.target.value))}
          />
        </Field>

        <Field label={copy["field.yumeshipName.label"]} required>
          <input
            type="text"
            required
            className={inputClass}
            value={form.yumeshipName}
            onChange={(e) => update("yumeshipName", e.target.value)}
          />
        </Field>

        <Field label={copy["field.fandomYume.label"]} required>
          <FandomSingleSelect
            value={form.fandomYume}
            onChange={(v) => update("fandomYume", v)}
          />
        </Field>

        <Field label={copy["field.oshiName.label"]} required hint={copy["field.oshiName.hint"]}>
          <OshiNameSelect
            value={form.oshiName}
            onChange={(v) => update("oshiName", v)}
            suggestions={oshiSuggestions}
          />
        </Field>

        <Field label={copy["field.relationshipType.label"]} required>
          <RadioGroup
            name="relationshipType"
            options={RELATIONSHIP_OPTIONS}
            value={form.relationshipType}
            onChange={(v) => update("relationshipType", v)}
            renderLabel={relationshipLabel}
          />
        </Field>

        {showsYumeTypeReceive(form.relationshipType) && (
          <Field label={copy["field.yumeTypeReceive.label"]} required>
            <RadioGroup
              name="yumeTypeReceive"
              options={YUME_TYPE_OPTIONS}
              value={form.yumeTypeReceive}
              onChange={(v) => update("yumeTypeReceive", v)}
              withOther
              otherValue={form.yumeTypeReceiveOther}
              onOtherChange={(v) => update("yumeTypeReceiveOther", v)}
              renderLabel={yumeTypeLabel}
              otherLabel={copy["option.other.label"]}
            />
          </Field>
        )}

        <Field
          label={copy["field.yumeTypeGive.label"]}
          required
          hint={copy["field.yumeTypeGive.hint"]}
        >
          <CheckboxGroup
            options={YUME_TYPE_GIVE_OPTIONS}
            values={form.yumeTypeGive}
            onChange={(v) => update("yumeTypeGive", v)}
            toggleOption={toggleYumeTypeGive}
            disabledValues={
              form.yumeTypeGive.includes(ALL_YUME_TYPES) ? [...YUME_TYPE_OPTIONS] : []
            }
            renderLabel={yumeTypeGiveLabel}
          />
        </Field>

        <Field
          label={copy["field.contentType.label"]}
          required
          hint={copy["field.contentType.hint"]}
        >
          <CheckboxGroup
            options={CONTENT_TYPE_OPTIONS}
            values={form.contentType}
            onChange={(v) => {
              update("contentType", v);
              if (!v.includes("Writing")) update("languageGive", []);
            }}
            renderLabel={contentTypeLabel}
          />
        </Field>

        {form.contentType.includes("Writing") && (
          <Field
            label={copy["field.languageGive.label"]}
            required
            hint={copy["field.languageGive.hint"]}
          >
            <CheckboxGroup
              options={LANGUAGE_OPTIONS}
              values={form.languageGive}
              onChange={(v) => update("languageGive", v)}
              renderLabel={languageLabel}
            />
          </Field>
        )}

        <Field
          label={copy["field.languageReceive.label"]}
          required
          hint={copy["field.languageReceive.hint"]}
        >
          <CheckboxGroup
            options={LANGUAGE_OPTIONS}
            values={form.languageReceive}
            onChange={(v) => update("languageReceive", v)}
            renderLabel={languageLabel}
          />
        </Field>

        <Field
          label={copy["field.fandomGive.label"]}
          required
          hint={copy["field.fandomGive.hint"]}
        >
          <FandomMultiSelect
            values={form.fandomGive}
            onChange={(v) => update("fandomGive", v)}
          />
        </Field>

        <Field
          label={copy["field.yumeDocuLink.label"]}
          required
          hint={
            <>
              {copy["field.yumeDocuLink.hint"]}{" "}
              <a
                href="https://docs.google.com/document/d/1o5zuy5-cCCsJ0nJ8IBzfa9jEFkJChwtgqhYvLltMZxg/edit?tab=t.0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-500 hover:underline"
              >
                Template
              </a>
            </>
          }
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

        <Field label={copy["field.avoidList.label"]} hint={copy["field.avoidList.hint"]}>
          <AvoidListInput
            values={form.avoidList}
            onChange={(v) => update("avoidList", v)}
          />
        </Field>

        <Field label={copy["field.notes.label"]}>
          <textarea
            className={inputClass}
            rows={4}
            placeholder="Opsional"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>

        <Field label={copy["field.password.label"]} required hint={copy["field.password.hint"]}>
          <input
            type="password"
            required
            className={inputClass}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
        </Field>

        {error && <p className="px-2 text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-4 px-2">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 active:bg-teal-600 disabled:opacity-50"
          >
            {status === "submitting" ? copy["submit.buttonLoading"] : copy["submit.button"]}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(copy["submit.clearConfirm"])) setForm(initialState);
            }}
            className="text-sm font-medium text-teal-600 hover:underline"
          >
            {copy["submit.clearButton"]}
          </button>
        </div>
      </form>
      </div>
    </main>
  );
}
