export const PASSWORD_RECOVERY_COOKIE = "password_recovery_pending";

export const recoveryCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 30, // 30 minutes
};
