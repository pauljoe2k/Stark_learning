const weights = Object.freeze({ covered: 1, partial: 0.5, incorrect: 0, missing: 0 });

export function calculateScore(points) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new TypeError('At least one explanation point is required to calculate a score.');
  }
  return Math.round(points.reduce((sum, point) => {
    const weight = weights[point.status];
    if (weight === undefined) throw new TypeError(`Unsupported explanation status: ${point.status}`);
    return sum + weight;
  }, 0) / points.length * 100);
}