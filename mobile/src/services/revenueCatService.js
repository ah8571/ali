import { Platform } from 'react-native';
import appsFlyer from 'react-native-appsflyer';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || '';
const PRO_ENTITLEMENT_ID = 'pro';
const PRO_PRODUCT_IDS = ['IAP_credits', 'iap_credits'];

let isConfigured = false;
let currentAppUserId = null;

const getAppsFlyerUID = () => new Promise((resolve, reject) => {
  appsFlyer.getAppsFlyerUID((error, uid) => {
    if (error) {
      reject(error);
      return;
    }

    if (!uid) {
      reject(new Error('AppsFlyer UID is unavailable.'));
      return;
    }

    resolve(uid);
  });
});

const mapRevenueCatErrorMessage = (message) => {
  const normalizedMessage = String(message || '').trim();
  const lowerMessage = normalizedMessage.toLowerCase();

  if (lowerMessage.includes('there is an issue with your configuration')
    || lowerMessage.includes('there are no app store products')
    || lowerMessage.includes('why-are-offerings-empty')) {
    return [
      'RevenueCat is connected, but the store configuration is still incomplete.',
      normalizedMessage || 'RevenueCat did not return any App Store products for the active offering.'
    ].join(' ');
  }

  return normalizedMessage || 'Unable to load subscription pricing right now.';
};

const getApiKey = () => {
  if (Platform.OS === 'ios') {
    return IOS_API_KEY;
  }

  if (Platform.OS === 'android') {
    return ANDROID_API_KEY;
  }

  return '';
};

export const isRevenueCatEnabled = () => {
  return Boolean(getApiKey());
};

const hasActiveProEntitlement = (customerInfo) => {
  return Boolean(customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID]);
};

const hasActiveProProduct = (customerInfo) => {
  const activeSubscriptions = Array.isArray(customerInfo?.activeSubscriptions)
    ? customerInfo.activeSubscriptions
    : [];

  return PRO_PRODUCT_IDS.some((productId) => activeSubscriptions.includes(productId));
};

const hasActiveProAccess = (customerInfo) => {
  return hasActiveProEntitlement(customerInfo) || hasActiveProProduct(customerInfo);
};

export const getRevenueCatSetupMessage = () => {
  if (Platform.OS === 'ios') {
    return 'Set EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY in the app environment before testing purchases.';
  }

  if (Platform.OS === 'android') {
    return 'Set EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY in the app environment before testing purchases.';
  }

  return 'RevenueCat is only available on iOS and Android builds.';
};

export const getRevenueCatDisplayMessage = (message) => mapRevenueCatErrorMessage(message);

export const syncRevenueCatAttribution = async () => {
  if (!isConfigured) {
    return false;
  }

  // collectDeviceIdentifiers sets $gpsAdId which RevenueCat auto-collects —
  // it may fail with "cannot be modified"; treat as non-fatal.
  try {
    await Purchases.collectDeviceIdentifiers();
  } catch {
    // Expected: RevenueCat already owns these identifiers.
  }

  // setAppsflyerID sets $appsflyerId which can only be set once per user —
  // it may fail on subsequent calls; treat as non-fatal.
  try {
    const appsFlyerUID = await getAppsFlyerUID();
    await Purchases.setAppsflyerID(appsFlyerUID);
  } catch {
    // Expected: AppsFlyer may not be initialized, or the attribute was already set.
  }

  return true;
};

const ensureConfigured = async (appUserId = null) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(getRevenueCatSetupMessage());
  }

  if (!isConfigured) {
    await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({
      apiKey,
      appUserID: appUserId || undefined
    });
    isConfigured = true;
    currentAppUserId = appUserId || null;
  } else if (appUserId && currentAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    currentAppUserId = appUserId;
  } else if (!appUserId && currentAppUserId) {
    // Only log out when we're transitioning from an identified user to anonymous.
    // If the RevenueCat instance is still anonymous (e.g. after a cold start),
    // calling logOut is a no-op but produces a noisy warning.
    try {
      await Purchases.logOut();
    } catch {
      // logOut may warn when the current user is already anonymous.
    }
    currentAppUserId = null;
  }

  // Best-effort attribution sync — individual calls handle their own errors.
  await syncRevenueCatAttribution();
};

export const initializeRevenueCat = async (appUserId = null) => {
  if (!isRevenueCatEnabled()) {
    return { success: false, error: getRevenueCatSetupMessage() };
  }

  try {
    await ensureConfigured(appUserId);
    const customerInfo = await Purchases.getCustomerInfo();

    return {
      success: true,
      customerInfo,
      isProActive: hasActiveProAccess(customerInfo)
    };
  } catch (error) {
    return {
      success: false,
      error: mapRevenueCatErrorMessage(error?.message || 'Unable to initialize RevenueCat')
    };
  }
};

export const syncRevenueCatUser = async (appUserId = null) => {
  try {
    await ensureConfigured(appUserId);
    const customerInfo = await Purchases.getCustomerInfo();

    return {
      success: true,
      customerInfo,
      isProActive: hasActiveProAccess(customerInfo)
    };
  } catch (error) {
    return {
      success: false,
      error: mapRevenueCatErrorMessage(error?.message || 'Unable to sync RevenueCat user')
    };
  }
};

export const getRevenueCatOfferings = async () => {
  await ensureConfigured(currentAppUserId);
  return Purchases.getOfferings();
};

export const getRevenueCatCustomerInfo = async () => {
  await ensureConfigured(currentAppUserId);
  return Purchases.getCustomerInfo();
};

export const purchaseRevenueCatPackage = async (selectedPackage) => {
  await ensureConfigured(currentAppUserId);

  try {
    const purchaseResult = await Purchases.purchasePackage(selectedPackage);

    // Best-effort: report subscription event to AppsFlyer for SKAN mapping
    try {
      const productId = selectedPackage?.product?.productIdentifier || selectedPackage?.identifier || null;

      if (appsFlyer && typeof appsFlyer.logEvent === 'function') {
        appsFlyer.logEvent('subscribe', { productId: productId || 'unknown' }, (res) => {}, (err) => {});
      }
    } catch (e) {
      console.warn('AppsFlyer subscription event failed', e?.message || e);
    }

    return purchaseResult;
  } catch (error) {
    throw error;
  }
};

export const restoreRevenueCatPurchases = async () => {
  await ensureConfigured(currentAppUserId);
  return Purchases.restorePurchases();
};

export const isProEntitlementActive = (customerInfo) => {
  return hasActiveProAccess(customerInfo);
};

export const isRevenueCatUserCancelled = (error) => {
  return Boolean(
    error?.userCancelled ||
    error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
};
