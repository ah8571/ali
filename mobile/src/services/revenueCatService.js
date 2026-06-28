import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || '';
const PRO_ENTITLEMENT_ID = 'pro';

let isConfigured = false;
let currentAppUserId = null;

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

export const getRevenueCatSetupMessage = () => {
  if (Platform.OS === 'ios') {
    return 'Set EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY in the app environment before testing purchases.';
  }

  if (Platform.OS === 'android') {
    return 'Set EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY in the app environment before testing purchases.';
  }

  return 'RevenueCat is only available on iOS and Android builds.';
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
    return;
  }

  if (appUserId && currentAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    currentAppUserId = appUserId;
    return;
  }

  if (!appUserId && currentAppUserId) {
    await Purchases.logOut();
    currentAppUserId = null;
  }
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
      isProActive: Boolean(customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID])
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Unable to initialize RevenueCat'
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
      isProActive: Boolean(customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID])
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Unable to sync RevenueCat user'
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
  return Purchases.purchasePackage(selectedPackage);
};

export const restoreRevenueCatPurchases = async () => {
  await ensureConfigured(currentAppUserId);
  return Purchases.restorePurchases();
};

export const isProEntitlementActive = (customerInfo) => {
  return Boolean(customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID]);
};

export const isRevenueCatUserCancelled = (error) => {
  return Boolean(
    error?.userCancelled ||
    error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
};
