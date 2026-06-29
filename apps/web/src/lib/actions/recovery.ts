"use server";

import { cookies } from "next/headers";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/recovery-cookie";

export async function clearPasswordRecoveryCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(PASSWORD_RECOVERY_COOKIE);
}
