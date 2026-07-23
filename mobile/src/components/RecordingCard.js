import React, { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAudioPlayer from '../hooks/useAudioPlayer';

const formatTime = (ms) => {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const RecordingCard = ({ entry, colors }) => {
  const progressTrackWidthRef = useRef(0);
  const {
    isLoaded,
    isPlaying,
    positionMillis,
    durationMillis,
    togglePlayback,
    seekTo,
    jumpForward,
    jumpBack,
  } = useAudioPlayer(entry);

  const progressRatio = durationMillis > 0
    ? Math.max(0, Math.min(1, positionMillis / durationMillis))
    : 0;

  const handleProgressSeek = (event) => {
    const width = progressTrackWidthRef.current;
    if (!width || !durationMillis) return;
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / width));
    seekTo(ratio * durationMillis);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <TouchableOpacity
          style={[styles.playButton, { borderColor: colors.border, backgroundColor: isPlaying ? colors.accent : colors.surface }]}
          onPress={togglePlayback}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isPlaying ? '#ffffff' : colors.text}
          />
        </TouchableOpacity>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {entry.title || 'Recording'}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedText }]}>
            {entry.voiceLabel || entry.voiceName || 'Audio'}
            {entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleDateString()}` : ''}
          </Text>
        </View>
      </View>

      {/* Progress + time */}
      <View style={styles.progressRow}>
        <Text style={[styles.timeText, { color: colors.mutedText }]}>{formatTime(positionMillis)}</Text>
        <TouchableOpacity
          style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt || colors.background }]}
          onPress={handleProgressSeek}
          onLayout={(e) => { progressTrackWidthRef.current = e.nativeEvent.layout.width; }}
          activeOpacity={1}
        >
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%`, backgroundColor: colors.accent }]} />
        </TouchableOpacity>
        <Text style={[styles.timeText, { color: colors.mutedText }]}>{formatTime(durationMillis)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => jumpBack(15000)}
        >
          <Text style={[styles.controlText, { color: colors.text }]}>-15s</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => seekTo(0)}
        >
          <Text style={[styles.controlText, { color: colors.text }]}>Restart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => jumpForward(15000)}
        >
          <Text style={[styles.controlText, { color: colors.text }]}>+15s</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressTrackInner: {
    flex: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  controlButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  controlText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default RecordingCard;
