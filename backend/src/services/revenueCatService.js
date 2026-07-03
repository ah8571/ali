const REVENUECAT_V1_BASE_URL = 'https://api.revenuecat.com/v1';
const REVENUECAT_V2_BASE_URL = 'https://api.revenuecat.com/v2';
const PRO_ENTITLEMENT_ID = 'pro';
const PRO_PRODUCT_IDS = String(process.env.REVENUECAT_PRO_PRODUCT_IDS || 'emmaline_pro_monthly')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const REQUEST_TIMEOUT_MS = Number(process.env.REVENUECAT_REQUEST_TIMEOUT_MS || 4000);
const CACHE_TTL_MS = Number(process.env.REVENUECAT_CACHE_TTL_MS || 60000);

const entitlementStatusCache = new Map();

const getRevenueCatProjectId = () => process.env.REVENUECAT_PROJECT_ID || '';

const getRevenueCatSecretApiKey = () => {
  return process.env.REVENUECAT_SECRET_API_KEY || process.env.REVENUECAT_API_V2_SECRET_KEY || '';
};

const getRevenueCatLegacyApiKey = () => {
  return process.env.REVENUECAT_API_KEY || process.env.revenuecat_api_key || '';
};

const createRevenueCatStatus = (overrides = {}) => {
  return {
    configured: false,
    isProActive: false,
    status: 'not_configured',
    source: null,
    expiresAt: null,
    error: null,
    checkedAt: new Date().toISOString(),
    ...overrides
  };
};

const isRevenueCatServerConfigured = () => {
  return Boolean(
    (getRevenueCatSecretApiKey() && getRevenueCatProjectId()) ||
    getRevenueCatLegacyApiKey()
  );
};

const getCachedStatus = (appUserId, { allowStale = false } = {}) => {
  const cacheEntry = entitlementStatusCache.get(appUserId);

  if (!cacheEntry) {
    return null;
  }

  const isFresh = Date.now() - cacheEntry.cachedAt <= CACHE_TTL_MS;

  if (!allowStale && !isFresh) {
    return null;
  }

  return cacheEntry.status;
};

const setCachedStatus = (appUserId, status) => {
  entitlementStatusCache.set(appUserId, {
    cachedAt: Date.now(),
    status
  });

  return status;
};

const fetchRevenueCatJson = async (url, apiKey) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (response.status === 404) {
    return { notFound: true, data: null };
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || payload?.error || `RevenueCat request failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    notFound: false,
    data: payload
  };
};

const getRevenueCatStatusViaV2 = async (appUserId) => {
  const apiKey = getRevenueCatSecretApiKey();
  const projectId = getRevenueCatProjectId();

  if (!apiKey || !projectId) {
    return null;
  }

  const url = `${REVENUECAT_V2_BASE_URL}/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(appUserId)}/active_entitlements`;
  const { notFound, data } = await fetchRevenueCatJson(url, apiKey);

  if (notFound) {
    return createRevenueCatStatus({
      configured: true,
      source: 'api_v2',
      status: 'inactive'
    });
  }

  const entitlements = Array.isArray(data?.items) ? data.items : [];
  const proEntitlement = entitlements.find((item) => item?.lookup_key === PRO_ENTITLEMENT_ID);

  return createRevenueCatStatus({
    configured: true,
    source: 'api_v2',
    status: proEntitlement ? 'active' : 'inactive',
    isProActive: Boolean(proEntitlement)
  });
};

const getRevenueCatStatusViaV1 = async (appUserId) => {
  const apiKey = getRevenueCatLegacyApiKey();

  if (!apiKey) {
    return null;
  }

  const url = `${REVENUECAT_V1_BASE_URL}/subscribers/${encodeURIComponent(appUserId)}`;
  const { notFound, data } = await fetchRevenueCatJson(url, apiKey);

  if (notFound) {
    return createRevenueCatStatus({
      configured: true,
      source: 'api_v1',
      status: 'inactive'
    });
  }

  const proEntitlement = data?.subscriber?.entitlements?.[PRO_ENTITLEMENT_ID] || null;
  const expiresAt = proEntitlement?.expires_date || null;
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : null;
  const isActiveEntitlement = Boolean(
    proEntitlement && (expiresAtMs === null || Number.isNaN(expiresAtMs) || expiresAtMs > Date.now())
  );
  const subscriptions = data?.subscriber?.subscriptions || {};
  const activeSubscriptionProductId = PRO_PRODUCT_IDS.find((productId) => {
    const subscription = subscriptions?.[productId];
    const subscriptionExpiresAt = subscription?.expires_date || null;
    const subscriptionExpiresAtMs = subscriptionExpiresAt ? Date.parse(subscriptionExpiresAt) : null;

    return Boolean(
      subscription && (
        subscriptionExpiresAtMs === null ||
        Number.isNaN(subscriptionExpiresAtMs) ||
        subscriptionExpiresAtMs > Date.now()
      )
    );
  }) || null;
  const isProActive = isActiveEntitlement || Boolean(activeSubscriptionProductId);

  return createRevenueCatStatus({
    configured: true,
    source: 'api_v1',
    status: isProActive ? 'active' : 'inactive',
    isProActive,
    expiresAt: expiresAt || subscriptions?.[activeSubscriptionProductId]?.expires_date || null
  });
};

export const getRevenueCatProStatus = async (appUserId) => {
  if (!appUserId) {
    return createRevenueCatStatus();
  }

  const freshCachedStatus = getCachedStatus(appUserId);

  if (freshCachedStatus) {
    return freshCachedStatus;
  }

  if (!isRevenueCatServerConfigured()) {
    return createRevenueCatStatus();
  }

  try {
    const v2Status = await getRevenueCatStatusViaV2(appUserId);

    if (v2Status?.isProActive) {
      return setCachedStatus(appUserId, v2Status);
    }

    const v1Status = await getRevenueCatStatusViaV1(appUserId);

    if (v1Status?.isProActive) {
      return setCachedStatus(appUserId, v1Status);
    }

    if (v2Status) {
      return setCachedStatus(appUserId, v2Status);
    }

    if (v1Status) {
      return setCachedStatus(appUserId, v1Status);
    }

    return createRevenueCatStatus();
  } catch (error) {
    console.error('RevenueCat entitlement lookup failed:', error.message);

    const staleCachedStatus = getCachedStatus(appUserId, { allowStale: true });

    if (staleCachedStatus) {
      return {
        ...staleCachedStatus,
        status: staleCachedStatus.isProActive ? 'active_stale' : staleCachedStatus.status,
        error: error.message,
        checkedAt: new Date().toISOString()
      };
    }

    return createRevenueCatStatus({
      configured: true,
      status: 'lookup_failed',
      error: error.message
    });
  }
};

export default {
  getRevenueCatProStatus
};