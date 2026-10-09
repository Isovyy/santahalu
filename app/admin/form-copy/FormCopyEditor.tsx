"use client";

import { useState } from "react";
import { FORM_COPY_DEFAULTS, type FormCopy, type FormCopyKey } from "@/lib/formCopyDefaults";

interface CopyField {
  key: FormCopyKey;
  label: string;
  multiline?: boolean;
}

interface CopySection {
  title: string;
  fields: CopyField[];
}

const SECTIONS: CopySection[] = [
  {
    title: "Header",
    fields: [
      { key: "header.title", label: "Judul" },
      { key: "header.subtitle", label: "Subjudul" },
    ],
  },
  {
    title: "Panel edit jawaban",
    fields: [
      { key: "editLookup.trigger", label: "Tombol pembuka" },
      { key: "editLookup.heading", label: "Judul panel" },
      { key: "editLookup.hint", label: "Hint" },
      { key: "editLookup.inputPlaceholder", label: "Placeholder kode edit" },
      { key: "editLookup.submitLabel", label: "Tombol submit" },
      { key: "editLookup.submitLoading", label: "Teks saat loading" },
      { key: "editLookup.cancelLabel", label: "Tombol batal" },
    ],
  },
  {
    title: "Peraturan",
    fields: [
      { key: "rules.heading", label: "Judul" },
      { key: "rules.fullLink.label", label: "Rules lengkap - Teks" },
      { key: "rules.fullLink.text", label: "Rules lengkap - Teks link" },
      { key: "rules.fullLink.url", label: "Rules lengkap - Link" },
      { key: "rules.section1.title", label: "I - Judul bagian" },
      { key: "rules.section1.intro", label: "I - Intro", multiline: true },
      {
        key: "rules.section1.item1",
        label: "I - Item 1 (sebelum link Template, link tidak bisa diubah di sini)",
        multiline: true,
      },
      { key: "rules.section1.item2", label: "I - Item 2" },
      { key: "rules.section1.item3", label: "I - Item 3", multiline: true },
      { key: "rules.section1.item4", label: "I - Item 4" },
      { key: "rules.section2.title", label: "II - Judul bagian" },
      { key: "rules.section2.intro", label: "II - Intro", multiline: true },
      { key: "rules.section2.item1", label: "II - Item 1" },
      { key: "rules.section2.item2", label: "II - Item 2", multiline: true },
      { key: "rules.section2.item3", label: "II - Item 3" },
      { key: "rules.section3.title", label: "III - Judul bagian" },
      { key: "rules.section3.body", label: "III - Isi", multiline: true },
      { key: "rules.warning", label: "Peringatan", multiline: true },
      { key: "rules.contact", label: "Kontak" },
    ],
  },
  {
    title: "Persetujuan",
    fields: [
      { key: "consent.label", label: "Label utama", multiline: true },
      { key: "consent.sublabel", label: "Sublabel", multiline: true },
    ],
  },
  {
    title: "Pertanyaan formulir",
    fields: [
      { key: "field.email.label", label: "Email - label" },
      { key: "field.email.hint", label: "Email - hint" },
      { key: "field.twtUser.label", label: "Username twitter - label" },
      { key: "field.twtUser.hint", label: "Username twitter - hint" },
      { key: "field.yumeshipName.label", label: "Nama yumeship - label" },
      { key: "field.fandomYume.label", label: "Fandom yumeshipmu - label" },
      { key: "field.oshiName.label", label: "Nama cc/oshi - label" },
      { key: "field.oshiName.hint", label: "Nama cc/oshi - hint" },
      { key: "field.relationshipType.label", label: "Tipe Yumeship - label" },
      { key: "field.yumeTypeReceive.label", label: "Orientasi Yumeship - label" },
      { key: "field.yumeTypeGive.label", label: "Tipe yume diterima - label" },
      { key: "field.yumeTypeGive.hint", label: "Tipe yume diterima - hint" },
      { key: "field.contentType.label", label: "Karya - label" },
      { key: "field.contentType.hint", label: "Karya - hint" },
      { key: "field.languageReceive.label", label: "Bahasa diterima - label" },
      { key: "field.languageReceive.hint", label: "Bahasa diterima - hint" },
      { key: "field.languageGive.label", label: "Bahasa ditulis - label" },
      { key: "field.languageGive.hint", label: "Bahasa ditulis - hint" },
      { key: "field.fandomGive.label", label: "Fandom diberikan - label" },
      { key: "field.fandomGive.hint", label: "Fandom diberikan - hint", multiline: true },
      { key: "field.yumeDocuLink.label", label: "Dokumen Yumeship - label" },
      {
        key: "field.yumeDocuLink.hint",
        label: "Dokumen Yumeship - hint (sebelum link Template, link tidak bisa diubah di sini)",
        multiline: true,
      },
      { key: "field.avoidList.label", label: "Avoid list - label" },
      { key: "field.avoidList.hint", label: "Avoid list - hint", multiline: true },
      { key: "field.notes.label", label: "Notes - label" },
      { key: "field.password.label", label: "Kata sandi - label" },
      { key: "field.password.hint", label: "Kata sandi - hint (diikuti link Rules lengkap)", multiline: true },
    ],
  },
  {
    title: "Pilihan jawaban",
    fields: [
      { key: "option.relationshipType.Romantic", label: "Tipe Yumeship: Romantic" },
      { key: "option.relationshipType.Platonic", label: "Tipe Yumeship: Platonic" },
      { key: "option.relationshipType.Queerplatonic", label: "Tipe Yumeship: Queerplatonic" },
      { key: "option.yumeType.HL", label: "Yumeship type: HL" },
      { key: "option.yumeType.GL", label: "Yumeship type: GL" },
      { key: "option.yumeType.BL", label: "Yumeship type: BL" },
      { key: "option.yumeTypeGive.All", label: "Tipe yume diterima: All" },
      { key: "option.contentType.Art", label: "Karya: Art" },
      { key: "option.contentType.Writing", label: "Karya: Writing" },
      { key: "option.language.Indonesia", label: "Bahasa: Indonesia" },
      { key: "option.language.English", label: "Bahasa: English" },
      { key: "option.other.label", label: '"Yang lain" (Orientasi Yumeship)' },
    ],
  },
  {
    title: "Tombol & pesan sukses",
    fields: [
      { key: "submit.button", label: "Tombol daftar" },
      { key: "submit.buttonLoading", label: "Tombol daftar (loading)" },
      { key: "submit.clearButton", label: "Tombol kosongkan" },
      { key: "submit.clearConfirm", label: "Konfirmasi kosongkan" },
      { key: "success.registered.title", label: "Sukses daftar - judul" },
      { key: "success.registered.body", label: "Sukses daftar - isi" },
      { key: "success.registered.codeHint", label: "Sukses daftar - hint kode", multiline: true },
      { key: "success.registered.copyButton", label: "Sukses daftar - tombol salin" },
      { key: "success.updated.title", label: "Sukses update - judul" },
      { key: "success.updated.body", label: "Sukses update - isi" },
    ],
  },
];

export default function FormCopyEditor({ initialCopy }: { initialCopy: FormCopy }) {
  const [baseline, setBaseline] = useState(initialCopy);
  const [values, setValues] = useState(initialCopy);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const dirtyKeys = (Object.keys(values) as FormCopyKey[]).filter(
    (k) => values[k] !== baseline[k],
  );

  function set(key: FormCopyKey, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  function resetToDefault(key: FormCopyKey) {
    set(key, FORM_COPY_DEFAULTS[key]);
  }

  async function save() {
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    setStatus("idle");
    const changes = Object.fromEntries(dirtyKeys.map((k) => [k, values[k]]));
    try {
      const res = await fetch("/api/admin/form-copy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setBaseline(values);
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {SECTIONS.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-medium text-gray-800">{section.title}</h2>
          <div className="mt-4 space-y-4">
            {section.fields.map((field) => {
              const isDefault = values[field.key] === FORM_COPY_DEFAULTS[field.key];
              return (
                <div key={field.key}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-gray-700">{field.label}</label>
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => resetToDefault(field.key)}
                        className="text-xs text-teal-600 hover:underline"
                      >
                        Kembalikan ke default
                      </button>
                    )}
                  </div>
                  {field.multiline ? (
                    <textarea
                      value={values[field.key]}
                      onChange={(e) => set(field.key, e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.key]}
                      onChange={(e) => set(field.key, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 border-t border-teal-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-sm text-gray-500">
            {dirtyKeys.length === 0
              ? status === "saved"
                ? "Tersimpan."
                : "Tidak ada perubahan."
              : `${dirtyKeys.length} teks belum disimpan.`}
            {status === "error" && (
              <span className="ml-2 text-red-500">Gagal menyimpan, coba lagi.</span>
            )}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={saving || dirtyKeys.length === 0}
            className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
