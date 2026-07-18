const INWORLD_HOST = process.env.INWORLD_HOST || 'api.inworld.ai';
const INWORLD_BASE = `https://${INWORLD_HOST}`;

export const inworldRtcConfigHandler = async (_req, res) => {
  try {
    // The WebRTC SDP exchange expects the raw Base64 API key as Bearer token
    const rawApiKey = String(process.env.INWORLD_API_KEY || '').trim();
    if (!rawApiKey) {
      throw new Error('INWORLD_API_KEY is not configured.');
    }

    // Fetch ICE servers from Inworld
    let iceServers = [];
    try {
      const iceRes = await fetch(`${INWORLD_BASE}/v1/realtime/ice-servers`, {
        headers: { Authorization: `Bearer ${rawApiKey}` }
      });
      if (iceRes.ok) {
        const data = await iceRes.json();
        iceServers = data.ice_servers || [];
      }
    } catch (err) {
      console.warn('[InworldRTC] Failed to fetch ICE servers:', err.message);
    }

    return res.json({
      success: true,
      config: {
        apiKey: rawApiKey,
        iceServers,
        callUrl: `${INWORLD_BASE}/v1/realtime/calls`
      }
    });
  } catch (error) {
    console.error('[InworldRTC] Config error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export default inworldRtcConfigHandler;
