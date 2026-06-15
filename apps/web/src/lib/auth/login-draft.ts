const LOGIN_DRAFT_KEY = "choprent-login-draft";

export type LoginDraft = {
  email: string;
  password: string;
  phone: string;
};

const emptyDraft: LoginDraft = { email: "", password: "", phone: "" };

export function readLoginDraft(): LoginDraft {
  if (typeof window === "undefined") return emptyDraft;

  try {
    const raw = sessionStorage.getItem(LOGIN_DRAFT_KEY);
    if (!raw) return emptyDraft;
    const parsed = JSON.parse(raw) as Partial<LoginDraft>;
    return {
      email: parsed.email ?? "",
      password: parsed.password ?? "",
      phone: parsed.phone ?? "",
    };
  } catch {
    return emptyDraft;
  }
}

export function writeLoginDraft(draft: LoginDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LOGIN_DRAFT_KEY, JSON.stringify(draft));
}

export function clearLoginDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LOGIN_DRAFT_KEY);
}
