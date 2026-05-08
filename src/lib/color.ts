export const PALETTE = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#52525b', // zinc-600
] as const;

export function nextColor(usedColors: string[]): string {
  const available = PALETTE.find((c) => !usedColors.includes(c));
  return available ?? PALETTE[usedColors.length % PALETTE.length];
}
