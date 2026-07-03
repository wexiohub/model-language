/** Levenshtein edit distance (rolling row). */
function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(
        Math.min((curr[j - 1] as number) + 1, (prev[j] as number) + 1, (prev[j - 1] as number) + cost),
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j] as number;
  }
  return prev[b.length] as number;
}

/** The closest known path within an edit distance of 2, or undefined. */
export function nearestPath(path: string, known: string[]): string | undefined {
  let best: string | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const candidate of known) {
    const d = levenshtein(path, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return bestDist <= 2 ? best : undefined;
}
