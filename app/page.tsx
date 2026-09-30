"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { OSHI_DATA } from "@/lib/oshi-data";
import {
  RELATIONSHIP_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
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
  };
}

function EditLookupPanel({
  onLoaded,
}: {
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
        className="text-sm font-medium text-teal-600 hover:underline"
      >
        Sudah pernah daftar? Edit jawabanmu di sini.
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-teal-100 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium text-gray-800">Edit jawaban yang sudah ada</h2>
      <p className="mt-1 text-xs text-gray-400">
        Masukkan kode edit yang kamu terima saat pertama kali daftar.
      </p>
      <form onSubmit={handleLookup} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          required
          placeholder="Kode edit (mis. AB3D-9FQK)"
          className={inputClass}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Muat jawaban"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 text-xs text-gray-400 hover:underline"
      >
        Batal
      </button>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [newEditCode, setNewEditCode] = useState<string | null>(null);

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

    const payload = {
      consent: form.consent,
      email: form.email,
      twtUser: form.twtUser,
      yumeshipName: form.yumeshipName,
      oshiName: form.oshiName,
      relationshipType: form.relationshipType,
      fandomYume,
      contentType: form.contentType.join(", "),
      languageReceive: form.languageReceive.join(", "),
      languageGive: form.languageGive.join(", "),
      fandomGive: form.fandomGive.join(", "),
      avoidList: form.avoidList.map((a) => `${a.character} | ${a.fandom}`).join("; "),
      yumeDocuLink: form.yumeDocuLink,
      notes: form.notes,
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

  if (status === "success") {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 text-center">
        {newEditCode ? (
          <>
            <h1 className="text-3xl font-bold text-teal-500">Kamu berhasil terdaftar!</h1>
            <p className="mt-3 text-gray-500">Terima kasih sudah mendaftar Santahalu26.</p>
            <div className="mt-5 w-full rounded-lg border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs text-gray-500">
                Kode edit kamu (juga dikirim lewat email). Simpan baik-baik untuk mengubah jawabanmu nanti:
              </p>
              <p className="mt-1 text-2xl font-bold tracking-wider text-teal-600">
                {formatEditCodeDisplay(newEditCode)}
              </p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(newEditCode)}
                className="mt-2 text-xs font-medium text-teal-600 hover:underline"
              >
                Salin kode
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-teal-500">Jawabanmu berhasil diperbarui!</h1>
            <p className="mt-3 text-gray-500">Terima kasih sudah memperbarui jawabanmu.</p>
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
          <h1 className="mb-1 text-3xl font-bold text-teal-500">Secret Santa 2026</h1>
          <p className="text-sm text-gray-400">Santahalu26 registration</p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-teal-100 bg-white shadow-sm p-6 text-sm text-gray-500">
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
            tidak akan  memasangkan yang oshinya sama.
          </p>
        </div>

        <p className="font-medium text-amber-600">
          ⚠ TIDAK MENGUMPULKAN KARYA TANPA KETERANGAN AKAN DIBLOCK OLEH @mlytfess, DI-BAN DARI
          EVENT-EVENT SELANJUTNYA DAN AKAN KAMI POST DI @MLYTFESS ⚠
        </p>

        <p>
          Pertanyaan, kritik, dan saran lebih lanjut bisa disampaikan melalui: @FATUIUWU
        </p>
      </section>

      <EditLookupPanel
        onLoaded={(loadedForm, code) => {
          setForm(loadedForm);
          setEditCode(code);
        }}
      />

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
            placeholder="nama@email.com"
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
            placeholder="@username"
            value={form.twtUser}
            onChange={(e) => update("twtUser", normalizeTwitterHandle(e.target.value))}
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
          <FandomSingleSelect
            value={form.fandomYume}
            onChange={(v) => update("fandomYume", v)}
          />
        </Field>

        <Field label="Nama cc/oshi" required hint="Karakter canon yang di yume">
          <OshiNameSelect
            value={form.oshiName}
            onChange={(v) => update("oshiName", v)}
            suggestions={oshiSuggestions}
          />
        </Field>

        <Field label="Tipe Yumeship" required>
          <RadioGroup
            name="relationshipType"
            options={RELATIONSHIP_OPTIONS}
            value={form.relationshipType}
            onChange={(v) => update("relationshipType", v)}
          />
        </Field>

        <Field label="Karya yang kamu beri berupa" required hint="Centang semua yang termasuk">
          <CheckboxGroup
            options={CONTENT_TYPE_OPTIONS}
            values={form.contentType}
            onChange={(v) => {
              update("contentType", v);
              if (!v.includes("Writing")) update("languageGive", []);
            }}
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

        {form.contentType.includes("Writing") && (
          <Field
            label="Bahasa yang bersedia kamu tulis"
            required
            hint="Centang semua yang termasuk"
          >
            <CheckboxGroup
              options={LANGUAGE_OPTIONS}
              values={form.languageGive}
              onChange={(v) => update("languageGive", v)}
            />
          </Field>
        )}

        <Field
          label="Fandom yang bersedia kamu buatkan hadiah"
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
          hint={
            <>
              Tempel link ke Google Doc/Drive yang berisi referensi yumeshipmu. Tidak wajib menggunakan template yang disediakan.
              Template (bila butuh): {" "}
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
            placeholder="Opsional"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>

        {error && <p className="px-2 text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-4 px-2">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 active:bg-teal-600 disabled:opacity-50"
          >
            {status === "submitting" ? "Mengirim..." : "Daftar"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Kosongkan semua isian formulir?")) setForm(initialState);
            }}
            className="text-sm font-medium text-teal-600 hover:underline"
          >
            Kosongkan formulir
          </button>
        </div>
      </form>
      </div>
    </main>
  );
}
