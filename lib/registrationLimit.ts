import { db } from "@/lib/db";

// New registrations close once this many participants exist. Edits via an
// edit code are still allowed after the form closes.
export const MAX_REGISTRATIONS = 120;

export async function isRegistrationFull(): Promise<boolean> {
  const { total } = await db.orm.public.Participant.aggregate((a) => ({ total: a.count() }));
  return total >= MAX_REGISTRATIONS;
}
