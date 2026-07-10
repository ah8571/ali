import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.js';
import { saveReaderAudio as saveReaderAudioRecord } from '../services/databaseService.js';
import { extractReaderTextFromUpload } from '../services/documentReaderService.js';
import { textToAudio } from '../services/textToSpeechService.js';

const router = express.Router();
const MAX_AUDIO_EXPORT_CHARACTERS = 12000;
const MAX_AUDIO_CHUNK_LENGTH = 1600;
const READER_LANGUAGE_CONFIG = {
  en: {
    languageCode: 'en-US',
    voice: process.env.GOOGLE_TTS_VOICE || 'en-US-Neural2-C'
  },
  es: {
    languageCode: 'es-US',
    voice: process.env.GOOGLE_TTS_VOICE_ES || 'es-US-Neural2-A'
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

const splitTextIntoAudioChunks = (text) => {
  const source = String(text || '').trim();

  if (!source) {
    return [];
  }

  const chunks = [];
  let remainingText = source;

  while (remainingText.length > MAX_AUDIO_CHUNK_LENGTH) {
    const candidate = remainingText.slice(0, MAX_AUDIO_CHUNK_LENGTH);
    const sentenceBreak = Math.max(
      candidate.lastIndexOf('. '),
      candidate.lastIndexOf('? '),
      candidate.lastIndexOf('! '),
      candidate.lastIndexOf('\n')
    );
    const wordBreak = candidate.lastIndexOf(' ');
    const breakIndex = sentenceBreak > 300 ? sentenceBreak + 1 : wordBreak > 300 ? wordBreak : MAX_AUDIO_CHUNK_LENGTH;

    chunks.push(remainingText.slice(0, breakIndex).trim());
    remainingText = remainingText.slice(breakIndex).trim();
  }

  if (remainingText) {
    chunks.push(remainingText);
  }

  return chunks.filter(Boolean);
};

const sanitizeFileStem = (value) => {
  const normalized = String(value || 'reader-audio')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'reader-audio';
};

const resolveReaderVoiceConfig = (languagePreference) => {
  return READER_LANGUAGE_CONFIG[languagePreference] || READER_LANGUAGE_CONFIG.en;
};

const normalizeReaderAudioRequest = (body = {}) => {
  const normalizedText = String(body.text || '').trim();
  const title = String(body.title || '').trim();
  const languagePreference = String(body.languagePreference || 'en').trim().toLowerCase();
  const speechRate = Math.max(0.75, Math.min(1.1, Number(body.speechRate) || 1));

  return {
    normalizedText,
    title,
    languagePreference,
    speechRate
  };
};

const buildReaderAudioResponse = async ({ normalizedText, title, languagePreference, speechRate }) => {
  if (!normalizedText) {
    throw new Error('Paste text or import a document first.');
  }

  if (normalizedText.length > MAX_AUDIO_EXPORT_CHARACTERS) {
    throw new Error(`Audio export is limited to ${MAX_AUDIO_EXPORT_CHARACTERS.toLocaleString()} characters right now.`);
  }

  const voiceConfig = resolveReaderVoiceConfig(languagePreference);
  const chunks = splitTextIntoAudioChunks(normalizedText);
  const audioBuffers = [];

  for (const chunk of chunks) {
    const audioBuffer = await textToAudio(chunk, {
      languageCode: voiceConfig.languageCode,
      voice: voiceConfig.voice,
      speakingRate: speechRate,
      audioEncoding: 'MP3',
      responseFormat: 'mp3'
    });

    audioBuffers.push(audioBuffer);
  }

  const mergedAudio = Buffer.concat(audioBuffers);
  const fileStem = sanitizeFileStem(title || normalizedText.slice(0, 48));

  return {
    fileName: `${fileStem}.mp3`,
    contentType: 'audio/mpeg',
    audioBase64: mergedAudio.toString('base64'),
    metadata: {
      characterCount: normalizedText.length,
      chunkCount: chunks.length,
      languageCode: voiceConfig.languageCode
    }
  };
};

router.post('/extract', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const result = await extractReaderTextFromUpload(req.file);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Reader document import failed:', error.message);
    return res.status(400).json({ error: error.message || 'Unable to import document' });
  }
});

router.post('/audio', authMiddleware, async (req, res) => {
  try {
    const audioResponse = await buildReaderAudioResponse(normalizeReaderAudioRequest(req.body));

    return res.status(200).json({
      success: true,
      ...audioResponse
    });
  } catch (error) {
    console.error('Reader audio export failed:', error.message);
    return res.status(400).json({ error: error.message || 'Unable to create reader audio' });
  }
});

router.post('/audio/save', authMiddleware, async (req, res) => {
  try {
    const requestData = normalizeReaderAudioRequest(req.body);
    const audioResponse = await buildReaderAudioResponse(requestData);
    const savedAudio = await saveReaderAudioRecord(req.user.userId, {
      title: requestData.title || 'Reader audio',
      sourceText: requestData.normalizedText,
      fileName: audioResponse.fileName,
      contentType: audioResponse.contentType,
      audioBase64: audioResponse.audioBase64,
      characterCount: audioResponse.metadata.characterCount,
      chunkCount: audioResponse.metadata.chunkCount,
      languageCode: audioResponse.metadata.languageCode,
      metadata: {
        languagePreference: requestData.languagePreference,
        speechRate: requestData.speechRate
      }
    });

    return res.status(200).json({
      success: true,
      savedAudioId: savedAudio.id,
      createdAt: savedAudio.created_at,
      ...audioResponse
    });
  } catch (error) {
    console.error('Reader audio save failed:', error.message);
    return res.status(400).json({ error: error.message || 'Unable to save reader audio' });
  }
});

router.use((error, req, res, next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Document is too large. Keep uploads under 8 MB.' });
  }

  return next(error);
});

export default router;