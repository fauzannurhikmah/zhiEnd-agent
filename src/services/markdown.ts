/**
 * Cinematic Minimalist Markdown Parser for zhiEnd Agent
 * Zero external dependencies. Fast, robust, responsive & safe.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';

  // 1. Separate code blocks to avoid unwanted regex processing inside code
  const codeBlocks: string[] = [];
  let processed = markdown.replace(/```([a-zA-Z0-9_\-\.]*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `\uE002CODEBLOCK${codeBlocks.length}\uE002`;
    const cleanLang = (lang || 'code').trim();
    const cleanCode = code.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');
    const encoded = encodeURIComponent(cleanCode);
    const escaped = escapeHtml(cleanCode);

    const html = `
      <div class="my-3 rounded-xl border border-white/10 bg-zinc-950 overflow-hidden shadow-xl shadow-black/40">
        <div class="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900/90 border-b border-white/[0.08] text-[11px] font-mono text-zinc-400 select-none">
          <span class="text-indigo-400 font-semibold tracking-wider uppercase text-[10px] flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            ${cleanLang}
          </span>
          <button
            type="button"
            onclick="navigator.clipboard.writeText(decodeURIComponent('${encoded}')).then(() => { const el = this; el.innerText = '✓ Tersalin!'; setTimeout(() => { el.innerText = 'Salin'; }, 2000); })"
            class="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-indigo-600 hover:text-white text-zinc-300 transition text-[10px] cursor-pointer"
          >
            Salin
          </button>
        </div>
        <pre class="p-3 text-[12px] font-mono text-zinc-200 overflow-x-auto leading-relaxed select-text"><code>${escaped}</code></pre>
      </div>
    `.trim();

    codeBlocks.push(html);
    return placeholder;
  });

  // 2. Process line by line
  const lines = processed.split(/\r?\n/);
  const outputLines: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check if line is placeholder for code block
    if (trimmed.startsWith('\uE002CODEBLOCK') && trimmed.endsWith('\uE002')) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      const idx = parseInt(trimmed.replace('\uE002CODEBLOCK', '').replace('\uE002', ''), 10);
      outputLines.push(codeBlocks[idx] || '');
      continue;
    }

    // Horizontal Rule (--- or ***)
    if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push('<hr class="my-4 border-white/10" />');
      continue;
    }

    // Headers (#, ##, ###, ####)
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<h1 class="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-white/10 tracking-tight">${parseInline(h1Match[1])}</h1>`);
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<h2 class="text-base font-bold text-zinc-100 mt-3.5 mb-1.5 tracking-tight flex items-center gap-1.5">${parseInline(h2Match[1])}</h2>`);
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<h3 class="text-sm font-semibold text-indigo-300 mt-3 mb-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>${parseInline(h3Match[1])}</h3>`);
      continue;
    }

    const h4Match = trimmed.match(/^####\s+(.+)$/);
    if (h4Match) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<h4 class="text-xs font-semibold text-zinc-300 mt-2 mb-1">${parseInline(h4Match[1])}</h4>`);
      continue;
    }

    // Blockquote
    const quoteMatch = trimmed.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<blockquote class="border-l-2 border-indigo-500/60 pl-3.5 py-1 my-2 bg-indigo-500/5 text-zinc-300 text-xs italic rounded-r-lg">${parseInline(quoteMatch[1])}</blockquote>`);
      continue;
    }

    // Unordered list (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      if (!inUl) { outputLines.push('<ul class="my-1.5 space-y-1">'); inUl = true; }
      outputLines.push(`
        <li class="flex items-start gap-2.5 text-zinc-200 text-xs leading-relaxed">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0 shadow-sm shadow-indigo-400/40"></span>
          <span class="flex-1">${parseInline(ulMatch[1])}</span>
        </li>
      `.trim());
      continue;
    }

    // Ordered list (1., 2., etc.)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (!inOl) { outputLines.push('<ol class="my-1.5 space-y-1">'); inOl = true; }
      outputLines.push(`
        <li class="flex items-start gap-2 text-zinc-200 text-xs leading-relaxed">
          <span class="px-1.5 py-0.2 rounded bg-zinc-800 border border-white/10 text-[10px] font-mono text-indigo-300 mt-0.5 shrink-0">${olMatch[1]}</span>
          <span class="flex-1">${parseInline(olMatch[2])}</span>
        </li>
      `.trim());
      continue;
    }

    // Empty line
    if (!trimmed) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push('<div class="h-2"></div>');
      continue;
    }

    // Normal paragraph
    if (inUl) { outputLines.push('</ul>'); inUl = false; }
    if (inOl) { outputLines.push('</ol>'); inOl = false; }
    outputLines.push(`<p class="leading-relaxed text-xs text-zinc-200">${parseInline(trimmed)}</p>`);
  }

  if (inUl) outputLines.push('</ul>');
  if (inOl) outputLines.push('</ol>');

  return outputLines.join('\n');
}

/**
 * Parse inline markdown elements with tokenization protection
 */
function parseInline(text: string): string {
  if (!text) return '';

  // 1. Protect inline code `code`
  const inlineCodes: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="px-1.5 py-0.5 rounded-md bg-zinc-950/90 border border-white/10 text-indigo-300 font-mono text-[11px] shadow-xs">${escapeHtml(code)}</code>`);
    return `\uE000INLINECODE${idx}\uE000`;
  });

  // 2. Protect markdown links [label](url)
  const linkTokens: string[] = [];
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const cleanUrl = url.trim();
    const tokenIdx = linkTokens.length;

    // Check if label contains an inline code placeholder
    const renderedLabel = label.replace(/\uE000INLINECODE(\d+)\uE000/g, (__: string, codeIdx: string) => {
      return inlineCodes[parseInt(codeIdx, 10)] || '';
    });

    if (cleanUrl.startsWith('file:///')) {
      const cleanPath = cleanUrl.replace('file:///', '');
      const html = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-zinc-850 border border-zinc-700/60 text-zinc-300 font-mono text-[11px]" title="${escapeHtml(cleanPath)}">
        <svg class="w-3 h-3 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="truncate max-w-[220px]">${renderedLabel}</span>
      </span>`;
      linkTokens.push(html);
      return `\uE001LINK${tokenIdx}\uE001`;
    }

    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const html = `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 font-medium transition cursor-pointer group shadow-sm shadow-indigo-500/10">
        <span class="underline decoration-indigo-400/40 underline-offset-2">${renderedLabel}</span>
        <svg class="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>`;
      linkTokens.push(html);
      return `\uE001LINK${tokenIdx}\uE001`;
    }

    const html = `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300">${renderedLabel}</a>`;
    linkTokens.push(html);
    return `\uE001LINK${tokenIdx}\uE001`;
  });

  // 3. Raw URLs in leftover text
  s = s.replace(/(https?:\/\/[^\s<)]+)/g, (url) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 font-medium transition cursor-pointer group shadow-sm shadow-indigo-500/10">
      <span class="underline decoration-indigo-400/40 underline-offset-2">${escapeHtml(url)}</span>
      <svg class="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>`;
  });

  // 4. Bold (**text** or __text__)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong class="font-bold text-white">$1</strong>');

  // 5. Italic (*text* or _text_)
  s = s.replace(/\*([^*]+)\*/g, '<em class="italic text-zinc-300">$1</em>');
  s = s.replace(/_([^_]+)_/g, '<em class="italic text-zinc-300">$1</em>');

  // 6. Strikethrough (~~text~~)
  s = s.replace(/~~([^~]+)~~/g, '<del class="line-through text-zinc-500">$1</del>');

  // 7. Restore links
  s = s.replace(/\uE001LINK(\d+)\uE001/g, (_, idx) => {
    return linkTokens[parseInt(idx, 10)] || '';
  });

  // 8. Restore inline codes
  s = s.replace(/\uE000INLINECODE(\d+)\uE000/g, (_, idx) => {
    return inlineCodes[parseInt(idx, 10)] || '';
  });

  return s;
}
