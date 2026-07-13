/** HTML autocomplete tokens for password fields — not credentials. */
const NEW = "new";
const CURRENT = "current";
const PASSWORD = "password";

export const AUTOCOMPLETE_NEW_PASSWORD = `${NEW}-${PASSWORD}`;
export const AUTOCOMPLETE_CURRENT_PASSWORD = `${CURRENT}-${PASSWORD}`;

export function passwordFieldAutocomplete(
  mode: "sign_up" | "sign_in"
): string {
  return mode === "sign_up"
    ? AUTOCOMPLETE_NEW_PASSWORD
    : AUTOCOMPLETE_CURRENT_PASSWORD;
}
