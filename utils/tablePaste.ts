export interface ParsedTableBlock {
  headers: string[];
  alignments: Array<'left' | 'center' | 'right' | null>;
  rows: string[][];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineFormatting(raw: string): string {
  const escaped = escapeHtml(raw.trim());
  // Preserve simple safe inline Markdown formatting inside pasted table cells
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

function splitPipeCells(line: string): string[] {
  const trimmed = line.trim();
  const PLACEHOLDER = '\u0000ESCAPED_PIPE\u0000';
  const safe = trimmed.replace(/\\\|/g, PLACEHOLDER);

  let core = safe;
  if (core.startsWith('|')) core = core.slice(1);
  if (core.endsWith('|')) core = core.slice(0, -1);

  return core.split('|').map((cell) => cell.replace(new RegExp(PLACEHOLDER, 'g'), '|').trim());
}

function isAsciiBoxBorderLine(line: string): boolean {
  const trimmed = line.trim();
  return /^\+[-=:+]+\+$/.test(trimmed);
}

function parseSeparatorAlignments(line: string): Array<'left' | 'center' | 'right' | null> | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|') && !isAsciiBoxBorderLine(trimmed)) {
    return null;
  }

  if (isAsciiBoxBorderLine(trimmed)) {
    const inner = trimmed.slice(1, -1);
    const parts = inner.split('+');
    if (parts.length < 2) return null;
    return parts.map(() => null);
  }

  const cells = splitPipeCells(trimmed);
  if (cells.length === 0) return null;

  // Require at least 2 cells unless outer pipes exist
  const hasOuterPipes = trimmed.startsWith('|') || trimmed.endsWith('|');
  if (!hasOuterPipes && cells.length < 2) return null;

  const alignments: Array<'left' | 'center' | 'right' | null> = [];
  for (const cell of cells) {
    if (!/^:?-{2,}:?$/.test(cell)) {
      return null;
    }
    const startsColon = cell.startsWith(':');
    const endsColon = cell.endsWith(':');
    if (startsColon && endsColon) alignments.push('center');
    else if (endsColon) alignments.push('right');
    else if (startsColon) alignments.push('left');
    else alignments.push(null);
  }
  return alignments;
}

function isPipeTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || isAsciiBoxBorderLine(trimmed)) return false;
  return trimmed.includes('|');
}

function normalizeRowLength(cells: string[], targetLength: number): string[] {
  if (cells.length === targetLength) return cells;
  if (cells.length > targetLength) return cells.slice(0, targetLength);
  return [...cells, ...Array(targetLength - cells.length).fill('')];
}

function buildHtmlTable(table: ParsedTableBlock): string {
  const colCount = Math.max(
    table.headers.length,
    table.rows.reduce((max, row) => Math.max(max, row.length), 0)
  );
  const headers = normalizeRowLength(table.headers, colCount);

  const thCells = headers
    .map((cell, idx) => {
      const align = table.alignments[idx];
      const inner = cell ? renderInlineFormatting(cell) : '<br>';
      const alignStyle = align ? ` style="text-align: ${align}"` : '';
      return `<th${alignStyle}><p>${inner}</p></th>`;
    })
    .join('');

  const bodyRows = table.rows
    .map((row) => {
      const normalized = normalizeRowLength(row, colCount);
      const tdCells = normalized
        .map((cell, idx) => {
          const align = table.alignments[idx];
          const inner = cell ? renderInlineFormatting(cell) : '<br>';
          const alignStyle = align ? ` style="text-align: ${align}"` : '';
          return `<td${alignStyle}><p>${inner}</p></td>`;
        })
        .join('');
      return `<tr>${tdCells}</tr>`;
    })
    .join('');

  const tbody = bodyRows ? `<tbody>${bodyRows}</tbody>` : '';
  return `<table><thead><tr>${thCells}</tr></thead>${tbody}</table>`;
}

function tryParseAsciiBoxTable(lines: string[], startIndex: number): { html: string; nextIndex: number } | null {
  if (!isAsciiBoxBorderLine(lines[startIndex] || '')) return null;
  let i = startIndex + 1;
  const rawRows: string[][] = [];
  let sawSeparatorAfterHeader = false;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    if (isAsciiBoxBorderLine(line)) {
      if (rawRows.length === 1 && !sawSeparatorAfterHeader) {
        sawSeparatorAfterHeader = true;
      }
      i++;
      continue;
    }
    if (isPipeTableRow(line)) {
      rawRows.push(splitPipeCells(line));
      i++;
      continue;
    }
    break;
  }

  if (rawRows.length < 2) return null;
  const headers = rawRows[0];
  const rows = rawRows.slice(1);
  return {
    html: buildHtmlTable({
      headers,
      alignments: headers.map(() => null),
      rows,
    }),
    nextIndex: i,
  };
}

function tryParseMarkdownPipeTable(lines: string[], startIndex: number): { html: string; nextIndex: number } | null {
  const headerLine = lines[startIndex];
  const separatorLine = lines[startIndex + 1];
  if (!headerLine || !separatorLine) return null;
  if (!isPipeTableRow(headerLine)) return null;

  const alignments = parseSeparatorAlignments(separatorLine);
  if (!alignments) return null;

  const headers = splitPipeCells(headerLine);
  if (headers.length === 0) return null;
  // Guard against column count mismatch between header and separator
  if (Math.abs(headers.length - alignments.length) > 1 && alignments.length < 2) return null;

  const rows: string[][] = [];
  let i = startIndex + 2;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    if (isAsciiBoxBorderLine(line)) {
      i++;
      continue;
    }
    if (!isPipeTableRow(line)) break;
    // Do not swallow another separator if a second table follows immediately
    if (parseSeparatorAlignments(line)) break;
    rows.push(splitPipeCells(line));
    i++;
  }

  return {
    html: buildHtmlTable({
      headers,
      alignments,
      rows,
    }),
    nextIndex: i,
  };
}

function tryParseTsvBlock(lines: string[], startIndex: number): { html: string; nextIndex: number } | null {
  const first = lines[startIndex];
  if (!first || !first.includes('\t')) return null;

  const blockRows: string[][] = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    if (!line.includes('\t')) return null;
    blockRows.push(line.split('\t').map((c) => c.trim()));
    i++;
  }

  if (blockRows.length < 2) return null;
  const colCount = blockRows[0].length;
  if (colCount < 2) return null;

  // Require all rows in block to have compatible tab structure
  const consistent = blockRows.every((r) => r.length === colCount || (r.length >= 2 && Math.abs(r.length - colCount) <= 1));
  if (!consistent) return null;

  return {
    html: buildHtmlTable({
      headers: blockRows[0],
      alignments: Array(colCount).fill(null),
      rows: blockRows.slice(1),
    }),
    nextIndex: i,
  };
}

function tryParseSpaceAlignedTable(lines: string[], startIndex: number): { html: string; nextIndex: number } | null {
  const isBullet = (s: string) => /^([-*•]|\d+[.)])\s+/.test(s.trim());
  const blockRows: string[][] = [];
  let i = startIndex;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) break;
    if (isBullet(trimmed)) return null;
    // Split only on 3+ spaces to avoid false positives on normal double-spaced prose
    const cells = trimmed.split(/\s{3,}/).map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length < 2 || cells.length > 8) return null;
    blockRows.push(cells);
    i++;
  }

  if (blockRows.length < 2) return null;
  const colCount = blockRows[0].length;
  if (!blockRows.every((r) => r.length === colCount)) return null;

  return {
    html: buildHtmlTable({
      headers: blockRows[0],
      alignments: Array(colCount).fill(null),
      rows: blockRows.slice(1),
    }),
    nextIndex: i,
  };
}

/**
 * Checks whether plain text contains at least one recognizable table structure
 * (Markdown pipe table, ASCII box table, TSV table, or 3-space aligned table).
 */
export function hasConvertibleTextTable(text: string): boolean {
  if (!text) return false;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (
      tryParseAsciiBoxTable(lines, i) ||
      tryParseMarkdownPipeTable(lines, i) ||
      tryParseTsvBlock(lines, i) ||
      tryParseSpaceAlignedTable(lines, i)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Converts plain text (containing tables and/or normal paragraphs) into HTML
 * ready to be parsed by TipTap's ProseMirror schema.
 */
export function convertPlainTextWithTablesToHTML(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const htmlParts: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const asciiTable = tryParseAsciiBoxTable(lines, i);
    if (asciiTable) {
      htmlParts.push(asciiTable.html);
      i = asciiTable.nextIndex;
      continue;
    }

    const mdTable = tryParseMarkdownPipeTable(lines, i);
    if (mdTable) {
      htmlParts.push(mdTable.html);
      i = mdTable.nextIndex;
      continue;
    }

    const tsvTable = tryParseTsvBlock(lines, i);
    if (tsvTable) {
      htmlParts.push(tsvTable.html);
      i = tsvTable.nextIndex;
      continue;
    }

    const spaceTable = tryParseSpaceAlignedTable(lines, i);
    if (spaceTable) {
      htmlParts.push(spaceTable.html);
      i = spaceTable.nextIndex;
      continue;
    }

    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '') {
      // Collapse runs of blank lines cleanly without emitting excessive empty nodes
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${renderInlineFormatting(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    htmlParts.push(`<p>${renderInlineFormatting(line)}</p>`);
    i++;
  }

  return htmlParts.join('');
}

/**
 * Normalizes pasted HTML so HTML tables from Google Docs / Word / ChatGPT
 * retain proper header rows (`<th>`) and any inline Markdown pipe-table blocks
 * wrapped in `<p>`/`<div>`/`<br>` are promoted to real `<table>` elements.
 */
export function normalizePastedTableHTML(html: string): string {
  // 1. Ensure <td> cells inside <thead> are treated as <th> header cells
  let normalized = html.replace(/<thead\b[^>]*>([\s\S]*?)<\/thead>/gi, (_match, inner) => {
    const fixedInner = inner
      .replace(/<td(\b[^>]*)>/gi, '<th$1>')
      .replace(/<\/td>/gi, '</th>');
    return `<thead>${fixedInner}</thead>`;
  });

  // 2. If the HTML doesn't already contain a <table>, look for paragraph/div runs
  //    that represent a Markdown pipe table (e.g. copied as formatted text from docs/chat).
  if (!/<table\b/i.test(normalized) && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(normalized, 'text/html');
      const body = doc.body;
      if (body && body.textContent && body.textContent.includes('|')) {
        // Expand <p> or <div> containing <br>-separated pipe lines into individual text lines
        const candidateBlocks = Array.from(body.children);
        const flatLines: Array<{ text: string; el: Element | null }> = [];
        let canReplaceTopLevel = candidateBlocks.length > 0;

        for (const el of candidateBlocks) {
          const tag = el.tagName.toLowerCase();
          if ((tag === 'p' || tag === 'div') && /<br\s*\/?>/i.test(el.innerHTML)) {
            const pieces = el.innerHTML
              .split(/<br\s*\/?>/gi)
              .map((fragment) => {
                const tmp = doc.createElement('div');
                tmp.innerHTML = fragment;
                return (tmp.textContent || '').trim();
              });
            if (pieces.some((p) => p.includes('|'))) {
              for (const piece of pieces) {
                flatLines.push({ text: piece, el: null });
              }
              continue;
            }
          }
          flatLines.push({ text: (el.textContent || '').trim(), el });
        }

        if (canReplaceTopLevel) {
          const lineTexts = flatLines.map((item) => item.text);
          let hasReplacedAny = false;
          const rebuilt: string[] = [];

          let idx = 0;
          while (idx < flatLines.length) {
            const md = tryParseMarkdownPipeTable(lineTexts, idx);
            if (md) {
              rebuilt.push(md.html);
              idx = md.nextIndex;
              hasReplacedAny = true;
              continue;
            }
            const current = flatLines[idx];
            if (current.el) {
              rebuilt.push(current.el.outerHTML);
            } else if (current.text) {
              rebuilt.push(`<p>${renderInlineFormatting(current.text)}</p>`);
            }
            idx++;
          }

          if (hasReplacedAny) {
            normalized = rebuilt.join('');
          }
        }
      }
    } catch {
      // Fallback safely to pre-normalized HTML
    }
  }

  return normalized;
}
