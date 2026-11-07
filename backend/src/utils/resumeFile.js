export const RESUME_MAX_BYTES = 10 * 1024 * 1024;
export const PDF_TYPE = 'application/pdf';
export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Inspect the ZIP directory before passing a Word file to the decompressor.
// Resume documents should fit within the ordinary single-disk ZIP format.
function isWordArchive(buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) return false;
  const earliestEnd = Math.max(0, buffer.length - 65557);
  let end = buffer.length - 22;
  for (; end >= earliestEnd; end -= 1) {
    if (buffer.readUInt32LE(end) === 0x06054b50 && end + 22 + buffer.readUInt16LE(end + 20) === buffer.length) break;
  }
  if (end < earliestEnd || buffer.readUInt32LE(end + 4) !== 0) return false;
  const entries = buffer.readUInt16LE(end + 10);
  const directorySize = buffer.readUInt32LE(end + 12);
  let position = buffer.readUInt32LE(end + 16);
  if (!entries || entries > 2048 || entries !== buffer.readUInt16LE(end + 8) || position + directorySize !== end) return false;

  const names = new Set();
  let expandedBytes = 0;
  for (let i = 0; i < entries; i += 1) {
    if (position + 46 > end || buffer.readUInt32LE(position) !== 0x02014b50) return false;
    const flags = buffer.readUInt16LE(position + 8);
    const nameLength = buffer.readUInt16LE(position + 28);
    const extraLength = buffer.readUInt16LE(position + 30);
    const commentLength = buffer.readUInt16LE(position + 32);
    const next = position + 46 + nameLength + extraLength + commentLength;
    expandedBytes += buffer.readUInt32LE(position + 24);
    if (flags & 1 || !nameLength || next > end || expandedBytes > 64 * 1024 * 1024) return false;
    names.add(buffer.toString('utf8', position + 46, position + 46 + nameLength));
    position = next;
  }
  return position === end && names.has('[Content_Types].xml') && names.has('word/document.xml');
}

export function detectResumeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > RESUME_MAX_BYTES) return null;
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return PDF_TYPE;
  return isWordArchive(buffer) ? DOCX_TYPE : null;
}
