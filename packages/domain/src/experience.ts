export function experienceForLevel(level: number): number {
  const value = Math.max(1, Math.floor(level));
  return (100 * (((value - 6) * value + 17) * value - 12)) / 6;
}

export function experienceProgress(level: number, experience: number): number {
  const current = experienceForLevel(level);
  const next = experienceForLevel(level + 1);
  if (next <= current) return 1;
  return Math.min(1, Math.max(0, (experience - current) / (next - current)));
}
