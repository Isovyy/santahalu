import Link from "next/link";
import { getFormCopy } from "@/lib/formCopy";
import FormCopyEditor from "./FormCopyEditor";

export const dynamic = "force-dynamic";

export default async function FormCopyPage() {
  const copy = await getFormCopy();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link href="/admin" className="text-sm text-teal-500 hover:underline">
        &larr; Back to admin
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-teal-500">Edit teks formulir</h1>
      <p className="mt-1 text-sm text-gray-400">
        Ubah teks yang tampil di formulir pendaftaran (label, hint, peraturan, pilihan jawaban).
        Ini tidak mengubah pertanyaan atau tata letak formulir, hanya kata-katanya.
      </p>

      <div className="mt-6">
        <FormCopyEditor initialCopy={copy} />
      </div>
    </main>
  );
}
