/**
 * OpenRouter voice models endpoint
 * Exposes available TTS/STT models and voices to the mobile app.
 */

import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { OPENROUTER_TTS_MODELS, OPENROUTER_STT_MODELS, isOpenRouterConfigured } from '../services/openRouterVoiceService.js';

const router = express.Router();

// Kokoro voice list by language
const KOKORO_VOICES = {
  en: ['af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'am_adam', 'am_michael', 'bf_emma', 'bf_isabella', 'bm_george', 'bm_lewis'],
  es: ['ef_dora', 'em_alex', 'em_santa'],
  fr: ['ff_siwis'],
  hi: ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi'],
  it: ['if_sara', 'im_nicola'],
  ja: ['jf_alpha', 'jf_gongitsune', 'jf_nezumi', 'jf_tebukuro', 'jm_kumo'],
  pt: ['pf_dora', 'pm_alex', 'pm_santa'],
  zh: ['zf_xiaobei', 'zf_xiaoni', 'zf_xiaoxiao', 'zf_xiaoyi', 'zm_yunjian', 'zm_yunxia', 'zm_yunyang'],
};

router.get('/models', authMiddleware, (_req, res) => {
  const configured = isOpenRouterConfigured();

  res.json({
    success: true,
    configured,
    tts: configured ? {
      ...OPENROUTER_TTS_MODELS,
      kokoro: {
        ...OPENROUTER_TTS_MODELS.kokoro,
        voices: KOKORO_VOICES,
      },
    } : null,
    stt: configured ? OPENROUTER_STT_MODELS : null,
  });
});

export default router;
