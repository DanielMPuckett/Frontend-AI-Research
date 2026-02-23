import { describe, it, expect } from 'vitest';
import { extractText } from '../src/services/textExtractor';

describe('extractText', () => {
  it('extracts text from plain text buffer', async () => {
    const buffer = Buffer.from('Hello, World!', 'utf8');
    const result = await extractText(buffer, 'text/plain');
    expect(result).toBe('Hello, World!');
  });

  it('extracts text from markdown buffer', async () => {
    const buffer = Buffer.from('# Title\n\nSome content here.', 'utf8');
    const result = await extractText(buffer, 'text/markdown');
    expect(result).toBe('# Title\n\nSome content here.');
  });

  it('extracts text from CSV buffer', async () => {
    const buffer = Buffer.from('name,age\nAlice,30\nBob,25', 'utf8');
    const result = await extractText(buffer, 'text/csv');
    expect(result).toBe('name,age\nAlice,30\nBob,25');
  });

  it('returns null for image MIME type', async () => {
    const buffer = Buffer.from('\x89PNG\r\n'); // fake PNG header
    const result = await extractText(buffer, 'image/png');
    expect(result).toBeNull();
  });

  it('returns null for video MIME type', async () => {
    const buffer = Buffer.from('fake video data');
    const result = await extractText(buffer, 'video/mp4');
    expect(result).toBeNull();
  });

  it('returns null for unknown binary MIME type', async () => {
    const buffer = Buffer.from('\x00\x01\x02\x03');
    const result = await extractText(buffer, 'application/octet-stream');
    expect(result).toBeNull();
  });

  it('handles MIME types with charset parameter', async () => {
    const buffer = Buffer.from('some text', 'utf8');
    const result = await extractText(buffer, 'text/plain; charset=utf-8');
    expect(result).toBe('some text');
  });
});
