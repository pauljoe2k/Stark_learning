import { randomInt } from 'node:crypto';

export function chooseRandomPlace(places) {
  if (!places.length) return null;
  return places[randomInt(places.length)];
}