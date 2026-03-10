/**
 * ZIP/XML utilities for XLSM manipulation
 * Extracted from generate-ovo-plan to reduce bundle size
 */

export interface CellWrite {
  sheet: string;
  row: number;
  col: number;
  value: string | number | null;
  type: "string" | "number" | "date";
  forceWrite?: boolean;
}

export interface ZipReadResult {
  entries: Record<string, Uint8Array>;
  originalCompressed: Record<string, {
    data: Uint8Array;
    crc: number;
    uncompSize: number;
    method: number;
  }>;
}

// ── ZIP Read ──

export async function readZip(data: Uint8Array): Promise<ZipReadResult> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const entries: Record<string, Uint8Array> = {};
  const originalCompressed: ZipReadResult["originalCompressed"] = {};

  let eocdOffset = -1;
  for (let i = data.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Invalid ZIP: EOCD not found");

  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  const centralDirSize = view.getUint32(eocdOffset + 12, true);
  let pos = centralDirOffset;

  while (pos < centralDirOffset + centralDirSize) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;

    const compMethod = view.getUint16(pos + 10, true);
    const crcVal = view.getUint32(pos + 16, true);
    const compSize = view.getUint32(pos + 20, true);
    const uncompSize = view.getUint32(pos + 24, true);
    const fileNameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);

    const fileName = new TextDecoder().decode(data.slice(pos + 46, pos + 46 + fileNameLen));
    pos += 46 + fileNameLen + extraLen + commentLen;

    const localView = new DataView(data.buffer, data.byteOffset + localOffset);
    const localFileNameLen = localView.getUint16(26, true);
    const localExtraLen = localView.getUint16(28, true);
    const dataStart = localOffset + 30 + localFileNameLen + localExtraLen;

    const compData = data.slice(dataStart, dataStart + compSize);

    originalCompressed[fileName] = { data: compData, crc: crcVal, uncompSize, method: compMethod };

    if (compMethod === 0) {
      entries[fileName] = compData;
    } else if (compMethod === 8) {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(compData);
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (value) chunks.push(value);
        done = d;
      }

      const result = new Uint8Array(uncompSize);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      entries[fileName] = result;
    }
  }

  return { entries, originalCompressed };
}

// ── ZIP Build ──

export async function buildZip(zipResult: ZipReadResult, modifiedFiles: Set<string>): Promise<ArrayBuffer> {
  const { entries, originalCompressed } = zipResult;
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  const VBA_PATTERNS = ['vbaProject', 'xl/vba', '.bin'];
  const isVbaFile = (n: string) => VBA_PATTERNS.some(p => n.includes(p));

  for (const [name, uncompData] of Object.entries(entries)) {
    const nameBytes = new TextEncoder().encode(name);
    let compData: Uint8Array;
    let crcVal: number;
    let compMethod: number;

    if (isVbaFile(name)) {
      compData = uncompData;
      crcVal = crc32(uncompData);
      compMethod = 0;
    } else if (modifiedFiles.has(name)) {
      const cs = new CompressionStream("deflate-raw");
      const writer = cs.writable.getWriter();
      const reader = cs.readable.getReader();
      writer.write(uncompData);
      writer.close();

      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (value) chunks.push(value);
        done = d;
      }

      compData = mergeUint8Arrays(chunks);
      crcVal = crc32(uncompData);
      compMethod = 8;
    } else if (originalCompressed[name]) {
      const orig = originalCompressed[name];
      compData = orig.data;
      crcVal = orig.crc;
      compMethod = orig.method;
    } else {
      compData = uncompData;
      crcVal = crc32(uncompData);
      compMethod = 0;
    }

    const localHeader = buildLocalHeader(nameBytes, compData.length, uncompData.length, crcVal, compMethod);
    parts.push(localHeader, nameBytes, compData);
    centralDir.push(buildCentralDirEntry(nameBytes, compData.length, uncompData.length, crcVal, offset, compMethod));
    offset += localHeader.length + nameBytes.length + compData.length;
  }

  const cdData = mergeUint8Arrays(centralDir);
  const eocd = buildEOCD(centralDir.length, cdData.length, offset);
  return mergeUint8Arrays([...parts, cdData, eocd]).buffer;
}

// ── XML Cell Injection ──

export async function injectIntoXlsm(
  templateBuffer: ArrayBuffer,
  writes: CellWrite[],
  sheetFiles: Record<string, string>
): Promise<ArrayBuffer> {
  const bySheet: Record<string, CellWrite[]> = {};
  for (const cw of writes) {
    if (!bySheet[cw.sheet]) bySheet[cw.sheet] = [];
    bySheet[cw.sheet].push(cw);
  }

  const zipResult = await readZip(new Uint8Array(templateBuffer));
  const modifiedFiles = new Set<string>();

  for (const [sheetName, sheetWrites] of Object.entries(bySheet)) {
    const xmlPath = sheetFiles[sheetName];
    if (!xmlPath || !zipResult.entries[xmlPath]) {
      console.warn(`[inject] Sheet ${sheetName} not found at ${xmlPath}`);
      continue;
    }

    let xml = new TextDecoder().decode(zipResult.entries[xmlPath]);
    xml = applyWritesToXml(xml, sheetWrites);
    zipResult.entries[xmlPath] = new TextEncoder().encode(xml);
    modifiedFiles.add(xmlPath);
    console.log(`[inject] ${sheetName}: ${sheetWrites.length} cells updated`);
  }

  return await buildZip(zipResult, modifiedFiles);
}

function applyWritesToXml(xml: string, writes: CellWrite[]): string {
  const writeMap = new Map<string, CellWrite>();
  const rowsNeeded = new Set<number>();
  for (const cw of writes) {
    if (cw.value === null || cw.value === undefined) continue;
    const cellRef = colNumToLetter(cw.col) + cw.row;
    writeMap.set(cellRef, cw);
    rowsNeeded.add(cw.row);
  }

  if (writeMap.size === 0) return xml;

  const applied = new Set<string>();
  let formulaSkipCount = 0;

  const CELL_REGEX = /<c\s+r="([A-Z]+\d+)"([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/c>)/g;

  xml = xml.replace(/<row\b([^>]*)>([\s\S]*?)<\/row>/g, (fullMatch, attrs, content) => {
    const rMatch = attrs.match(/r="(\d+)"/);
    if (!rMatch) return fullMatch;
    const rowNum = parseInt(rMatch[1]);
    if (!rowsNeeded.has(rowNum)) return fullMatch;

    const rowWrites = new Map<string, CellWrite>();
    for (const [ref, cw] of writeMap) {
      if (cw.row === rowNum) rowWrites.set(ref, cw);
    }
    if (rowWrites.size === 0) return fullMatch;

    let newContent = content.replace(
      CELL_REGEX,
      (cellMatch: string, ref: string, _cellAttrs: string, cellContent: string | undefined) => {
        const cw = rowWrites.get(ref);
        if (!cw) return cellMatch;
        if (cellContent && cellContent.includes("<f") && !cw.forceWrite) {
          formulaSkipCount++;
          applied.add(ref);
          return cellMatch;
        }
        applied.add(ref);
        return buildCellXml(ref, cw);
      }
    );

    for (const [ref, cw] of rowWrites) {
      if (applied.has(ref)) continue;
      applied.add(ref);
      newContent = insertCellInRow(newContent, buildCellXml(ref, cw), ref);
    }

    return `<row${attrs}>${newContent}</row>`;
  });

  const remaining = new Map<number, CellWrite[]>();
  for (const [ref, cw] of writeMap) {
    if (applied.has(ref)) continue;
    if (!remaining.has(cw.row)) remaining.set(cw.row, []);
    remaining.get(cw.row)!.push(cw);
  }

  if (remaining.size > 0) {
    const newRows: string[] = [];
    for (const [rowNum, rowWrites] of [...remaining.entries()].sort((a, b) => a[0] - b[0])) {
      const cells = rowWrites
        .sort((a, b) => a.col - b.col)
        .map(cw => buildCellXml(colNumToLetter(cw.col) + cw.row, cw))
        .join("");
      newRows.push(`<row r="${rowNum}">${cells}</row>`);
    }
    xml = xml.replace(/<\/sheetData>/, newRows.join("") + "</sheetData>");
  }

  if (formulaSkipCount > 0) {
    console.log(`[inject] Skipped ${formulaSkipCount} formula cells (preserved Excel formulas)`);
  }

  return xml;
}

function buildCellXml(ref: string, cw: CellWrite): string {
  if (cw.type === "string") {
    const strValue = String(cw.value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<c r="${ref}" t="inlineStr"><is><t>${strValue}</t></is></c>`;
  }
  const numValue = typeof cw.value === "number" ? cw.value : parseFloat(String(cw.value));
  return `<c r="${ref}"><v>${numValue}</v></c>`;
}

function insertCellInRow(rowContent: string, newCell: string, newRef: string): string {
  const cells = [...rowContent.matchAll(/<c\s+r="([A-Z]+\d+)"[^>]*?(?:\s*\/>|>[\s\S]*?<\/c>)/gs)];
  if (cells.length === 0) return newCell + rowContent;

  const newColNum = refToColNum(newRef);
  let insertPos = rowContent.length;

  for (const cell of cells) {
    const cellColNum = refToColNum(cell[1]);
    if (cellColNum > newColNum) {
      insertPos = cell.index!;
      break;
    }
  }

  return rowContent.slice(0, insertPos) + newCell + rowContent.slice(insertPos);
}

// ── Low-level helpers ──

function buildLocalHeader(name: Uint8Array, compSize: number, uncompSize: number, crc: number, method = 8): Uint8Array {
  const buf = new Uint8Array(30);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, method, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, compSize, true);
  view.setUint32(22, uncompSize, true);
  view.setUint16(26, name.length, true);
  view.setUint16(28, 0, true);
  return buf;
}

function buildCentralDirEntry(name: Uint8Array, compSize: number, uncompSize: number, crc: number, localOffset: number, method = 8): Uint8Array {
  const buf = new Uint8Array(46 + name.length);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, method, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, compSize, true);
  view.setUint32(24, uncompSize, true);
  view.setUint16(28, name.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localOffset, true);
  buf.set(name, 46);
  return buf;
}

function buildEOCD(numEntries: number, cdSize: number, cdOffset: number): Uint8Array {
  const buf = new Uint8Array(22);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, numEntries, true);
  view.setUint16(10, numEntries, true);
  view.setUint32(12, cdSize, true);
  view.setUint32(16, cdOffset, true);
  view.setUint16(20, 0, true);
  return buf;
}

export function colNumToLetter(n: number): string {
  let result = "";
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

export function refToColNum(ref: string): number {
  const letters = ref.replace(/\d+/g, "");
  let result = 0;
  for (const ch of letters) {
    result = result * 26 + (ch.charCodeAt(0) - 64);
  }
  return result;
}

export function excelDateSerial(date: Date): number {
  const epoch = new Date(1899, 11, 30);
  const diff = date.getTime() - epoch.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function mergeUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function sanitize(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
}
