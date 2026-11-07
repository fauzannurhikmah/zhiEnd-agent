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

function isTableSeparator(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.includes('|') && trimmed.includes('-') && /^\|?(\s*:?-{2,}:?\s*\|?)+$/.test(trimmed);
}

function parseTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  const protectedLine = trimmed.replace(/\\\|/g, '\uE003PIPE\uE003');
  return protectedLine.split('|').map(c => c.replace(/\uE003PIPE\uE003/g, '|').trim());
}

export function isImageExtension(urlOrPath: string): boolean {
  const clean = urlOrPath.split('?')[0].split('#')[0].toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/.test(clean);
}

export function resolveMediaUrl(rawUrl: string): { webUrl: string; downloadUrl: string; fileName: string } {
  let clean = rawUrl.trim();
  let fileName = 'image.png';

  if (clean.startsWith('file:///')) {
    const filePath = clean.replace(/^file:\/\/\//, '');
    fileName = decodeURIComponent(filePath.split('/').pop()?.split('\\').pop() || 'image.png');
    return {
      webUrl: `/api/media/file?path=${encodeURIComponent(filePath)}`,
      downloadUrl: `/api/media/file?path=${encodeURIComponent(filePath)}&download=1`,
      fileName
    };
  }

  if (/^[A-Za-z]:[/\\]/.test(clean)) {
    fileName = clean.split('/').pop()?.split('\\').pop() || 'image.png';
    return {
      webUrl: `/api/media/file?path=${encodeURIComponent(clean)}`,
      downloadUrl: `/api/media/file?path=${encodeURIComponent(clean)}&download=1`,
      fileName
    };
  }

  if (clean.startsWith('/uploads/')) {
    fileName = clean.split('/').pop() || 'image.png';
    return {
      webUrl: clean,
      downloadUrl: clean,
      fileName
    };
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    fileName = clean.split('/').pop()?.split('?')[0] || 'image.png';
    return {
      webUrl: clean,
      downloadUrl: clean,
      fileName
    };
  }

  // Relative path to image in active workspace or public
  if (isImageExtension(clean)) {
    fileName = clean.split('/').pop()?.split('\\').pop() || 'image.png';
    return {
      webUrl: `/api/media/file?path=${encodeURIComponent(clean)}`,
      downloadUrl: `/api/media/file?path=${encodeURIComponent(clean)}&download=1`,
      fileName
    };
  }

  return {
    webUrl: clean,
    downloadUrl: clean,
    fileName: clean.split('/').pop() || 'file'
  };
}

export function renderImageCard(alt: string, rawUrl: string): string {
  const { webUrl, fileName } = resolveMediaUrl(rawUrl);
  const displayTitle = (alt && alt.trim()) ? alt.trim() : fileName;

  return `
    <div class="my-3 rounded-none overflow-hidden border border-[#D0CEC7] bg-[#FCFCFA] shadow-xs max-w-[540px] group/imgcard animate-in fade-in duration-200">
      <div 
        class="relative bg-[#ECEAE5] overflow-hidden flex items-center justify-center max-h-[500px] cursor-zoom-in" 
        onclick="window.__zhiEndZoomImage && window.__zhiEndZoomImage('${escapeHtml(webUrl)}')"
        title="Klik gambar untuk perbesar & unduh"
      >
        <img
          src="${escapeHtml(webUrl)}"
          alt="${escapeHtml(displayTitle)}"
          loading="lazy"
          class="w-full h-auto max-h-[500px] object-contain transition-transform duration-300 group-hover/imgcard:scale-[1.01]"
        />
        <div class="absolute inset-0 bg-black/20 opacity-0 group-hover/imgcard:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span class="px-3.5 py-1.5 rounded-none bg-[#FCFCFA] text-[11px] font-bold text-[#111315] border border-[#D0CEC7] flex items-center gap-1.5 shadow-md">
            <svg class="w-3.5 h-3.5 text-[#FF5500]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Klik untuk Perbesar & Unduh
          </span>
        </div>
      </div>
    </div>
  `.trim();
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
      <div class="my-3 rounded-none border border-[#2A2B30] bg-[#101114] overflow-hidden shadow-xs crt-screen">
        <div class="flex items-center justify-between px-3.5 py-1.5 bg-[#18191D] border-b border-[#2A2B30] text-[11px] font-mono text-[#8C9097] select-none">
          <span class="text-[#FF5500] font-bold tracking-wider uppercase text-[10px] flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-none bg-[#FF5500]"></span>
            ${cleanLang}
          </span>
          <button
            type="button"
            onclick="navigator.clipboard.writeText(decodeURIComponent('${encoded}')).then(() => { const el = this; el.innerText = '✓ Tersalin!'; setTimeout(() => { el.innerText = 'Salin'; }, 2000); })"
            class="px-2 py-0.5 rounded-none bg-[#101114] hover:bg-[#FF5500] hover:text-white border border-[#2A2B30] text-[#D0D4DC] font-mono transition text-[10px] cursor-pointer"
          >
            Salin
          </button>
        </div>
        <div class="relative overflow-x-auto">
          <div class="absolute inset-0 pointer-events-none opacity-15 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_2px]"></div>
          <pre class="p-3 text-[12px] font-mono text-[#DCDAD4] leading-relaxed select-text bg-[#101114] relative z-10 custom-scrollbar"><code>${escaped}</code></pre>
        </div>
      </div>
    `.trim();

    codeBlocks.push(html);
    return placeholder;
  });

  // Clean redundant "Lokasi File" lines and image file link artifacts
  processed = processed
    .replace(/(?:^|\n)[^\S\r\n]*(?:📁\s*)?(?:\*\*)?Lokasi File:?(?:\*\*)?[^\S\r\n]*/gi, '\n')
    .replace(/(?:^|\n)[^\S\r\n]*\[[^\]]*\.(?:png|jpe?g|webp|gif|svg)\]\(file:\/\/\/[^\)]+\)[^\S\r\n]*/gi, '\n');

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

    // Markdown Table (| Col 1 | Col 2 |)
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }

      const headerCells = parseTableRow(trimmed);
      const separatorCells = parseTableRow(lines[i + 1]);
      const alignments = separatorCells.map(cell => {
        const c = cell.trim();
        const startColon = c.startsWith(':');
        const endColon = c.endsWith(':');
        if (startColon && endColon) return 'text-center';
        if (endColon) return 'text-right';
        return 'text-left';
      });

      i++; // skip separator line

      const rows: string[][] = [];
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (!nextLine || !nextLine.includes('|')) break;
        if (isTableSeparator(nextLine) || nextLine.startsWith('```') || /^(\-{3,}|\*{3,})$/.test(nextLine)) break;

        i++;
        rows.push(parseTableRow(lines[i]));
      }

      let tableHtml = `<div class="my-3 overflow-x-auto rounded-none border border-[#D0CEC7] bg-[#FCFCFA] shadow-xs">
        <table class="w-full border-collapse text-[12px] text-[#111315]">
          <thead>
            <tr class="bg-[#ECEAE5] border-b border-[#D0CEC7] text-[11px] font-bold text-[#111315] uppercase tracking-wider select-none font-mono">`;

      headerCells.forEach((th, idx) => {
        const align = alignments[idx] || 'text-left';
        tableHtml += `<th class="px-3.5 py-2.5 whitespace-nowrap ${align}">${parseInline(th)}</th>`;
      });

      tableHtml += `</tr></thead><tbody class="divide-y divide-[#D0CEC7]/60 font-sans">`;

      rows.forEach(row => {
        tableHtml += `<tr class="hover:bg-[#ECEAE5]/50 transition-colors">`;
        headerCells.forEach((_, idx) => {
          const td = row[idx] !== undefined ? row[idx] : '';
          const align = alignments[idx] || 'text-left';
          tableHtml += `<td class="px-3.5 py-2.5 whitespace-nowrap ${align} align-middle">${parseInline(td)}</td>`;
        });
        tableHtml += `</tr>`;
      });

      tableHtml += `</tbody></table></div>`;
      outputLines.push(tableHtml);
      continue;
    }

    // Headers (#, ##, ###, ####)
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<h1 class="text-lg font-bold text-[#111315] mt-4 mb-2 pb-1 border-b border-[#D0CEC7] tracking-tight">${parseInline(h1Match[1])}</h1>`);
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<h2 class="text-base font-bold text-[#111315] mt-3.5 mb-1.5 tracking-tight flex items-center gap-1.5">${parseInline(h2Match[1])}</h2>`);
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<h3 class="text-sm font-bold text-[#FF5500] mt-3 mb-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-none bg-[#FF5500]"></span>${parseInline(h3Match[1])}</h3>`);
      continue;
    }

    const h4Match = trimmed.match(/^####\s+(.+)$/);
    if (h4Match) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<h4 class="text-xs font-bold text-[#5C6066] mt-2 mb-1">${parseInline(h4Match[1])}</h4>`);
      continue;
    }

    // Blockquote
    const quoteMatch = trimmed.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(`<blockquote class="border-l-2 border-[#FF5500] pl-3.5 py-1.5 my-2 bg-[#ECEAE5]/70 text-[#111315] text-xs italic rounded-none border border-l-2 border-[#D0CEC7]">${parseInline(quoteMatch[1])}</blockquote>`);
      continue;
    }

    // Unordered list (- or * or •)
    const ulMatch = trimmed.match(/^([-*•]|\u2022)\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      if (!inUl) { outputLines.push('<ul class="my-1.5 space-y-1">'); inUl = true; }
      outputLines.push(`
        <li class="flex items-start gap-2.5 text-[#111315] text-xs leading-relaxed">
          <span class="w-1.5 h-1.5 rounded-none bg-[#FF5500] mt-1.5 shrink-0"></span>
          <span class="flex-1">${parseInline(ulMatch[2])}</span>
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
        <li class="flex items-start gap-2 text-[#111315] text-xs leading-relaxed">
          <span class="px-1.5 py-0.2 rounded bg-[#ECEAE5] border border-[#D0CEC7] text-[10px] font-mono text-[#FF5500] font-bold mt-0.5 shrink-0">${olMatch[1]}</span>
          <span class="flex-1">${parseInline(olMatch[2])}</span>
        </li>
      `.trim());
      continue;
    }

    // Empty line (collapse multiple consecutive empty lines to single spacer)
    if (!trimmed) {
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      const lastLine = outputLines[outputLines.length - 1];
      if (lastLine && lastLine !== '<div class="h-2"></div>' && !lastLine.startsWith('<hr')) {
        outputLines.push('<div class="h-2"></div>');
      }
      continue;
    }

    // Image on standalone line: ![Alt](url) or ! [Alt](url)
    const imgLineMatch = trimmed.match(/^!\s*\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgLineMatch) {
      const altText = imgLineMatch[1];
      const rawUrl = imgLineMatch[2];
      if (inUl) { outputLines.push('</ul>'); inUl = false; }
      if (inOl) { outputLines.push('</ol>'); inOl = false; }
      outputLines.push(renderImageCard(altText, rawUrl));
      continue;
    }

    const inlineContent = parseInline(trimmed);
    if (!inlineContent.trim()) {
      continue;
    }

    // Normal paragraph
    if (inUl) { outputLines.push('</ul>'); inUl = false; }
    if (inOl) { outputLines.push('</ol>'); inOl = false; }
    outputLines.push(`<p class="leading-relaxed text-xs text-[#111315]">${inlineContent}</p>`);
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
    inlineCodes.push(`<code class="px-1.5 py-0.5 rounded-none bg-[#101114] border border-[#2A2B30] text-[#FF5500] font-mono text-[11px] font-bold shadow-xs">${escapeHtml(code)}</code>`);
    return `\uE000INLINECODE${idx}\uE000`;
  });

  const linkTokens: string[] = [];

  // 1b. Protect and parse inline image markdown ![alt](url) or ! [alt](url)
  s = s.replace(/!\s*\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const tokenIdx = linkTokens.length;
    const cardHtml = renderImageCard(alt, url);
    linkTokens.push(cardHtml);
    return `\uE001LINK${tokenIdx}\uE001`;
  });

  // 2. Protect markdown links [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const cleanUrl = url.trim();
    const tokenIdx = linkTokens.length;

    // Check if label contains an inline code placeholder
    const renderedLabel = label.replace(/\uE000INLINECODE(\d+)\uE000/g, (__: string, codeIdx: string) => {
      return inlineCodes[parseInt(codeIdx, 10)] || '';
    });

    if (cleanUrl.startsWith('file:///')) {
      const cleanPath = cleanUrl.replace(/^file:\/\/\//, '');
      const isImg = isImageExtension(cleanPath);

      if (isImg) {
        return '';
      }

      const html = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-none bg-[#ECEAE5] border border-[#D0CEC7] text-[#111315] font-mono text-[11px]" title="${escapeHtml(cleanPath)}"><svg class="w-3 h-3 text-[#FF5500] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span class="truncate max-w-[220px]">${renderedLabel}</span></span>`;
      linkTokens.push(html);
      return `\uE001LINK${tokenIdx}\uE001`;
    }

    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      // If external link points directly to image and label is filename, allow download
      if (isImageExtension(cleanUrl)) {
        const { downloadUrl, fileName } = resolveMediaUrl(cleanUrl);
        const html = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-none bg-[#ECEAE5] border border-[#D0CEC7] text-[#111315] font-mono text-[11px]"><svg class="w-3.5 h-3.5 text-[#FF5500] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="truncate max-w-[200px] text-[#FF5500] hover:underline">${renderedLabel}</a><a href="${escapeHtml(downloadUrl)}" download="${escapeHtml(fileName)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none bg-orange-100 hover:bg-orange-200 text-[#FF5500] transition cursor-pointer text-[10px] font-bold" title="Download ${escapeHtml(fileName)}"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span>Unduh</span></a></span>`;
        linkTokens.push(html);
        return `\uE001LINK${tokenIdx}\uE001`;
      }

      const html = `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-none bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#FF5500] font-medium transition cursor-pointer group shadow-2xs"><span class="underline decoration-orange-300 underline-offset-2">${renderedLabel}</span><svg class="w-3 h-3 text-[#FF5500] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>`;
      linkTokens.push(html);
      return `\uE001LINK${tokenIdx}\uE001`;
    }

    const html = `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="text-[#FF5500] underline hover:text-orange-700 font-medium">${renderedLabel}</a>`;
    linkTokens.push(html);
    return `\uE001LINK${tokenIdx}\uE001`;
  });

  // 3. Raw URLs in leftover text -> Tokenize into linkTokens to protect from formatting regexes
  s = s.replace(/(https?:\/\/[^\s<)]+)/g, (rawUrl) => {
    let cleanUrl = rawUrl.trim();
    let trailingPunct = '';
    const matchPunct = cleanUrl.match(/[.,;!]+$/);
    if (matchPunct) {
      trailingPunct = matchPunct[0];
      cleanUrl = cleanUrl.slice(0, -trailingPunct.length);
    }
    const tokenIdx = linkTokens.length;
    const html = `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-none bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#FF5500] font-medium transition cursor-pointer group shadow-2xs"><span class="underline decoration-orange-300 underline-offset-2">${escapeHtml(cleanUrl)}</span><svg class="w-3 h-3 text-[#FF5500] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>`;
    linkTokens.push(html);
    return `\uE001LINK${tokenIdx}\uE001${trailingPunct}`;
  });

  // 4. Bold (**text** or __text__)
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong class="font-bold text-[#111315]">$1</strong>');
  s = s.replace(/(?<=^|[\s(])__([^\n_]+)__(?=$|[\s).,!?])/g, '<strong class="font-bold text-[#111315]">$1</strong>');

  // 5. Italic (*text* or _text_)
  s = s.replace(/(?<=^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?])/g, '<em class="italic text-[#5C6066]">$1</em>');
  s = s.replace(/(?<=^|[\s(])_([^\n_]+)_(?=$|[\s).,!?])/g, '<em class="italic text-[#5C6066]">$1</em>');

  // 6. Strikethrough (~~text~~)
  s = s.replace(/~~([^~\n]+)~~/g, '<del class="line-through text-[#8C9097]">$1</del>');

  // 7. Restore links (all HTML safe and intact)
  s = s.replace(/\uE001LINK(\d+)\uE001/g, (_, idx) => {
    return linkTokens[parseInt(idx, 10)] || '';
  });

  // 8. Restore inline codes
  s = s.replace(/\uE000INLINECODE(\d+)\uE000/g, (_, idx) => {
    return inlineCodes[parseInt(idx, 10)] || '';
  });

  return s;
}
