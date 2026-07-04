/** Astral PUA from Big5 user-area hex (no hand-typed PUA literals in tests). */
export function P(hex: string): string {
  return String.fromCodePoint(0xf0000 + Number.parseInt(hex, 16));
}