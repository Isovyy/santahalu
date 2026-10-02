import { db } from "@/lib/db";
import { FORM_COPY_DEFAULTS, type FormCopy } from "@/lib/formCopyDefaults";

export { FORM_COPY_DEFAULTS };
export type { FormCopy, FormCopyKey } from "@/lib/formCopyDefaults";

export async function getFormCopy(): Promise<FormCopy> {
  const rows = await db.orm.public.FormCopy.all();
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...FORM_COPY_DEFAULTS, ...overrides } as FormCopy;
}
