// Admin-editable wording for the public registration form. Every key here is
// a plain-text default; FormCopy rows in the DB hold only the keys an admin
// has overridden (see app/api/admin/form-copy/route.ts). Keep these as the
// single source of truth for both the public form and the admin editor.
//
// No server-only imports here (no `@/lib/db`) — this file is bundled into
// the browser by the admin editor client component.
export const FORM_COPY_DEFAULTS = {
  "header.title": "Secret Santa 2026",
  "header.subtitle": "Santahalu26 registration",

  "editLookup.trigger": "Sudah pernah daftar? Edit jawabanmu di sini.",
  "editLookup.heading": "Edit jawaban yang sudah ada",
  "editLookup.hint": "Masukkan kode edit yang kamu terima saat pertama kali daftar.",
  "editLookup.inputPlaceholder": "Kode edit (mis. AB3D-9FQK)",
  "editLookup.submitLabel": "Muat jawaban",
  "editLookup.submitLoading": "Memuat...",
  "editLookup.cancelLabel": "Batal",

  "rules.heading": "#SantaHalu: Secret Santa EVENT RULES",
  "rules.section1.title": "I - Registration",
  "rules.section1.intro":
    "Kuota pendaftaran 100 orang. Pada saat pendaftaran, harus menyertakan hal hal berikut:",
  "rules.section1.item1":
    "Referensi oc/sona dan referensi cc/oshi, dynamic yumeship, background yumeship, timeline dan lain-lain SELENGKAP-LENGKAPNYA pada Google Document yang disediakan.",
  "rules.section1.item2": "Nama yumeship.",
  "rules.section1.item3":
    "Previous works/karya-karya yumeship yang sudah ada sebagai referensi lebih lanjut (jika ada).",
  "rules.section1.item4": "Preferensi bahasa.",
  "rules.section2.title": "II - Gift",
  "rules.section2.intro":
    'Setiap pendaftar menjadi "Secret Santa" bagi pendaftar yang lain. Setiap Secret Santa akan diberikan satu nama MELALUI EMAIL yang harus diberi hadiah berupa karya art/writing tentang yumeship mereka. Ketentuan karya sebagai berikut:',
  "rules.section2.item1": "Karya bertema musim dingin/natal/tahun baru.",
  "rules.section2.item2":
    "Art minimal colored sketch. Minimal BUST UP untuk non-chibi dan HALF BODY untuk chibi.",
  "rules.section2.item3": "Writing minimal 1000 words.",
  "rules.section3.title": "III - Consequences",
  "rules.section3.body":
    "Setiap peserta diharapkan bertanggungjawab dan mengerti terhadap event Secret Santa ini. Karena penerima Secret Santa digacha, maka writer bisa saja mendapat art, dan sebaliknya. Bagaimanapun, Secret Santa akan dicocokkan sesuai fandom dan oshi. Kami tidak akan memasangkan yang oshinya sama.",
  "rules.warning":
    "⚠ TIDAK MENGUMPULKAN KARYA TANPA KETERANGAN AKAN DIBLOCK OLEH @mlytfess, DI-BAN DARI EVENT-EVENT SELANJUTNYA DAN AKAN KAMI POST DI @MLYTFESS ⚠",
  "rules.contact": "Pertanyaan, kritik, dan saran lebih lanjut bisa disampaikan melalui: @FATUIUWU",

  "consent.label":
    "Saya sudah mengerti peraturan event Secret Santa dan akan bertanggung jawab mengerjakan bagian saya.",
  "consent.sublabel":
    "Iya saya PAHAM dan akan bertanggung jawab serta bersedia untuk mendapatkan pinalti jika tidak memenuhi kewajiban saya.",

  "field.email.label": "Email",
  "field.email.hint": "Pengumuman penerima, konfirmasi, dan hadiah akan dikirim lewat email.",
  "field.twtUser.label": "Username twitter",
  "field.twtUser.hint":
    "Sertakan @ (bila ingin mengganti username selama event berlangsung mohon lapor ke @FATUIUWU)",
  "field.yumeshipName.label": "Nama yumeship",
  "field.fandomYume.label": "Fandom yumeshipmu",
  "field.oshiName.label": "Nama cc/oshi",
  "field.oshiName.hint": "Karakter canon yang di yume",
  "field.relationshipType.label": "Tipe Yumeship",
  "field.yumeTypeReceive.label": "Tipe Yumeship (2)",
  "field.yumeTypeGive.label": "Tipe yume yang bersedia kamu terima",
  "field.yumeTypeGive.hint": "Centang semua yang termasuk",
  "field.contentType.label": "Karya yang kamu beri berupa",
  "field.contentType.hint": "Centang semua yang termasuk",
  "field.languageReceive.label": "Bahasa yang bersedia kamu terima",
  "field.languageReceive.hint": "Centang semua yang termasuk",
  "field.languageGive.label": "Bahasa yang bersedia kamu tulis",
  "field.languageGive.hint": "Centang semua yang termasuk",
  "field.fandomGive.label": "Fandom yang bersedia kamu buatkan hadiah",
  "field.fandomGive.hint":
    "Bila semua cukup centang 'Apa saja'. Cari fandom lalu klik untuk menambah. Fandom yang tidak ada di daftar bisa ditambahkan dengan mengetik namanya.",
  "field.yumeDocuLink.label": "Dokumen Yumeship",
  "field.yumeDocuLink.hint":
    "Tempel link ke Google Doc/Drive yang berisi referensi yumeshipmu. Tidak wajib menggunakan template yang disediakan. Template (bila butuh):",
  "field.avoidList.label": "Karakter/Fandom yang ingin dihindari",
  "field.avoidList.hint":
    "Opsional. Karakter atau fandom tertentu yang tidak ingin kamu buatkan hadiah. Isi fandom dan nama karakter, lalu klik Tambah (bisa lebih dari satu).",
  "field.notes.label": "Notes",

  "option.relationshipType.Romantic": "Romantic",
  "option.relationshipType.Platonic": "Platonic",
  "option.relationshipType.Queerplatonic": "Queerplatonic",
  "option.yumeType.HL": "HL",
  "option.yumeType.GL": "GL",
  "option.yumeType.BL": "BL",
  "option.yumeTypeGive.All": "All",
  "option.contentType.Art": "Art",
  "option.contentType.Writing": "Writing",
  "option.language.Indonesia": "Indonesia",
  "option.language.English": "English",
  "option.other.label": "Yang lain",

  "submit.button": "Daftar",
  "submit.buttonLoading": "Mengirim...",
  "submit.clearButton": "Kosongkan formulir",
  "submit.clearConfirm": "Kosongkan semua isian formulir?",

  "success.registered.title": "Kamu berhasil terdaftar!",
  "success.registered.body": "Terima kasih sudah mendaftar Santahalu26.",
  "success.registered.codeHint":
    "Kode edit kamu (juga dikirim lewat email). Simpan baik-baik untuk mengubah jawabanmu nanti:",
  "success.registered.copyButton": "Salin kode",
  "success.updated.title": "Jawabanmu berhasil diperbarui!",
  "success.updated.body": "Terima kasih sudah memperbarui jawabanmu.",
} as const;

export type FormCopyKey = keyof typeof FORM_COPY_DEFAULTS;
export type FormCopy = Record<FormCopyKey, string>;
