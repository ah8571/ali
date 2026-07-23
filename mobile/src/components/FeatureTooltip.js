import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const FeatureTooltip = ({ visible, onDismiss }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      // Pulsing arrow
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true })
        ])
      ).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
      <Animated.View style={[styles.content, { opacity }]}>
        <View style={styles.card}>
          <Text style={styles.title}>Tap to start</Text>
          <Text style={styles.body}>
            Start a live voice conversation or record and transcribe your thoughts. oov listens and responds in real time.
          </Text>
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Got it</Text>
          </TouchableOpacity>
        </View>

        {/* Curvy arrow pointing down-right to the speaker button */}
        <Animated.View style={[styles.arrowWrap, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="chevron-down" size={28} color="#ffffff" style={styles.arrow1} />
          <Ionicons name="chevron-down" size={28} color="#ffffff" style={styles.arrow2} />
          <Ionicons name="arrow-down" size={36} color="#ffffff" style={styles.arrow3} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: height * 0.25,
    paddingRight: 20,
    zIndex: 1000,
  },
  content: {
    alignItems: 'flex-end',
  },
  arrowWrap: {
    marginRight: 8,
    marginTop: -8,
    alignItems: 'flex-end',
  },
  arrow1: {
    transform: [{ rotate: '315deg' }],
    marginRight: 18,
    marginBottom: -12,
    opacity: 0.5,
  },
  arrow2: {
    transform: [{ rotate: '315deg' }],
    marginRight: 12,
    marginBottom: -10,
    opacity: 0.7,
  },
  arrow3: {
    transform: [{ rotate: '315deg' }],
    marginRight: 4,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8
  },
  body: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16
  },
  dismissButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: 160,
  },
  dismissText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default FeatureTooltip;
