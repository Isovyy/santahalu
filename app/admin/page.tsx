import Link from "next/link";
import { db } from "@/lib/db";
import RunMatchingForm from "./RunMatchingForm";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [{ total: participantCount }, runs] = await Promise.all([
    db.orm.public.Participant.aggregate((a) => ({ total: a.count() })),
    db.orm.public.MatchRun.orderBy((r) => r.createdAt.desc()).limit(20).all(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 lg:max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-teal-500">Admin</h1>
        <LogoutButton />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-teal-100 bg-white shadow-sm p-5">
          <h2 className="text-lg font-medium text-gray-800">Participants</h2>
          <p className="mt-1 text-3xl font-semibold text-teal-500">{participantCount}</p>
          <p className="mt-1 text-sm text-gray-400">registered so far</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/responses"
              className="inline-block rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 active:bg-teal-600"
            >
              View responses
            </Link>
            <Link
              href="/admin/drive-folders"
              className="inline-block rounded-lg border border-teal-200 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50"
            >
              Buat folder Drive
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-teal-100 bg-white shadow-sm p-5">
          <h2 className="text-lg font-medium text-gray-800">Run matching</h2>
          <p className="mt-1 text-sm text-gray-400">
            Uses all currently registered participants. Give the same seed to reproduce the same
            result later.
          </p>
          <div className="mt-4">
            <RunMatchingForm disabled={participantCount < 2} />
          </div>
          {participantCount < 2 && (
            <p className="mt-3 text-sm text-amber-600">Need at least 2 participants to run matching.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-teal-100 bg-white shadow-sm p-5">
        <h2 className="text-lg font-medium text-gray-800">Past runs</h2>
        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No matching runs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-teal-100">
            {runs.map((run) => (
              <li key={run.id} className="flex items-center justify-between py-2 text-sm">
                <div className="text-gray-600">
                  {run.createdAt.toLocaleString()}{" "}
                  <span className="text-gray-400">
                    ({run.matchedPairs}/{run.totalParticipants} matched
                    {run.seed !== null ? `, seed ${run.seed}` : ""})
                  </span>
                </div>
                <Link href={`/admin/results/${run.id}`} className="text-teal-500 hover:underline">
                  View results
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* <section className="mt-6 rounded-2xl border border-teal-100 bg-white shadow-sm p-5">
        <h2 className="text-lg font-medium text-gray-800">Panduan admin</h2>
        <p className="mt-1 text-sm text-gray-500">
          Urutan kerja dari awal pendaftaran sampai semua hadiah terkumpul.
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-gray-600">
          <li>
            Peserta mendaftar sendiri lewat halaman utama. Mereka dapat kode edit (juga dikirim
            ke email) untuk mengubah jawabannya sendiri kapan saja.
          </li>
          <li>
            Cek <strong>Semua Jawaban</strong>, terutama tab Flagged, untuk fandom yang tidak ada
            di daftar (typo atau fandom baru). Perbaiki manual lewat &quot;Tinjau &amp;
            edit&quot; kalau perlu.
          </li>
          <li>
            Klik &quot;Run matching&quot; di atas. Bisa kasih seed yang sama untuk mengulang
            hasil yang persis sama kalau perlu coba-coba dulu.
          </li>
          <li>
            Klik &quot;View results&quot; pada run yang baru dibuat. Tabel Matched pairs
            menunjukkan fandom, oshi, bahasa, dan avoid list giver side-by-side supaya gampang
            dicek masuk akal atau tidak sebelum dikirim.
          </li>
          <li>
            Dari halaman hasil, klik &quot;Kirim email&quot; &rarr; tab Kirim email pasangan.
            Setiap giver dapat info penerimanya plus link untuk konfirmasi atau lapor masalah.
          </li>
          <li>
            Peserta punya waktu 2x24 jam untuk konfirmasi pasangannya atau lapor masalah lewat
            link di email. Statusnya otomatis muncul di tab Kirim email pasangan.
          </li>
          <li>
            Buka &quot;Reshuffle pasangan&quot; dari halaman hasil. Pasangan yang lapor masalah
            sudah tercentang otomatis. Kalau tidak ada kandidat yang cocok, centang beberapa
            pasangan lain supaya ada lebih banyak opsi, lalu klik Reshuffle.
          </li>
          <li>
            Pasangan yang berhasil direshuffle otomatis kembali ke status &quot;Belum
            dikirim&quot;. Kirim ulang email pasangannya seperti langkah 5.
          </li>
          <li>
            Setelah cukup banyak yang konfirmasi, buka &quot;Buat folder Drive&quot; dan buat
            folder untuk peserta yang belum punya. Link foldernya otomatis tersimpan ke jawaban
            masing-masing peserta.
          </li>
          <li>
            Di halaman &quot;Kirim email&quot;, tab Kirim link folder hanya menampilkan giver
            yang sudah konfirmasi pasangannya. Kirim seperti biasa.
          </li>
          <li>
            Giver upload hadiahnya langsung ke folder Drive, lalu klik link &quot;tandai sudah
            upload&quot; di email yang sama. Status ini terlihat di tab Kirim link folder.
          </li>
          <li>
            Mendekati deadline, tab Kirim reminder H-5 otomatis pilih giver yang belum upload.
            Bisa dikirim ulang kapan saja.
          </li>
          <li>
            Peserta bisa minta perpanjangan maksimal 3 hari lewat link di email pasangan atau
            reminder. Ini otomatis disetujui (sekali saja per peserta), tidak perlu persetujuan
            admin. Statusnya terlihat di tab Kirim reminder H-5.
          </li>
        </ol>

        <h3 className="mt-5 font-medium text-gray-700">Pertanyaan umum</h3>
        <dl className="mt-2 space-y-3 text-sm text-gray-600">
          <div>
            <dt className="font-medium text-gray-700">Peserta lupa kode edit mereka?</dt>
            <dd>
              Buka jawaban peserta di Semua Jawaban, ada tombol untuk membuat kode edit baru
              untuk mereka.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">
              Peserta salah daftar dua kali / minta ganti email?
            </dt>
            <dd>
              Mereka bisa pakai kode edit mereka untuk mengubah email dan jawaban lain sendiri,
              tidak perlu bikin entri baru.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">
              Tidak ada kandidat cocok saat reshuffle?
            </dt>
            <dd>
              Tambahkan lebih banyak pasangan ke pilihan di halaman Reshuffle, lalu coba lagi.
              Semakin banyak pasangan yang dimasukkan, semakin besar kemungkinan ada kecocokan.
            </dd>
          </div>
        </dl>
      </section> */}
    </main>
  );
}
