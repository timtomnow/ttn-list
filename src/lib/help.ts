// Loads in-app help guides from `src/content/help/*.md` at build time.
//
// Each guide is a Markdown file with a small YAML-ish frontmatter block:
//
//   ---
//   title: Build a saved list
//   category: Lists & runs
//   order: 10
//   summary: Assemble items and groups into a list you can run.
//   ---
//   <markdown body…>
//
// The `ttn-docs` Claude Skill writes these files; this module is the contract
// it targets. Keep the frontmatter keys below in sync with the skill template.

export type Heading = {
  level: number; // 2 = ##, 3 = ###
  text: string;
  id: string; // slug of the heading text, unique within a guide
};

export type HelpGuide = {
  slug: string;
  title: string;
  category: string;
  order: number;
  summary: string;
  body: string;
  headings: Heading[]; // the "steps" within a process, for in-page tables of contents
};

/** Lowercase, dash-separated slug used for both URLs and in-page anchor ids. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** URL slug for a section (category) name, e.g. "Lists & runs" → "lists-runs". */
export function categorySlug(category: string): string {
  return slugify(category);
}

/** Pull the ## / ### headings out of a guide body to build a table of contents. */
function extractHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (!m) continue;
    const text = m[2].trim();
    headings.push({ level: m[1].length, text, id: slugify(text) });
  }
  return headings;
}

// Vite inlines every matching file as a raw string at build time.
const rawGuides = import.meta.glob('../content/help/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function slugFromPath(path: string): string {
  return path.split('/').pop()!.replace(/\.md$/, '');
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  if (!match) return { meta: {}, body: raw.trim() };

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    // Strip optional surrounding quotes.
    meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { meta, body: match[2].trim() };
}

function buildGuides(): HelpGuide[] {
  const guides = Object.entries(rawGuides).map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug || slugFromPath(path);
    return {
      slug,
      title: meta.title || slug,
      category: meta.category || 'General',
      order: Number.isFinite(Number(meta.order)) ? Number(meta.order) : 999,
      summary: meta.summary || '',
      body,
      headings: extractHeadings(body),
    } satisfies HelpGuide;
  });

  guides.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  return guides;
}

const guides = buildGuides();

export function getGuides(): HelpGuide[] {
  return guides;
}

export function getGuide(slug: string): HelpGuide | undefined {
  return guides.find((g) => g.slug === slug);
}

export type HelpSection = { category: string; slug: string; guides: HelpGuide[] };

export function getGuidesByCategory(): HelpSection[] {
  const groups = new Map<string, HelpGuide[]>();
  for (const guide of guides) {
    const list = groups.get(guide.category) ?? [];
    list.push(guide);
    groups.set(guide.category, list);
  }
  return [...groups.entries()].map(([category, guides]) => ({
    category,
    slug: categorySlug(category),
    guides,
  }));
}

export function getSection(slug: string): HelpSection | undefined {
  return getGuidesByCategory().find((s) => s.slug === slug);
}
