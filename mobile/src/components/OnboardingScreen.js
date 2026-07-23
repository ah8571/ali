import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'mic',
    title: 'Voice Mode',
    description: 'Have real-time conversations with oov. Speak naturally and get spoken responses back. Choose between English and Spanish.',
  },
  {
    icon: 'document-text',
    title: 'Notes & Reader',
    description: 'Create notes during calls or on your own. The Reader reads your notes aloud — perfect for reviewing on the go.',
  },
  {
    icon: 'sparkles',
    title: 'Credits & Premium Voices',
    description: 'Voice Mode uses credits. Get free starter credits, buy more anytime, or subscribe for monthly credit bundles.',
  },
];

const OnboardingScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const onNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete?.();
    }
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon} size={72} color="#ffffff" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          keyExtractor={(_, i) => String(i)}
        />

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Bottom */}
        <View style={styles.bottom}>
          {currentIndex < SLIDES.length - 1 ? (
            <TouchableOpacity onPress={() => onComplete?.()} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <TouchableOpacity onPress={onNext} style={styles.nextButton}>
            <Text style={styles.nextText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0a',
    zIndex: 9999,
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 120,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 24,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  nextText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
