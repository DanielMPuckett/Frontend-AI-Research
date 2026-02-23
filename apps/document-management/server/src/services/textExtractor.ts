import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extracts plaintext content from a file buffer for FTS indexing.
 * Returns null for file types where text extraction is not possible.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const normalizedType = mimeType.toLowerCase().split(';')[0].trim();

  // Plaintext types — direct UTF-8 decode
  if (
    normalizedType === 'text/plain' ||
    normalizedType === 'text/markdown' ||
    normalizedType === 'text/x-markdown' ||
    normalizedType === 'text/csv' ||
    normalizedType === 'text/html' ||
    normalizedType === 'application/json' ||
    normalizedType === 'text/javascript' ||
    normalizedType === 'application/javascript' ||
    normalizedType === 'text/css'
  ) {
    return buffer.toString('utf8');
  }

  // PDF extraction via pdf-parse
  if (normalizedType === 'application/pdf') {
    try {
      const result = await pdfParse(buffer);
      return result.text ?? null;
    } catch {
      return null;
    }
  }

  // DOCX extraction via mammoth
  if (
    normalizedType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? null;
    } catch {
      return null;
    }
  }

  // All other types (images, video, audio, zip, etc.) — not extractable
  return null;
}
