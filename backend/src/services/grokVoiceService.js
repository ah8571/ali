import crypto from 'crypto';

const GROK_REALTIME_ENDPOINT = 'https://api.x.ai/v1/realtime/client_secrets';
const GROK_REALTIME_MODEL = process.env.GROK_VOICE_MODEL || 'grok-voice-latest';
const GROK_REALTIME_VOICE = process.env.GROK_VOICE || 'eve';
const GROK_WS_BASE = 'wss://api.x.ai/v1/realtime';

const getGrokApiKey = () => {
  const apiKey = String(process.env.GROK_API_KEY || process.env.XAI_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('GROK_API_KEY or XAI_API_KEY is not configured for Grok voice mode.');
  }

  return apiKey;
};

const buildGrokSessionConfig = ({ voice = GROK_REALTIME_VOICE } = {}) => ({
  voice,
  instructions: '',
  turn_detection: {
    type: 'server_vad',
    silence_duration_ms: 700,
    prefix_padding_ms: 300,
    idle_timeout_ms: 5000
  },
  audio: {
    input: {
      format: { type: 'audio/pcm', rate: 24000 },
      transport: 'json'
    },
    output: {
      format: { type: 'audio/pcm', rate: 24000 },
      transport: 'json'
    }
  }
});

export const createGrokEphemeralToken = async ({ voice = GROK_REALTIME_VOICE } = {}) => {
  const apiKey = getGrokApiKey();

  const response = await fetch(GROK_REALTIME_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      session: buildGrokSessionConfig({ voice }),
      ttl_seconds: 300
    })
  });

  if (!response.ok) {
    const detailText = await response.text();
    throw new Error(`Grok ephemeral token request failed (${response.status}): ${detailText}`);
  }

  const data = await response.json();
  const token = data?.value || data?.client_secret?.value || data?.token || null;

  if (!token) {
    throw new Error('Grok ephemeral token response did not include a token.');
  }

  return {
    provider: 'grok-voice',
    transport: 'websocket',
    ephemeralToken: token,
    wsUrl: `${GROK_WS_BASE}?model=${encodeURIComponent(GROK_REALTIME_MODEL)}`,
    model: GROK_REALTIME_MODEL,
    voice,
    expiresAt: data?.expires_at || null
  };
};

export const buildGrokRealtimeConfig = ({ voice = GROK_REALTIME_VOICE } = {}) => ({
  provider: 'grok-voice',
  transport: 'websocket',
  model: GROK_REALTIME_MODEL,
  voice,
  wsUrl: `${GROK_WS_BASE}?model=${encodeURIComponent(GROK_REALTIME_MODEL)}`,
  sessionConfig: buildGrokSessionConfig({ voice })
});

export default {
  createGrokEphemeralToken,
  buildGrokRealtimeConfig
};
