import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import legalContent from '../content/legalContent.json';
import { useAppTheme } from '../theme/appTheme.js';

const renderSection = (section, colors) => {
  return (
    <View key={section.title} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
      {(section.body || []).map((paragraph) => (
        <Text key={paragraph} style={[styles.paragraph, { color: colors.mutedText }]}> 
          {paragraph}
        </Text>
      ))}
      {(section.bullets || []).map((bullet) => (
        <View key={bullet} style={styles.bulletRow}>
          <Text style={[styles.bulletMarker, { color: colors.text }]}>•</Text>
          <Text style={[styles.bulletText, { color: colors.mutedText }]}>{bullet}</Text>
        </View>
      ))}
    </View>
  );
};

const LegalDocumentScreen = ({ documentKey = 'privacyPolicy' }) => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const document = legalContent[documentKey];
  const canGoBack = navigation.canGoBack();

  if (!document) {
    return (
      <View style={[styles.missingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.missingText, { color: colors.text }]}>Document unavailable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      {canGoBack ? (
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Emmaline legal</Text>
        <Text style={[styles.title, { color: colors.text }]}>{document.title}</Text>
        <Text style={[styles.meta, { color: colors.mutedText }]}>Last updated {document.lastUpdated}</Text>
      </View>

      {(document.intro || []).map((paragraph) => (
        <Text key={paragraph} style={[styles.introParagraph, { color: colors.text }]}>
          {paragraph}
        </Text>
      ))}

      {(document.sections || []).map((section) => renderSection(section, colors))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16
  },
  backButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700'
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 6
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1
  },
  title: {
    fontSize: 28,
    fontWeight: '700'
  },
  meta: {
    fontSize: 13,
    lineHeight: 18
  },
  introParagraph: {
    fontSize: 15,
    lineHeight: 23
  },
  section: {
    gap: 10
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700'
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  bulletMarker: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700'
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21
  },
  missingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  missingText: {
    fontSize: 16,
    fontWeight: '600'
  }
});

export default LegalDocumentScreen;