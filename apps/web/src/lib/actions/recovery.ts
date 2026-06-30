"use server";

import { cookies } from "next/headers";
import {
  PASSWORD_RECOVERY_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-cookie";

export async function setPasswordRecoveryCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(PASSWORD_RECOVERY_COOKIE, "1", recoveryCookieOptions);
}

export async function clearPasswordRecoveryCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(PASSWORD_RECOVERY_COOKIE);
}
