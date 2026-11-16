/**
 * Turns a known phrase inside a plain-text string into a link.
 *
 * Why this exists rather than putting an `<a>` in the copy: the paragraphs
 * this runs on are CMS content. An editor can rewrite them in wp-admin at any
 * time (and has - the Statement of Value heading and paragraphs were edited on
 * 2026-11-16), so a link hard-coded into the seed would be lost the moment
 * they retyped the sentence. Matching the phrase at render time means the link
 * survives their edits, and appears automatically if they use the phrase again.
 *
 * The text is escaped FIRST and the anchor spliced into the escaped output, so
 * a `<` or `&` an editor types is rendered as text rather than markup. The
 * phrase itself is matched against the raw string, then escaped before being
 * written back, so nothing an editor can type turns into HTML.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
}

/** Escapes a string for safe use inside a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface LinkPhraseOptions {
  /** Link every occurrence rather than only the first. Default: first only. */
  all?: boolean;
}

/**
 * Returns HTML: `text` escaped, with `phrase` wrapped in an anchor to `href`.
 *
 * Only the first occurrence is linked by default - repeating the same link in
 * consecutive sentences reads as clutter, and the first mention is the one a
 * reader follows. Matching is case-sensitive, so the phrase has to appear as
 * written; a near-miss simply leaves the text unlinked rather than guessing.
 *
 * Returns escaped text unchanged when the phrase is absent, so a caller never
 * has to check first.
 */
export function linkPhrase(
  text: string,
  phrase: string,
  href: string,
  options: LinkPhraseOptions = {},
): string {
  const escapedText = escapeHtml(text);
  const escapedPhrase = escapeHtml(phrase);
  if (!escapedText.includes(escapedPhrase)) return escapedText;

  // cyan-600 is the house link colour on a light background (see the `link`
  // button variant). NOT cyan-700: this project defines its own cyan ramp and
  // it stops at 600, so `text-cyan-700` fell through to Tailwind's stock cyan -
  // a different hue from the brand, and nothing in the palette.
  const anchor =
    `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"` +
    ` class="text-cyan-600 underline underline-offset-4 transition-colors hover:text-cyan-550">` +
    `${escapedPhrase}</a>`;

  const pattern = new RegExp(escapeRegExp(escapedPhrase), options.all ? 'g' : '');
  return escapedText.replace(pattern, anchor);
}

/**
 * Links the phrase in the FIRST paragraph that contains it, and escapes the
 * rest untouched.
 *
 * A section whose copy mentions the Guild twice does not want the same link
 * twice - the second one reads as clutter and adds nothing a reader would
 * click. Which paragraph wins is decided from the text as it arrives, so if an
 * editor reorders or rewrites the paragraphs in wp-admin the link simply
 * follows the first mention.
 */
export function linkPhraseOnce(texts: readonly string[], phrase: string, href: string): string[] {
  let linked = false;
  return texts.map((text) => {
    if (linked || !text.includes(phrase)) return escapeHtml(text);
    linked = true;
    return linkPhrase(text, phrase, href);
  });
}
