// Translates known Supabase Auth error messages to Spanish so they can be
// shown directly to the user instead of leaking raw English API errors.
const TRANSLATIONS: Array<[RegExp, string]> = [
  [/already been registered/i, "Ya existe un usuario registrado con este correo electrónico."],
  [/already registered/i, "Ya existe un usuario registrado con este correo electrónico."],
];

export function translateAuthError(message: string | null | undefined, fallback: string): string {
  if (!message) return fallback;
  for (const [pattern, translated] of TRANSLATIONS) {
    if (pattern.test(message)) return translated;
  }
  return message;
}
