"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParticipantRow } from "./fields";
import {
  RELATIONSHIP_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  YUME_TYPE_RECEIVE_OPTIONS,
  showsYumeTypeReceive,
  splitYumeTypeReceive,
  OTHER,
  splitMulti,
  parseAvoidListValue,
  inputClass,
  Field,
  RadioGroup,
  CheckboxGroup,
  AvoidListInput,
  FandomMultiSelect,
  FandomSingleSelect,
  normalizeTwitterHandle,
} from "@/app/RegisterFields";

export default function EditParticipantForm({
  row,
  onCancel,
  onSaved,
}: {
  row: ParticipantRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(row.email);
  const [twtUser, setTwtUser] = useState(row.twtUser);
  const [yumeshipName, setYumeshipName] = useState(row.yumeshipName);
  const [oshiName, setOshiName] = useState(row.oshiName);
  const [relationshipType, setRelationshipType] = useState(row.relationshipType);
  const [fandomYume, setFandomYume] = useState(row.fandomYume);
  const initialYumeType = splitYumeTypeReceive(row.yumeTypeReceive);
  const [yumeTypeReceive, setYumeTypeReceive] = useState(initialYumeType.yumeTypeReceive);
  const [yumeTypeReceiveOther, setYumeTypeReceiveOther] = useState(
    initialYumeType.yumeTypeReceiveOther,
  );
  const [contentType, setContentType] = useState(splitMulti(row.contentType));
  const [languageReceive, setLanguageReceive] = useState(splitMulti(row.languageReceive));
  const [languageGive, setLanguageGive] = useState(splitMulti(row.languageGive));
  const [fandomGive, setFandomGive] = useState(splitMulti(row.fandomGive));
  const [avoidList, setAvoidList] = useState(parseAvoidListValue(row.avoidList));
  const [yumeDocuLink, setYumeDocuLink] = useState(row.yumeDocuLink);
  const [notes, setNotes] = useState(row.notes);
  const [folderLink, setFolderLink] = useState(row.folderLink);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const showYumeType = showsYumeTypeReceive(relationshipType);
    const yumeTypeReceiveFinal = !showYumeType
      ? ""
      : yumeTypeReceive === OTHER
        ? yumeTypeReceiveOther.trim()
        : yumeTypeReceive;

    const payload = {
      email,
      twtUser,
      yumeshipName,
      oshiName,
      relationshipType,
      fandomYume,
      yumeTypeReceive: yumeTypeReceiveFinal,
      contentType: contentType.join(", "),
      languageReceive: languageReceive.join(", "),
      languageGive: languageGive.join(", "),
      fandomGive: fandomGive.join(", "),
      avoidList: avoidList.map((a) => `${a.character} | ${a.fandom}`).join("; "),
      yumeDocuLink,
      notes,
      folderLink,
    };

    try {
      const res = await fetch(`/api/admin/participants/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan.");
        setSaving(false);
        return;
      }
      onSaved();
      router.refresh();
    } catch {
      setError("Network error, coba lagi.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email" required>
        <input
          type="email"
          required
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Username twitter" required>
        <input
          type="text"
          required
          className={inputClass}
          value={twtUser}
          onChange={(e) => setTwtUser(normalizeTwitterHandle(e.target.value))}
        />
      </Field>

      <Field label="Nama yumeship" required>
        <input
          type="text"
          required
          className={inputClass}
          value={yumeshipName}
          onChange={(e) => setYumeshipName(e.target.value)}
        />
      </Field>

      <Field label="Fandom yumeshipmu" required>
        <FandomSingleSelect value={fandomYume} onChange={setFandomYume} />
      </Field>

      <Field label="Nama cc/oshi" required>
        <input
          type="text"
          required
          className={inputClass}
          value={oshiName}
          onChange={(e) => setOshiName(e.target.value)}
        />
      </Field>

      <Field label="Tipe Yumeship" required>
        <RadioGroup
          name="edit-relationshipType"
          options={RELATIONSHIP_OPTIONS}
          value={relationshipType}
          onChange={setRelationshipType}
        />
      </Field>

      {showsYumeTypeReceive(relationshipType) && (
        <Field label="Yume type yang kamu bersedia terima">
          <RadioGroup
            name="edit-yumeTypeReceive"
            options={YUME_TYPE_RECEIVE_OPTIONS}
            value={yumeTypeReceive}
            onChange={setYumeTypeReceive}
            withOther
            otherValue={yumeTypeReceiveOther}
            onOtherChange={setYumeTypeReceiveOther}
          />
        </Field>
      )}

      <Field label="Karya yang kamu beri berupa" required>
        <CheckboxGroup
          options={CONTENT_TYPE_OPTIONS}
          values={contentType}
          onChange={(v) => {
            setContentType(v);
            if (!v.includes("Writing")) setLanguageGive([]);
          }}
        />
      </Field>

      <Field label="Bahasa yang bersedia kamu terima" required>
        <CheckboxGroup
          options={LANGUAGE_OPTIONS}
          values={languageReceive}
          onChange={setLanguageReceive}
        />
      </Field>

      {contentType.includes("Writing") && (
        <Field label="Bahasa yang bersedia kamu tulis" required>
          <CheckboxGroup
            options={LANGUAGE_OPTIONS}
            values={languageGive}
            onChange={setLanguageGive}
          />
        </Field>
      )}

      <Field label="Fandom yang bersedia kamu buatkan hadiah" required>
        <FandomMultiSelect values={fandomGive} onChange={setFandomGive} />
      </Field>

      <Field label="Dokumen Yumeship" required>
        <input
          type="url"
          required
          className={inputClass}
          value={yumeDocuLink}
          onChange={(e) => setYumeDocuLink(e.target.value)}
        />
      </Field>

      <Field label="Karakter yang ingin dihindari">
        <AvoidListInput values={avoidList} onChange={setAvoidList} />
      </Field>

      <Field label="Notes">
        <textarea
          className={inputClass}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <Field label="Link folder Drive (untuk terima hadiah)">
        <input
          type="url"
          className={inputClass}
          value={folderLink}
          onChange={(e) => setFolderLink(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
        />
      </Field>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan perubahan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-sm text-gray-500 hover:underline"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
