import { getFormCopy } from "@/lib/formCopy";
import { isRegistrationFull } from "@/lib/registrationLimit";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [copy, registrationClosed] = await Promise.all([getFormCopy(), isRegistrationFull()]);
  return <RegisterForm copy={copy} registrationClosed={registrationClosed} />;
}
