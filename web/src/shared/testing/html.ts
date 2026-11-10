/**
 * Coarse static checks on server-rendered markup. This is not a replacement for axe or a
 * real screen reader: it catches the mistakes that are cheap to detect without a DOM library
 * (unnamed controls, unlabelled inputs, forms, inline styles, unsafe external links).
 */
export function countTag(html: string, tag: string): number {
  return html.match(new RegExp(`<${tag}[\\s>]`, 'g'))?.length ?? 0;
}

export function accessibilityIssues(html: string): string[] {
  const issues: string[] = [];

  for (const match of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const attributes = match[2] ?? '';
    const text = (match[3] ?? '').replace(/<[^>]*>/g, '').trim();
    if (!/aria-label="[^"]+"/.test(attributes) && text === '') {
      issues.push(`unnamed ${match[1] ?? 'control'}: ${match[0].slice(0, 80)}`);
    }
  }

  const labelled = new Set(
    [...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)].map((match) => match[1] ?? ''),
  );
  for (const match of html.matchAll(/<(?:input|select|textarea)\b([^>]*)>/g)) {
    const attributes = match[1] ?? '';
    if (/type="(?:hidden|checkbox|radio)"/.test(attributes) && /aria-label=/.test(attributes)) {
      continue;
    }
    const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
    const named = /aria-label="[^"]+"/.test(attributes) || (id !== undefined && labelled.has(id));
    if (!named) issues.push(`unlabelled field: ${match[0].slice(0, 80)}`);
  }

  for (const match of html.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\balt="/.test(match[1] ?? '')) issues.push(`image without alt: ${match[0].slice(0, 80)}`);
  }
  for (const match of html.matchAll(/<svg\b([^>]*)>/g)) {
    const attributes = match[1] ?? '';
    if (!/aria-hidden="true"/.test(attributes) && !/role="img"/.test(attributes)) {
      issues.push(`svg neither hidden nor labelled: ${match[0].slice(0, 80)}`);
    }
  }

  if (/<form[\s>]/i.test(html)) issues.push('form element (prototype screens must not submit)');
  if (/\sstyle="/.test(html)) issues.push('inline style attribute (blocked by CSP style-src)');
  if (/tabindex="[1-9]/i.test(html)) issues.push('positive tabindex');
  for (const match of html.matchAll(/<a\b([^>]*\bhref="https?:[^>]*)>/g)) {
    const attributes = match[1] ?? '';
    if (!/rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(attributes)) {
      issues.push(`external link without rel="noopener noreferrer": ${match[0].slice(0, 80)}`);
    }
  }
  return issues;
}
