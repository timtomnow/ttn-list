import { isValidElement, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, List } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  categorySlug,
  getGuide,
  getGuidesByCategory,
  getSection,
  slugify,
  type HelpGuide,
} from '@/lib/help';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** On navigation to a #hash, scroll the matching element into view. */
function useScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);
}

/** Flatten react-markdown heading children to plain text for slugging. */
function toText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (isValidElement(node)) return toText((node.props as { children?: ReactNode }).children);
  return '';
}

const proseClasses =
  'prose prose-ink max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:mt-8 prose-h2:text-lg prose-a:text-ink-900 dark:prose-a:text-ink-50 prose-img:rounded-xl prose-img:border prose-img:border-ink-200 dark:prose-img:border-ink-800';

/**
 * Render a guide's Markdown body, giving every heading a stable id so the
 * in-page tables of contents can link straight to it. `idPrefix` namespaces
 * the ids when several guides share one page (section / full-docs views).
 */
function GuideArticle({ guide, idPrefix = '' }: { guide: HelpGuide; idPrefix?: string }) {
  const heading = (Tag: 'h2' | 'h3') =>
    function HeadingRenderer({ children }: { children?: ReactNode }) {
      return (
        <Tag id={idPrefix + slugify(toText(children))} className="scroll-mt-24">
          {children}
        </Tag>
      );
    };
  return (
    <article className={proseClasses}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h2: heading('h2'), h3: heading('h3') }}>
        {guide.body}
      </ReactMarkdown>
    </article>
  );
}

type Crumb = { label: string; to?: string };

function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={14} className="text-ink-300 dark:text-ink-600" />}
          {item.to ? (
            <Link to={item.to} className="font-medium transition hover:text-ink-900 dark:hover:text-ink-50">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-ink-900 dark:text-ink-50">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** A boxed "on this page" table of contents. Links are in-page anchors. */
function TocBox({ title = 'On this page', children }: { title?: string; children: ReactNode }) {
  return (
    <nav className="mb-8 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
        <List size={14} />
        {title}
      </div>
      {children}
    </nav>
  );
}

const tocLink =
  'block rounded-lg px-2 py-1 text-sm text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-50';

/** The step-level (heading) list for a single guide, anchoring into `idPrefix`. */
function GuideSteps({ guide, idPrefix }: { guide: HelpGuide; idPrefix: string }) {
  if (guide.headings.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 border-l border-ink-200 pl-3 dark:border-ink-800">
      {guide.headings.map((h) => (
        <li key={h.id} style={{ paddingLeft: (h.level - 2) * 12 }}>
          <a href={`#${idPrefix}${h.id}`} className={tocLink}>
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// /help — the index
// ---------------------------------------------------------------------------

export function HelpIndex() {
  const sections = getGuidesByCategory();

  return (
    <div>
      <Link
        to="/settings"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ArrowLeft size={16} /> Settings
      </Link>
      <PageHeader
        title="Help & Guides"
        subtitle="Step-by-step walkthroughs for getting things done."
        action={
          sections.length > 0 ? (
            <Link
              to="/help/all"
              className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-3 py-2 text-sm font-medium text-ink-50 transition hover:opacity-90 dark:bg-ink-50 dark:text-ink-900"
            >
              <BookOpen size={16} />
              View full help docs
            </Link>
          ) : undefined
        }
      />
      {sections.length === 0 ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">
          No guides yet. Generate them with the <span className="font-mono">ttn-docs</span> skill.
        </p>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.slug}>
              <Link
                to={`/help/section/${section.slug}`}
                className="mb-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-400 transition hover:text-ink-700 dark:text-ink-500 dark:hover:text-ink-300"
              >
                {section.category}
                <ChevronRight size={14} />
              </Link>
              <ul className="space-y-2">
                {section.guides.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      to={`/help/${guide.slug}`}
                      className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 transition hover:border-ink-300 hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700 dark:hover:bg-ink-800"
                    >
                      <BookOpen size={18} className="mt-0.5 shrink-0 text-ink-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{guide.title}</span>
                        {guide.summary && (
                          <span className="mt-0.5 block text-sm text-ink-500 dark:text-ink-400">
                            {guide.summary}
                          </span>
                        )}
                      </span>
                      <ChevronRight size={18} className="mt-0.5 shrink-0 text-ink-300 dark:text-ink-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// /help/:slug — a single process
// ---------------------------------------------------------------------------

export function GuidePage() {
  useScrollToHash();
  const { slug } = useParams();
  const guide = slug ? getGuide(slug) : undefined;

  if (!guide) {
    return (
      <div>
        <BackLink to="/help" label="All guides" />
        <PageHeader title="Guide not found" subtitle="This guide may have moved or not been written yet." />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Help', to: '/help' },
          { label: guide.category, to: `/help/section/${categorySlug(guide.category)}` },
          { label: guide.title },
        ]}
      />
      <PageHeader title={guide.title} subtitle={guide.summary || undefined} />
      {guide.headings.length > 0 && (
        <TocBox>
          <GuideSteps guide={guide} idPrefix="" />
        </TocBox>
      )}
      <GuideArticle guide={guide} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// /help/section/:section — every process in one section, on one page
// ---------------------------------------------------------------------------

export function HelpSectionPage() {
  useScrollToHash();
  const { section: sectionSlug } = useParams();
  const section = sectionSlug ? getSection(sectionSlug) : undefined;

  if (!section) {
    return (
      <div>
        <BackLink to="/help" label="All guides" />
        <PageHeader title="Section not found" subtitle="This section may have been renamed." />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Help', to: '/help' }, { label: section.category }]} />
      <PageHeader
        title={section.category}
        subtitle={`${section.guides.length} guide${section.guides.length === 1 ? '' : 's'} in this section.`}
      />
      <TocBox title="In this section">
        <ul className="space-y-2">
          {section.guides.map((guide) => (
            <li key={guide.slug}>
              <a href={`#${guide.slug}`} className={`${tocLink} font-medium`}>
                {guide.title}
              </a>
              <GuideSteps guide={guide} idPrefix={`${guide.slug}--`} />
            </li>
          ))}
        </ul>
      </TocBox>
      <div className="space-y-12">
        {section.guides.map((guide) => (
          <section key={guide.slug} id={guide.slug} className="scroll-mt-24">
            <h2 className="text-xl font-semibold tracking-tight">{guide.title}</h2>
            {guide.summary && (
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{guide.summary}</p>
            )}
            <div className="mt-3">
              <GuideArticle guide={guide} idPrefix={`${guide.slug}--`} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// /help/all — the entire manual on one page
// ---------------------------------------------------------------------------

export function HelpAll() {
  useScrollToHash();
  const sections = getGuidesByCategory();

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Help', to: '/help' }, { label: 'Full docs' }]} />
      <PageHeader title="Full help docs" subtitle="Everything in one place — use the contents below to jump around." />

      <TocBox title="Contents">
        <ul className="space-y-3">
          {sections.map((section) => (
            <li key={section.slug}>
              <a href={`#section-${section.slug}`} className={`${tocLink} font-semibold`}>
                {section.category}
              </a>
              <ul className="mt-1 space-y-1 border-l border-ink-200 pl-3 dark:border-ink-800">
                {section.guides.map((guide) => (
                  <li key={guide.slug}>
                    <a href={`#${guide.slug}`} className={`${tocLink} font-medium`}>
                      {guide.title}
                    </a>
                    <GuideSteps guide={guide} idPrefix={`${guide.slug}--`} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </TocBox>

      <div className="space-y-16">
        {sections.map((section) => (
          <section key={section.slug} id={`section-${section.slug}`} className="scroll-mt-24">
            <h2 className="border-b border-ink-200 pb-2 text-2xl font-bold tracking-tight dark:border-ink-800">
              {section.category}
            </h2>
            <div className="mt-6 space-y-12">
              {section.guides.map((guide) => (
                <article key={guide.slug} id={guide.slug} className="scroll-mt-24">
                  <h3 className="text-xl font-semibold tracking-tight">{guide.title}</h3>
                  {guide.summary && (
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{guide.summary}</p>
                  )}
                  <div className="mt-3">
                    <GuideArticle guide={guide} idPrefix={`${guide.slug}--`} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
    >
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
