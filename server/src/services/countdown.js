const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function daysUntil(date, now = new Date()) {
  const targetDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const currentDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.ceil((targetDay - currentDay) / millisecondsPerDay));
}

export function countdownTone(days) {
  if (days <= 3) return 'red';
  if (days <= 14) return 'amber';
  return 'calm';
}