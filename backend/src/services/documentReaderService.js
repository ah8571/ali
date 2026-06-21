import path from 'path';
import { PDFParse } from 'pdf-parse';

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.pdf']);
const SUPPORTED_MIME_TYPES = new Set(['text/plain', 'application/pdf']);

const normalizeExtractedText = (value) => {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getFileExtension = (fileName) => path.extname(String(fileName || '')).toLowerCase();

const isPlainTextUpload = (file) => {
  const extension = getFileExtension(file?.originalname);
  return file?.mimetype === 'text/plain' || extension === '.txt';
};

const isPdfUpload = (file) => {
  const extension = getFileExtension(file?.originalname);
  return file?.mimetype === 'application/pdf' || extension === '.pdf';
};

export const getReaderDocumentTitle = (fileName = '') => {
  const baseName = path.basename(String(fileName || ''), path.extname(String(fileName || ''))).trim();

  if (!baseName) {
    return 'Imported document';
  }

  return baseName.slice(0, 120);
};

export const validateReaderUpload = (file) => {
  if (!file) {
    throw new Error('No document uploaded');
  }

  const extension = getFileExtension(file.originalname);
  const mimeType = String(file.mimetype || '').toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension) && !SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new Error('Only .txt and .pdf files are supported right now');
  }
};

export const extractReaderTextFromUpload = async (file) => {
  validateReaderUpload(file);

  let extractedText = '';
  let pageCount = null;

  if (isPlainTextUpload(file)) {
    extractedText = file.buffer.toString('utf8');
  } else if (isPdfUpload(file)) {
    const parser = new PDFParse({ data: file.buffer });
    const parsedPdf = await parser.getText();
    await parser.destroy();
    extractedText = parsedPdf.text || '';
    pageCount = Number.isFinite(parsedPdf.total) ? parsedPdf.total : null;
  } else {
    throw new Error('Unsupported document type');
  }

  const normalizedText = normalizeExtractedText(extractedText);

  if (!normalizedText) {
    throw new Error('No readable text was found in that document');
  }

  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;

  return {
    title: getReaderDocumentTitle(file.originalname),
    text: normalizedText,
    metadata: {
      fileName: file.originalname,
      mimeType: file.mimetype,
      byteSize: file.size,
      pageCount,
      wordCount,
      characterCount: normalizedText.length
    }
  };
};

export default {
  extractReaderTextFromUpload,
  getReaderDocumentTitle,
  validateReaderUpload
};