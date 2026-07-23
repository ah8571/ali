import * as FileSystem from 'expo-file-system/legacy';

const READER_AUDIO_DIRECTORY = `${FileSystem.documentDirectory}reader-audio`;
const READER_AUDIO_INDEX_FILE = `${READER_AUDIO_DIRECTORY}/latest.json`;

/**
 * Load saved reader audio entries from the local device index.
 * Each entry has { id, title, uri, voiceLabel, createdAt, ... }.
 */
export const loadLocalAudioRecordings = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(READER_AUDIO_INDEX_FILE);
    if (!fileInfo.exists) return [];

    const content = await FileSystem.readAsStringAsync(READER_AUDIO_INDEX_FILE);
    const parsed = JSON.parse(content);
    const entries = Array.isArray(parsed) ? parsed : [];

    // Filter to entries with valid local URIs
    const validEntries = [];
    for (const entry of entries) {
      if (!entry?.uri) continue;
      try {
        const audioInfo = await FileSystem.getInfoAsync(entry.uri);
        if (audioInfo.exists) {
          validEntries.push(entry);
        }
      } catch {
        // Skip entries with inaccessible files
      }
    }

    return validEntries;
  } catch (error) {
    console.error('[loadLocalAudioRecordings] Error:', error?.message);
    return [];
  }
};
