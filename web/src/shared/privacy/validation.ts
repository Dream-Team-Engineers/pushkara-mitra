/**
 * Input checks shared by the prototype forms. Entries are validated for shape only; they stay in
 * component memory and are never stored, logged or sent (see tests/guards/frontend-privacy.test.ts).
 */
export function validatePhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(raw.replace(/\s/g, ''));
}

export function validateName(raw: string): boolean {
  const name = raw.trim();
  return name.length >= 1 && name.length <= 60;
}
