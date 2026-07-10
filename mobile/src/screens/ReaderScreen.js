import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { importReaderDocument, saveReaderAudio } from '../services/api.js';
import { useAppTheme } from '../theme/appTheme.js';
import { getCallLanguagePreference, getSpeechRatePreference } from '../utils/secureStorage.js';

const BOTTOM_SAFE_ZONE = 44;
const MAX_SPEECH_CHUNK_LENGTH = 1600;
const MIN_BODY_INPUT_HEIGHT = 280;
const READER_AUDIO_DIRECTORY = `${FileSystem.documentDirectory}reader-audio`;
const READER_AUDIO_INDEX_FILE = `${READER_AUDIO_DIRECTORY}/latest.json`;

const resolveSpeechLanguage = (languagePreference) => {
  if (languagePreference === 'es') {
    return 'es-US';
  }

  return 'en-US';
};

const splitTextIntoSpeechChunks = (text) => {
  const source = String(text || '').trim();

  if (!source) {
    return [];
  }

  const chunks = [];
  let remainingText = source;

  while (remainingText.length > MAX_SPEECH_CHUNK_LENGTH) {
    const candidate = remainingText.slice(0, MAX_SPEECH_CHUNK_LENGTH);
    const sentenceBreak = Math.max(
      candidate.lastIndexOf('. '),
      candidate.lastIndexOf('? '),
      candidate.lastIndexOf('! '),
      candidate.lastIndexOf('\n')
    );
    const wordBreak = candidate.lastIndexOf(' ');
    const breakIndex = sentenceBreak > 300 ? sentenceBreak + 1 : wordBreak > 300 ? wordBreak : MAX_SPEECH_CHUNK_LENGTH;

    chunks.push(remainingText.slice(0, breakIndex).trim());
    remainingText = remainingText.slice(breakIndex).trim();
  }

  if (remainingText) {
    chunks.push(remainingText);
  }

  return chunks.filter(Boolean);
};

const buildReaderTextSignature = (title, text) => {
  return JSON.stringify({
    title: String(title || '').trim(),
    text: String(text || '').trim()
  });
};

const sanitizeAudioFileName = (value) => {
  const normalized = String(value || 'reader-audio')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'reader-audio';
};

const ensureReaderAudioDirectory = async () => {
  const directoryInfo = await FileSystem.getInfoAsync(READER_AUDIO_DIRECTORY);

  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(READER_AUDIO_DIRECTORY, { intermediates: true });
  }
};

const loadSavedReaderAudio = async () => {
  await ensureReaderAudioDirectory();
  const indexInfo = await FileSystem.getInfoAsync(READER_AUDIO_INDEX_FILE);

  if (!indexInfo.exists) {
    return null;
  }

  const serializedEntry = await FileSystem.readAsStringAsync(READER_AUDIO_INDEX_FILE);
  const parsedEntry = JSON.parse(serializedEntry);
  const audioInfo = await FileSystem.getInfoAsync(parsedEntry.uri);

  if (!audioInfo.exists) {
    return null;
  }

  return parsedEntry;
};

const persistSavedReaderAudio = async (entry) => {
  await ensureReaderAudioDirectory();
  await FileSystem.writeAsStringAsync(READER_AUDIO_INDEX_FILE, JSON.stringify(entry));
};

const ReaderScreen = ({ onAppHeaderScroll }) => {
  const { colors, isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [documentTitle, setDocumentTitle] = useState('');
  const [readerText, setReaderText] = useState('');
  const [importMetadata, setImportMetadata] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [savedAudioEntry, setSavedAudioEntry] = useState(null);
  const [isSavedAudioPlaying, setIsSavedAudioPlaying] = useState(false);
  const [bodyInputHeight, setBodyInputHeight] = useState(MIN_BODY_INPUT_HEIGHT);
  const speechChunksRef = useRef([]);
  const speechIndexRef = useRef(0);
  const speechCancelledRef = useRef(false);
  const savedAudioSoundRef = useRef(null);

  const currentTextSignature = buildReaderTextSignature(documentTitle, readerText);
  const isSavedAudioCurrent = savedAudioEntry?.textSignature === currentTextSignature;

  useEffect(() => {
    loadSavedReaderAudio()
      .then((entry) => {
        if (entry) {
          setSavedAudioEntry(entry);
        }
      })
      .catch(() => {
        // Ignore best-effort hydration failures.
      });

    return () => {
      speechCancelledRef.current = true;
      const unloadSavedAudio = async () => {
        if (!savedAudioSoundRef.current) {
          return;
        }

        try {
          await savedAudioSoundRef.current.unloadAsync();
        } catch {
          // Ignore cleanup failures during unmount.
        } finally {
          savedAudioSoundRef.current = null;
        }
      };

      Speech.stop().catch(() => {
        // Ignore cleanup failures during unmount.
      });
      unloadSavedAudio().catch(() => {
        // Ignore cleanup failures during unmount.
      });
      onAppHeaderScroll?.(0);
    };
  }, [onAppHeaderScroll]);

  const handleScroll = (event) => {
    const nextOffsetY = Math.max(0, event.nativeEvent.contentOffset.y || 0);
    onAppHeaderScroll?.(nextOffsetY);
  };

  const stopReading = useCallback(async () => {
    speechCancelledRef.current = true;
    speechChunksRef.current = [];
    speechIndexRef.current = 0;
    setIsSpeaking(false);

    try {
      await Speech.stop();
    } catch {
      // Some Android TTS engines throw when stop is called before the engine binds.
    }
  }, []);

  const stopSavedAudioPlayback = useCallback(async () => {
    const activeSound = savedAudioSoundRef.current;

    if (!activeSound) {
      setIsSavedAudioPlaying(false);
      return;
    }

    try {
      await activeSound.stopAsync();
    } catch {
      // Ignore best-effort stop failures.
    }

    try {
      await activeSound.unloadAsync();
    } catch {
      // Ignore best-effort unload failures.
    }

    savedAudioSoundRef.current = null;
    setIsSavedAudioPlaying(false);
  }, []);

  const speakNextChunk = useCallback(async (language, rate) => {
    if (speechCancelledRef.current) {
      return;
    }

    const nextChunk = speechChunksRef.current[speechIndexRef.current];

    if (!nextChunk) {
      setIsSpeaking(false);
      return;
    }

    Speech.speak(nextChunk, {
      language,
      rate,
      onDone: () => {
        speechIndexRef.current += 1;

        if (speechIndexRef.current >= speechChunksRef.current.length) {
          setIsSpeaking(false);
          return;
        }

        speakNextChunk(language, rate);
      },
      onStopped: () => {
        setIsSpeaking(false);
      },
      onError: () => {
        setIsSpeaking(false);
        Alert.alert('Reader error', 'The device could not read this text aloud.');
      }
    });
  }, []);

  const handleReadAloud = useCallback(async () => {
    const normalizedText = String(readerText || '').trim();

    if (!normalizedText) {
      Alert.alert('Nothing to read', 'Paste text or import a document first.');
      return;
    }

    await stopReading();

    const [languagePreference, savedSpeechRate] = await Promise.all([
      getCallLanguagePreference(),
      getSpeechRatePreference()
    ]);
    const speechLanguage = resolveSpeechLanguage(languagePreference);
    const speechRate = Math.max(0.75, Math.min(1.1, Number(savedSpeechRate) || 1));

    speechCancelledRef.current = false;
    speechChunksRef.current = splitTextIntoSpeechChunks(normalizedText);
    speechIndexRef.current = 0;
    setIsSpeaking(true);
    speakNextChunk(speechLanguage, speechRate);
  }, [readerText, speakNextChunk, stopReading]);

  const handleImportDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false
      });

      if (result.canceled) {
        return;
      }

      const selectedFile = result.assets?.[0];

      if (!selectedFile) {
        Alert.alert('Import error', 'No document was selected.');
        return;
      }

      setIsImporting(true);
      const response = await importReaderDocument(selectedFile);

      if (!response.success) {
        throw new Error(response.error || 'Unable to import document');
      }

      await stopReading();
      setDocumentTitle(response.title || selectedFile.name || 'Imported document');
      setReaderText(response.text || '');
      setImportMetadata(response.metadata || null);
    } catch (error) {
      Alert.alert('Import failed', error.message || 'Unable to import this document right now.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleGenerateAudio = useCallback(async () => {
    const normalizedText = String(readerText || '').trim();

    if (!normalizedText) {
      Alert.alert('Nothing to save', 'Paste text or import a document first.');
      return;
    }

    try {
      setIsGeneratingAudio(true);
      await stopSavedAudioPlayback();

      const [languagePreference, savedSpeechRate] = await Promise.all([
        getCallLanguagePreference(),
        getSpeechRatePreference()
      ]);
      const speechRate = Math.max(0.75, Math.min(1.1, Number(savedSpeechRate) || 1));
      const response = await saveReaderAudio({
        text: normalizedText,
        title: documentTitle,
        languagePreference,
        speechRate
      });

      if (!response.success) {
        throw new Error(response.error || 'Unable to create reader audio');
      }

      await ensureReaderAudioDirectory();

      const fileName = sanitizeAudioFileName((response.fileName || documentTitle || 'reader-audio').replace(/\.mp3$/i, ''));
      const targetUri = `${READER_AUDIO_DIRECTORY}/${Date.now()}-${fileName}.mp3`;

      await FileSystem.writeAsStringAsync(targetUri, response.audioBase64, {
        encoding: FileSystem.EncodingType.Base64
      });

      const nextSavedAudioEntry = {
        id: String(Date.now()),
        savedAudioId: response.savedAudioId || null,
        title: documentTitle || 'Reader audio',
        uri: targetUri,
        fileName: `${fileName}.mp3`,
        createdAt: response.createdAt || new Date().toISOString(),
        textSignature: buildReaderTextSignature(documentTitle, readerText),
        characterCount: response.metadata?.characterCount || normalizedText.length,
        languageCode: response.metadata?.languageCode || resolveSpeechLanguage(languagePreference)
      };

      await persistSavedReaderAudio(nextSavedAudioEntry);
      setSavedAudioEntry(nextSavedAudioEntry);
    } catch (error) {
      Alert.alert('Audio save failed', error.message || 'Unable to save this audio file right now.');
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [documentTitle, readerText, stopSavedAudioPlayback]);

  const handleToggleSavedAudioPlayback = useCallback(async () => {
    if (!savedAudioEntry?.uri) {
      return;
    }

    if (isSavedAudioPlaying) {
      await stopSavedAudioPlayback();
      return;
    }

    try {
      await stopReading();
      await stopSavedAudioPlayback();
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: savedAudioEntry.uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) {
            if (status.error) {
              setIsSavedAudioPlaying(false);
              savedAudioSoundRef.current = null;
            }

            return;
          }

          if (status.didJustFinish) {
            setIsSavedAudioPlaying(false);

            sound.unloadAsync().catch(() => {
              // Ignore cleanup failures after playback completes.
            });
            savedAudioSoundRef.current = null;
          }
        }
      );

      savedAudioSoundRef.current = sound;
      setIsSavedAudioPlaying(true);
    } catch (error) {
      setIsSavedAudioPlaying(false);
      Alert.alert('Playback failed', error.message || 'Unable to play this saved audio file.');
    }
  }, [isSavedAudioPlaying, savedAudioEntry, stopReading, stopSavedAudioPlayback]);

  const handleShareSavedAudio = useCallback(async () => {
    if (!savedAudioEntry?.uri) {
      return;
    }

    try {
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert('Sharing unavailable', 'This device cannot share audio files right now.');
        return;
      }

      await Sharing.shareAsync(savedAudioEntry.uri, {
        mimeType: 'audio/mpeg',
        dialogTitle: 'Download reader audio'
      });
    } catch (error) {
      Alert.alert('Download failed', error.message || 'Unable to download this audio file right now.');
    }
  }, [savedAudioEntry]);

  const handleClear = () => {
    stopReading().catch(() => {
      // Best-effort clear.
    });
    setDocumentTitle('');
    setReaderText('');
    setImportMetadata(null);
  };

  const wordCount = String(readerText || '').trim() ? String(readerText || '').trim().split(/\s+/).filter(Boolean).length : 0;
  const bottomContentInset = Math.max(insets.bottom, BOTTOM_SAFE_ZONE);
  const primaryButtonBackground = isDarkMode ? colors.surfaceAlt : colors.text;
  const primaryButtonTextColor = isDarkMode ? colors.text : '#ffffff';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomContentInset + 120 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Reader</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Read on the go</Text>
          <Text style={[styles.sectionDescription, { color: colors.mutedText }]}>Paste text or import a plain-text file or PDF, then have your device read it aloud, save audio below, or download it for later.</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: primaryButtonBackground, borderColor: colors.border }]}
              onPress={handleImportDocument}
              disabled={isImporting}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryButtonText, { color: primaryButtonTextColor }]}>{isImporting ? 'Importing...' : 'Import TXT or PDF'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={handleClear}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {isImporting ? (
            <View style={[styles.importCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.importingText, { color: colors.mutedText }]}>Extracting readable text from your document...</Text>
            </View>
          ) : null}

          {importMetadata ? (
            <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metaTitle, { color: colors.text }]}>{documentTitle || 'Imported document'}</Text>
              <Text style={[styles.metaText, { color: colors.mutedText }]}>Words: {importMetadata.wordCount || wordCount} · Characters: {importMetadata.characterCount || String(readerText || '').length}</Text>
              {importMetadata.pageCount ? (
                <Text style={[styles.metaText, { color: colors.mutedText }]}>Pages: {importMetadata.pageCount}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.editorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={documentTitle}
              onChangeText={setDocumentTitle}
              placeholder="Document title"
              placeholderTextColor={colors.mutedText}
              style={[styles.titleInput, { color: colors.text, borderBottomColor: colors.border }]}
            />
            <TextInput
              value={readerText}
              onChangeText={setReaderText}
              placeholder="Paste an article, study guide, memo, or document text here..."
              placeholderTextColor={colors.mutedText}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              onContentSizeChange={(event) => {
                const nextHeight = Math.max(MIN_BODY_INPUT_HEIGHT, Math.ceil(event.nativeEvent.contentSize.height) + 24);
                setBodyInputHeight(nextHeight);
              }}
              style={[styles.bodyInput, { color: colors.text, minHeight: bodyInputHeight, height: bodyInputHeight }]}
            />
          </View>

          <View style={[styles.metaFooter, { borderColor: colors.border }]}> 
            <Text style={[styles.metaFooterText, { color: colors.mutedText }]}>{wordCount} words ready to read</Text>
            <Text style={[styles.metaFooterText, { color: colors.mutedText }]}>Uses your current speech speed preference</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: primaryButtonBackground, borderColor: colors.border, opacity: isSpeaking ? 0.82 : 1 }]}
              onPress={handleReadAloud}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryButtonText, { color: primaryButtonTextColor }]}>{isSpeaking ? 'Restart reading' : 'Read aloud'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface, opacity: isSpeaking ? 1 : 0.55 }]}
              onPress={() => {
                stopReading().catch(() => {
                  // Best-effort stop.
                });
              }}
              disabled={!isSpeaking}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Stop</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, styles.fullWidthButton, { borderColor: colors.border, backgroundColor: colors.surface, opacity: isGeneratingAudio ? 0.72 : 1 }]}
            onPress={handleGenerateAudio}
            disabled={isGeneratingAudio}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{isGeneratingAudio ? 'Saving audio...' : 'Save audio below'}</Text>
          </TouchableOpacity>

          {savedAudioEntry ? (
            <View style={[styles.audioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metaTitle, { color: colors.text }]}>Saved audio</Text>
              <Text style={[styles.metaText, { color: colors.mutedText }]}>{savedAudioEntry.title || 'Reader audio'}</Text>
              <Text style={[styles.metaText, { color: colors.mutedText }]}>
                {isSavedAudioCurrent ? 'Saved below and ready to replay or download.' : 'Saved from an earlier text version. You can still play or download it, or save a fresh file below.'}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: primaryButtonBackground, borderColor: colors.border, opacity: isGeneratingAudio ? 0.7 : 1 }]}
                  onPress={handleToggleSavedAudioPlayback}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.primaryButtonText, { color: primaryButtonTextColor }]}>{isSavedAudioPlaying ? 'Stop audio' : 'Play saved audio'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={handleShareSavedAudio}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <Text style={[styles.helpText, { color: colors.mutedText }]}>Read aloud uses the device voice for speed. Save audio below to keep an MP3 on this screen, then download it whenever you want.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    paddingBottom: 24
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomWidth: 1
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700'
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 14
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderWidth: 1
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600'
  },
  fullWidthButton: {
    width: '100%'
  },
  importCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10
  },
  importingText: {
    fontSize: 14,
    textAlign: 'center'
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4
  },
  metaTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18
  },
  audioCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8
  },
  editorCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden'
  },
  titleInput: {
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    borderBottomWidth: 1
  },
  bodyInput: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    lineHeight: 24
  },
  metaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 12
  },
  metaFooterText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18
  },
  helpText: {
    fontSize: 13,
    lineHeight: 19,
    paddingBottom: 8
  }
});

export default ReaderScreen;