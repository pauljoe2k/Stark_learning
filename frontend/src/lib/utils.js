import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTimeLeft(isoDate) {
  const diff = new Date(isoDate) - new Date();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, isUrgent: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, mins, isUrgent: days < 7 };
}

