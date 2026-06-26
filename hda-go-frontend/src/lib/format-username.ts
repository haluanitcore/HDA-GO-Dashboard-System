/** Strip leading @ if present, then prepend exactly one @ */
export function formatUsername(raw?: string | null): string {
  if (!raw) return '@n/a';
  return '@' + raw.replace(/^@+/, '');
}
