/**
 * Final-output whitespace hygiene: strip trailing horizontal whitespace on each
 * line and collapse 3+ consecutive newlines to 2, so dropped branches never
 * turn the prompt into gruyère. Block-line residue is handled earlier by
 * `trimBlockLines` (parser side).
 */
export function tidyWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}
