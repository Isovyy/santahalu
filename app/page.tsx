import { getFormCopy } from "@/lib/formCopy";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const copy = await getFormCopy();
  return <RegisterForm copy={copy} />;
}
