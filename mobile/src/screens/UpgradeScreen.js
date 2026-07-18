import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getBillingStatus } from '../services/api.js';
import {
  getRevenueCatCustomerInfo,
  getRevenueCatDisplayMessage,
  getRevenueCatOfferings,
  getRevenueCatSetupMessage,
  initializeRevenueCat,
  isProEntitlementActive,
  isRevenueCatEnabled,
  isRevenueCatUserCancelled,
  purchaseRevenueCatPackage
} from '../services/revenueCatService.js';
import { getUser } from '../utils/secureStorage.js';
import { useAppTheme } from '../theme/appTheme.js';
import { designTokens } from '../theme/designSystem.js';

const LIVE_CALLS_ENABLED = false;

const UpgradeScreen = ({ navigation: _navigation }) => {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const isLiveCallAvailable = LIVE_CALLS_ENABLED;
  const [billing, setBilling] = useState(null);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offeringPackage, setOfferingPackage] = useState(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [revenueCatMessage, setRevenueCatMessage] = useState(null);
  const [isProActive, setIsProActive] = useState(false);

  useEffect(() => {
    const loadBilling = async () => {
      const response = await getBillingStatus();

      if (response.success) {
        setBilling(response.billing || null);
        setCredits(response.credits || null);
      }

      setLoading(false);
    };

    loadBilling();
  }, []);

  useEffect(() => {
    const loadRevenueCat = async () => {
      if (!isRevenueCatEnabled()) {
        setRevenueCatMessage(getRevenueCatSetupMessage());
        setOfferingsLoading(false);
        return;
      }

      try {
        const currentUser = await getUser();
        const initResponse = await initializeRevenueCat(currentUser?.id ? String(currentUser.id) : null);

        if (!initResponse.success) {
          setRevenueCatMessage(initResponse.error || getRevenueCatSetupMessage());
          return;
        }

        setIsProActive(Boolean(initResponse.isProActive));

        const offerings = await getRevenueCatOfferings();
        const currentOffering = offerings?.current || null;
        const defaultPackage = currentOffering?.monthly || currentOffering?.availablePackages?.[0] || null;

        setOfferingPackage(defaultPackage);
        setRevenueCatMessage(defaultPackage ? null : 'Subscriptions are not available in this build yet. The App Store products still need to be attached to the active RevenueCat offering.');
      } catch (error) {
        setRevenueCatMessage(getRevenueCatDisplayMessage(error?.message));
      } finally {
        setOfferingsLoading(false);
      }
    };

    loadRevenueCat();
  }, []);

  const refreshCustomerInfo = async () => {
    const customerInfo = await getRevenueCatCustomerInfo();
    setIsProActive(isProEntitlementActive(customerInfo));
  };

  const handleWebUpgrade = () => {
    Linking.openURL('https://alihelp.tech/subscribe');
  };
    if (!offeringPackage) {
      Alert.alert('Subscription unavailable', revenueCatMessage || 'No subscription package is ready in this build yet.');
      return;
    }

    setPurchaseLoading(true);

    try {
      const result = await purchaseRevenueCatPackage(offeringPackage);
      const proActive = isProEntitlementActive(result?.customerInfo);
      setIsProActive(proActive);
      Alert.alert(
        proActive ? 'Subscription active' : 'Purchase complete',
        proActive
          ? 'Your Ali Pro subscription is active on this account.'
          : 'The purchase completed, but the pro entitlement is not active yet. Check the RevenueCat product and entitlement mapping.'
      );
    } catch (error) {
      if (!isRevenueCatUserCancelled(error)) {
        Alert.alert('Purchase failed', error?.message || 'Unable to complete the purchase right now.');
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Upgrade</Text>
      </View>

      <View style={styles.section}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heroEyebrow, { color: colors.accent }]}>Ali Pro</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {offeringPackage?.product?.priceString || '$9.99'} per month
          </Text>

          <Text style={[styles.helperText, { color: colors.mutedText }]}>
            Subscribe on alihelp.tech for instant access. Apple IAP available below for one-off credit purchases.
          </Text>

          {/* Web upgrade — primary CTA */}
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.text }]}
            onPress={handleWebUpgrade}
            activeOpacity={0.85}
          >
            <Text style={[styles.upgradeButtonText, { color: colors.surface }]}>
              Upgrade on alihelp.tech
            </Text>
          </TouchableOpacity>

          <Text style={[styles.manageLink, { color: colors.mutedText }]}>
            Manage your subscription at alihelp.tech
          </Text>

          <View style={styles.inlineBenefitsBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What Pro unlocks</Text>

            {[
              '100 credits per month, with unused credits rolling over.',
              '20 min Voice Mode, 50 min Reader, or 100 min Listen Mode — mix and match.',
            ].map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={[styles.bulletMark, { color: colors.text }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.mutedText }]}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.subscriptionDetails, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Subscription details</Text>
            <Text style={[styles.subscriptionDetail, { color: colors.mutedText }]}>
              Ali Pro · Monthly · {offeringPackage?.product?.priceString || '$9.99'}
            </Text>
            <Text style={[styles.subscriptionDetail, { color: colors.mutedText }]}>
              Auto-renewing. Cancel anytime from alihelp.tech.
            </Text>
            <View style={styles.legalLinks}>
              <Text
                style={[styles.legalLink, { color: colors.accent }]}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Privacy Policy
              </Text>
              <Text style={[styles.legalSeparator, { color: colors.mutedText }]}>·</Text>
              <Text
                style={[styles.legalLink, { color: colors.accent }]}
                onPress={() => navigation.navigate('TermsOfService')}
              >
                Terms of Use
              </Text>
              <Text style={[styles.legalSeparator, { color: colors.mutedText }]}>·</Text>
              <Text
                style={[styles.legalLink, { color: colors.accent }]}
                onPress={() => navigation.navigate('EULA')}
              >
                EULA
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Apple IAP — one-off credit purchase for compliance */}
      {offeringPackage ? (
        <View style={styles.section}>
          <View style={[styles.usageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.usageTitle, { color: colors.text }]}>Need more credits?</Text>
            <Text style={[styles.helperText, { color: colors.mutedText, marginBottom: 12 }]}>
              One-time credit purchase via App Store.
            </Text>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }, purchaseLoading && styles.buttonDisabled]}
              onPress={handleUpgradePress}
              disabled={purchaseLoading}
              activeOpacity={0.85}
            >
              <Text style={[styles.upgradeButtonText, { color: colors.text }]}>
                {purchaseLoading ? 'Processing...' : `Purchase credits — ${offeringPackage?.product?.priceString || '$9.99'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={[styles.usageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.usageTitle, { color: colors.text }]}>Credit rates</Text>
          <View style={styles.creditRow}>
            <Text style={[styles.creditMode, { color: colors.text }]}>Voice Mode</Text>
            <Text style={[styles.creditRate, { color: colors.accent }]}>5 credits/min</Text>
          </View>
          <View style={styles.creditRow}>
            <Text style={[styles.creditMode, { color: colors.text }]}>Reader — Natural Voice</Text>
            <Text style={[styles.creditRate, { color: colors.accent }]}>2 credits/min</Text>
          </View>
          <View style={styles.creditRow}>
            <Text style={[styles.creditMode, { color: colors.text }]}>Listen Mode</Text>
            <Text style={[styles.creditRate, { color: colors.accent }]}>1 credit/min</Text>
          </View>
          <View style={styles.creditRow}>
            <Text style={[styles.creditMode, { color: colors.text }]}>Reader — Basic</Text>
            <Text style={[styles.creditRate, { color: colors.mutedText }]}>Free</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.usageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.usageTitle, { color: colors.text }]}>Your credits</Text>
          <View style={styles.usageRow}>
            <View style={styles.usageItem}>
              <Text style={[styles.usageValue, { color: colors.accent }]}>
                {credits ? credits.creditBalance : '...'}
              </Text>
              <Text style={[styles.usageLabel, { color: colors.mutedText }]}>Available</Text>
            </View>
            <View style={[styles.usageDivider, { backgroundColor: colors.border }]} />
            <View style={styles.usageItem}>
              <Text style={[styles.usageValue, { color: colors.text }]}>
                {credits ? `${credits.freeCreditsGranted} free` : '...'}
              </Text>
              <Text style={[styles.usageLabel, { color: colors.mutedText }]}>Granted</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  contentContainer: {
    paddingBottom: 40
  },
  headerBar: {
    backgroundColor: '#fff',
    paddingHorizontal: designTokens.chrome.listHeaderHorizontalPadding,
    paddingTop: designTokens.chrome.listHeaderVerticalPadding,
    paddingBottom: designTokens.chrome.listHeaderVerticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  pageTitle: {
    fontSize: designTokens.typography.pageTitle,
    fontWeight: '700',
    color: '#212529'
  },
  section: {
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.md
  },
  usageCard: {
    borderWidth: 1,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.md
  },
  usageTitle: {
    fontSize: designTokens.typography.label,
    fontWeight: '700'
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0
  },
  usageItem: {
    flex: 1,
    alignItems: 'center'
  },
  usageValue: {
    fontSize: 28,
    fontWeight: '700'
  },
  usageLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4
  },
  usageDivider: {
    width: 1,
    height: 32
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 10
  },
  modeChip: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  modeValue: {
    fontSize: 24,
    fontWeight: '700'
  },
  modeHint: {
    fontSize: 11
  },
  creditTable: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8
  },
  creditRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  creditHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  creditCell: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600'
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.md
  },
  heroEyebrow: {
    fontSize: designTokens.typography.label,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700'
  },
  heroDescription: {
    fontSize: designTokens.typography.body,
    lineHeight: 21
  },
  inlineBenefitsBlock: {
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.xs
  },
  upgradeButton: {
    minHeight: 54,
    borderRadius: designTokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: designTokens.spacing.lg
  },
  buttonDisabled: {
    opacity: 0.55
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  helperText: {
    fontSize: designTokens.typography.bodySmall,
    lineHeight: 18
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start'
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: designTokens.typography.title,
    fontWeight: '600'
  },
  sectionDescription: {
    fontSize: designTokens.typography.body,
    lineHeight: 20
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: 14,
    gap: designTokens.spacing.xs
  },
  statusLabel: {
    fontSize: designTokens.typography.body,
    fontWeight: '600'
  },
  statusValue: {
    fontSize: 28,
    fontWeight: '700'
  },
  statusFootnote: {
    fontSize: designTokens.typography.bodySmall,
    lineHeight: 18
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: designTokens.spacing.sm
  },
  bulletMark: {
    fontSize: 18,
    lineHeight: 20
  },
  bulletText: {
    flex: 1,
    fontSize: designTokens.typography.body,
    lineHeight: 20
  },
  subscriptionDetails: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 6
  },
  subscriptionDetail: {
    fontSize: 13,
    lineHeight: 19
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8
  },
  legalLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  legalSeparator: {
    fontSize: 14
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  creditMode: {
    fontSize: 14,
    fontWeight: '500'
  },
  creditRate: {
    fontSize: 14,
    fontWeight: '700'
  }
});

export default UpgradeScreen;