/**
 * Normalizes an answer string for comparison.
 * 1. Removes % symbols
 * 2. Removes all whitespace
 * 3. Converts comma decimals to dot decimals
 * 4. Parses to a number when possible (so "40.0" equals 40)
 * 5. Falls back to lowercase string comparison
 */
export function normalizeAnswer(val: string): number | string {
  const cleaned = val
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".");

  if (cleaned !== "") {
    const n = Number(cleaned);
    if (!isNaN(n)) return n;
  }

  return cleaned.toLowerCase();
}

/**
 * Returns true if the user's answer matches the correct answer
 * after normalization. Safe for all question types.
 */
export function answersMatch(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer.trim()) return false;
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}
