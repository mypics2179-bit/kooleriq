import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AuditLogEntry,
  ChatMessageItem,
  CoolerDoor,
  DistributorOrderRecord,
  ImageAsset,
  NotificationItem,
  OnboardingState,
  SkuItem,
  StoreProfile,
  SubscriptionState,
} from '../types/kooleriq';
import { db, handleFirestoreError, OperationType } from './firebase';

// Validation constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const FIRESTORE_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  MAX_ID_LEN: 128,
  MAX_DISPLAY_NAME_LEN: 100,
  MAX_EMAIL_LEN: 254,
  MAX_LAYOUT_TEMPLATE_LEN: 120,
  MAX_STORE_NAME_LEN: 120,
  MAX_STORE_CODE_LEN: 40,
  MAX_ADDRESS_LEN: 240,
  MAX_ROUTE_ID_LEN: 60,
  MAX_CARRIED_SKUS: 300,
  MAX_DOORS: 24,
  MAX_INSIGHTS: 100,
  MAX_AUDITS: 100,
  MAX_ORDER_LINES: 120,
  MAX_AUDIT_DETAILS_LEN: 600,
  MAX_NOTIF_MSG_LEN: 500,
  MAX_MEDIA_URL_LEN: 120000,
  MAX_CHAT_CONTENT_LEN: 8000,
} as const;

export function sanitizeDocId(raw: string, fallbackPrefix = 'doc'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, FIRESTORE_CONSTRAINTS.MAX_ID_LEN);
  if (cleaned && FIRESTORE_CONSTRAINTS.ID_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

function clampStr(value: unknown, maxLen: number, fallback = ''): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const str = raw.length > 0 ? raw : fallback;
  return str.slice(0, maxLen);
}

function stripUndefinedDeep<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (val && typeof val === 'object' && !(val instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return val;
}

interface SerializedShelfRow {
  shelfIndex: number;
  facings: CoolerDoor['shelves'][number];
}

export function sanitizeDoorForFirestore(door: CoolerDoor): Record<string, unknown> {
  const safePhoto =
    door.photoUrl && !(door.photoUrl.startsWith('data:') && door.photoUrl.length > 512)
      ? door.photoUrl.slice(0, 512)
      : undefined;

  const serializedShelves: SerializedShelfRow[] = (door.shelves || []).map((shelf, shelfIdx) => ({
    shelfIndex: shelfIdx,
    facings: (shelf || []).map((slot, facingIdx) => ({
      ...slot,
      shelfIndex: Number.isFinite(slot.shelfIndex) ? slot.shelfIndex : shelfIdx,
      facingIndex: Number.isFinite(slot.facingIndex) ? slot.facingIndex : facingIdx,
      currentDepth: Number.isFinite(slot.currentDepth) ? slot.currentDepth : 0,
      maxDepth: Number.isFinite(slot.maxDepth) ? slot.maxDepth : 6,
      aiRecommendation: slot.aiRecommendation ? { ...slot.aiRecommendation } : undefined,
    })),
  }));

  return stripUndefinedDeep({
    ...door,
    id: sanitizeDocId(door.id, 'door'),
    label: clampStr(door.label, 120, 'Cooler Door'),
    photoUrl: safePhoto,
    shelves: serializedShelves,
  });
}

export function deserializeDoorFromFirestore(rawDoor: unknown): CoolerDoor {
  const d = (rawDoor && typeof rawDoor === 'object' ? rawDoor : {}) as Record<string, unknown>;
  const rawShelves = Array.isArray(d.shelves) ? d.shelves : [];

  const shelves: CoolerDoor['shelves'] = rawShelves.map((row) => {
    if (Array.isArray(row)) {
      return row;
    }
    if (row && typeof row === 'object' && Array.isArray((row as SerializedShelfRow).facings)) {
      return (row as SerializedShelfRow).facings;
    }
    return [];
  });

  return {
    id: String(d.id || 'door-1'),
    number: String(d.number || '01'),
    label: String(d.label || 'Cooler Door'),
    category: String(d.category || 'Beverages'),
    hardwareType: (d.hardwareType as CoolerDoor['hardwareType']) || 'standard-glass',
    facingsPerShelf: Number(d.facingsPerShelf) || (shelves[0]?.length ?? 6),
    defaultMaxDepth: Number(d.defaultMaxDepth) || 6,
    tempF: Number(d.tempF) || 36,
    targetTempF: Number(d.targetTempF) || 36,
    humidityPct: Number(d.humidityPct) || 45,
    doorOpensToday: Number(d.doorOpensToday) || 0,
    lastAuditAt: String(d.lastAuditAt || 'Just now'),
    compressorState: (d.compressorState as CoolerDoor['compressorState']) || 'nominal',
    shelves,
    ...(typeof d.photoUrl === 'string' ? { photoUrl: d.photoUrl } : {}),
  };
}

export function buildStoreDocPayload(
  ownerId: string,
  store: StoreProfile,
  existingCreatedAt?: unknown
): Record<string, unknown> {
  const storeId = sanitizeDocId(store.id, 'store');
  const payload: Record<string, unknown> = {
    ownerId,
    storeId,
    layoutTemplate: clampStr(
      store.layoutTemplate,
      FIRESTORE_CONSTRAINTS.MAX_LAYOUT_TEMPLATE_LEN,
      'Custom Cooler'
    ),
    storeName: clampStr(
      store.settings.storeName,
      FIRESTORE_CONSTRAINTS.MAX_STORE_NAME_LEN,
      'KoolerIQ Store'
    ),
    storeCode: clampStr(store.settings.storeCode, FIRESTORE_CONSTRAINTS.MAX_STORE_CODE_LEN, 'KQ-01'),
    address: clampStr(store.settings.address, FIRESTORE_CONSTRAINTS.MAX_ADDRESS_LEN, ''),
    routeId: clampStr(store.settings.routeId, FIRESTORE_CONSTRAINTS.MAX_ROUTE_ID_LEN, 'R-100'),
    tempUnit: store.settings.tempUnit === 'C' ? 'C' : 'F',
    settings: stripUndefinedDeep({ ...store.settings }),
    carriedSkuIds: store.carriedSkuIds
      .slice(0, FIRESTORE_CONSTRAINTS.MAX_CARRIED_SKUS)
      .map((id) => sanitizeDocId(id, 'sku')),
    doors: store.doors.slice(0, FIRESTORE_CONSTRAINTS.MAX_DOORS).map(sanitizeDoorForFirestore),
    insights: stripUndefinedDeep(store.insights.slice(0, FIRESTORE_CONSTRAINTS.MAX_INSIGHTS)),
    audits: stripUndefinedDeep(store.audits.slice(0, FIRESTORE_CONSTRAINTS.MAX_AUDITS)),
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return payload;
}

export async function compressAssetUrlForFirestore(url: string): Promise<string> {
  if (!url.startsWith('data:image/') || url.length <= FIRESTORE_CONSTRAINTS.MAX_MEDIA_URL_LEN) {
    return url.slice(0, FIRESTORE_CONSTRAINTS.MAX_MEDIA_URL_LEN);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 480;
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('/src/assets/images/kooleriq_brand_logo_1795456908836.jpg');
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compact = canvas.toDataURL('image/jpeg', 0.68);
      resolve(
        compact.length <= FIRESTORE_CONSTRAINTS.MAX_MEDIA_URL_LEN
          ? compact
          : '/src/assets/images/kooleriq_brand_logo_1795456908836.jpg'
      );
    };
    img.onerror = () => resolve('/src/assets/images/kooleriq_brand_logo_1795456908836.jpg');
    img.src = url;
  });
}

export interface WorkspaceCreatedAtCache {
  userCreatedAt?: unknown;
  privateCreatedAt?: unknown;
  stores: Record<string, unknown>;
  customSkus: Record<string, unknown>;
  orders: Record<string, unknown>;
  notifications: Record<string, unknown>;
}

export async function ensureUserWorkspaceBootstrapped(
  user: User,
  defaults: {
    stores: StoreProfile[];
    activeStoreId: string;
    onboarding: OnboardingState;
    subscription: SubscriptionState;
    initialAuditLog: AuditLogEntry[];
    initialNotifications: NotificationItem[];
  },
  cache: WorkspaceCreatedAtCache
): Promise<boolean> {
  const userPath = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      cache.userCreatedAt = data.createdAt;
      const privSnap = await getDoc(doc(db, 'users', user.uid, 'private', 'info'));
      if (privSnap.exists()) {
        cache.privateCreatedAt = privSnap.data().createdAt;
      } else {
        await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
          ownerId: user.uid,
          email: clampStr(user.email, FIRESTORE_CONSTRAINTS.MAX_EMAIL_LEN, 'operator@kooleriq.com'),
          displayName: clampStr(
            user.displayName || user.email?.split('@')[0],
            FIRESTORE_CONSTRAINTS.MAX_DISPLAY_NAME_LEN,
            'KoolerIQ Operator'
          ),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return false;
    }

    const batch = writeBatch(db);
    const displayName = clampStr(
      user.displayName || user.email?.split('@')[0],
      FIRESTORE_CONSTRAINTS.MAX_DISPLAY_NAME_LEN,
      'KoolerIQ Operator'
    );
    const safeActiveStoreId = sanitizeDocId(defaults.activeStoreId, 'store');

    batch.set(userRef, {
      ownerId: user.uid,
      displayName,
      activeStoreId: safeActiveStoreId,
      operatorRole: defaults.onboarding.operatorRole,
      onboardingCompleted: Boolean(defaults.onboarding.completed),
      dismissedChecklist: Boolean(defaults.onboarding.dismissedChecklist),
      completedSteps: defaults.onboarding.completedSteps.slice(0, 20).map((s) => clampStr(s, 60)),
      planTier: defaults.subscription.planTier,
      billingCycle: defaults.subscription.billingCycle,
      doorQuota: Math.max(1, Math.min(500, Number(defaults.subscription.doorQuota) || 2)),
      storeCount: Math.max(1, Math.min(200, Number(defaults.subscription.storeCount) || 1)),
      googlePlayLinked: Boolean(defaults.subscription.googlePlayLinked),
      subscriptionStatus: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'users', user.uid, 'private', 'info'), {
      ownerId: user.uid,
      email: clampStr(user.email, FIRESTORE_CONSTRAINTS.MAX_EMAIL_LEN, 'operator@kooleriq.com'),
      displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const store of defaults.stores) {
      const storeId = sanitizeDocId(store.id, 'store');
      batch.set(
        doc(db, 'users', user.uid, 'stores', storeId),
        buildStoreDocPayload(user.uid, store)
      );
    }

    for (const entry of defaults.initialAuditLog.slice(0, 10)) {
      const entryId = sanitizeDocId(entry.id, 'alog');
      batch.set(doc(db, 'users', user.uid, 'auditLogs', entryId), {
        ownerId: user.uid,
        category: entry.category,
        severity: entry.severity,
        actor: clampStr(entry.actor, 120, displayName),
        storeName: clampStr(entry.storeName, 120, 'KoolerIQ Store'),
        ...(entry.doorLabel ? { doorLabel: clampStr(entry.doorLabel, 120) } : {}),
        action: clampStr(entry.action, 160, 'System Event'),
        details: clampStr(entry.details, FIRESTORE_CONSTRAINTS.MAX_AUDIT_DETAILS_LEN, 'Initialized'),
        timestampIso: clampStr(entry.timestampIso, 64, new Date().toISOString()),
        createdAt: serverTimestamp(),
      });
    }

    for (const notif of defaults.initialNotifications.slice(0, 10)) {
      const notifId = sanitizeDocId(notif.id, 'notif');
      batch.set(doc(db, 'users', user.uid, 'notifications', notifId), {
        ownerId: user.uid,
        category: notif.category,
        severity: notif.severity,
        title: clampStr(notif.title, 160, 'Alert'),
        message: clampStr(notif.message, FIRESTORE_CONSTRAINTS.MAX_NOTIF_MSG_LEN, 'Store alert'),
        read: Boolean(notif.read),
        ...(notif.doorId ? { doorId: sanitizeDocId(notif.doorId, 'door') } : {}),
        ...(notif.targetTab ? { targetTab: notif.targetTab } : {}),
        timestampIso: clampStr(notif.timestampIso, 64, new Date().toISOString()),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserPreferencesInFirestore(
  userId: string,
  activeStoreId: string,
  onboarding: OnboardingState
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      activeStoreId: sanitizeDocId(activeStoreId, 'store'),
      operatorRole: onboarding.operatorRole,
      onboardingCompleted: Boolean(onboarding.completed),
      dismissedChecklist: Boolean(onboarding.dismissedChecklist),
      completedSteps: onboarding.completedSteps.slice(0, 20).map((s) => clampStr(s, 60)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserSubscriptionInFirestore(
  userId: string,
  subscription: SubscriptionState
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      planTier: subscription.planTier,
      billingCycle: subscription.billingCycle,
      doorQuota: Math.max(1, Math.min(500, Number(subscription.doorQuota) || 2)),
      storeCount: Math.max(1, Math.min(200, Number(subscription.storeCount) || 1)),
      googlePlayLinked: Boolean(subscription.googlePlayLinked),
      subscriptionStatus: 'active',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertStoreInFirestore(
  userId: string,
  store: StoreProfile,
  existingCreatedAt?: unknown
): Promise<void> {
  const storeId = sanitizeDocId(store.id, 'store');
  const path = `users/${userId}/stores/${storeId}`;
  try {
    const ref = doc(db, 'users', userId, 'stores', storeId);
    const payload = buildStoreDocPayload(userId, store, existingCreatedAt);
    if (existingCreatedAt) {
      const { ownerId: _o, storeId: _s, createdAt: _c, ...updateFields } = payload;
      await updateDoc(ref, updateFields);
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertCustomSkuInFirestore(
  userId: string,
  sku: SkuItem,
  existingCreatedAt?: unknown
): Promise<void> {
  const skuId = sanitizeDocId(sku.id, 'sku');
  const path = `users/${userId}/customSkus/${skuId}`;
  try {
    const ref = doc(db, 'users', userId, 'customSkus', skuId);
    const fields: Record<string, unknown> = {
      skuCode: clampStr(sku.skuCode, 64, skuId.toUpperCase()),
      name: clampStr(sku.name, 160, 'Custom Beverage'),
      shortName: clampStr(sku.shortName, 80, sku.name.slice(0, 32)),
      brand: clampStr(sku.brand, 40, 'custom'),
      brandLabel: clampStr(sku.brandLabel, 80, 'House Brand'),
      brandColor: clampStr(sku.brandColor, 24, '#0284c7'),
      size: clampStr(sku.size, 40, '16 oz'),
      containerType: sku.containerType || 'can',
      price: Math.max(0, Math.min(500, Number(sku.price) || 0)),
      weeklyVelocity: Math.max(0, Math.min(100000, Number(sku.weeklyVelocity) || 0)),
      marginPct: Math.max(0, Math.min(100, Number(sku.marginPct) || 0)),
      backroomQty: Math.max(0, Math.min(50000, Number(sku.backroomQty) || 0)),
      parLevel: Math.max(0, Math.min(50000, Number(sku.parLevel) || 0)),
      primaryColor: clampStr(sku.primaryColor, 24, '#0284c7'),
      secondaryColor: clampStr(sku.secondaryColor, 24, '#0ea5e9'),
      capColor: clampStr(sku.capColor, 24, '#e2e8f0'),
      ...(sku.upc ? { upc: clampStr(sku.upc, 64) } : {}),
      ...(sku.distributor ? { distributor: clampStr(sku.distributor, 120) } : {}),
      ...(sku.category ? { category: clampStr(sku.category, 80) } : {}),
      ...(sku.unitsPerCase ? { unitsPerCase: Math.max(1, Math.min(200, Math.round(sku.unitsPerCase))) } : {}),
      ...(typeof sku.netCaseCost === 'number'
        ? { netCaseCost: Math.max(0, Math.min(5000, sku.netCaseCost)) }
        : {}),
      updatedAt: serverTimestamp(),
    };

    if (existingCreatedAt) {
      await updateDoc(ref, fields);
    } else {
      await setDoc(ref, {
        ownerId: userId,
        skuId,
        ...fields,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createOrderInFirestore(
  userId: string,
  order: DistributorOrderRecord
): Promise<void> {
  const orderId = sanitizeDocId(order.id, 'ord');
  const path = `users/${userId}/orders/${orderId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'orders', orderId), {
      ownerId: userId,
      poNumber: clampStr(order.poNumber, 64, 'PO-100'),
      storeName: clampStr(order.storeName, 120, 'KoolerIQ Store'),
      distributorSummary: clampStr(order.distributorSummary, 160, 'Distributor Order'),
      totalCases: Math.max(1, Math.min(5000, Math.round(order.totalCases) || 1)),
      totalUnits: Math.max(1, Math.min(100000, Math.round(order.totalUnits) || 1)),
      totalWholesaleCost: Math.max(0, Math.min(500000, Number(order.totalWholesaleCost) || 0)),
      status: order.status === 'received' ? 'received' : 'submitted',
      lines: stripUndefinedDeep(order.lines.slice(0, FIRESTORE_CONSTRAINTS.MAX_ORDER_LINES)),
      createdAtIso: clampStr(order.createdAtIso, 64, new Date().toISOString()),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function appendAuditLogToFirestore(
  userId: string,
  entry: AuditLogEntry
): Promise<void> {
  const entryId = sanitizeDocId(entry.id, 'alog');
  const path = `users/${userId}/auditLogs/${entryId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'auditLogs', entryId), {
      ownerId: userId,
      category: entry.category,
      severity: entry.severity,
      actor: clampStr(entry.actor, 120, 'Store Operator'),
      storeName: clampStr(entry.storeName, 120, 'KoolerIQ Store'),
      ...(entry.doorLabel ? { doorLabel: clampStr(entry.doorLabel, 120) } : {}),
      action: clampStr(entry.action, 160, 'Store Action'),
      details: clampStr(entry.details, FIRESTORE_CONSTRAINTS.MAX_AUDIT_DETAILS_LEN, 'Event recorded'),
      timestampIso: clampStr(entry.timestampIso, 64, new Date().toISOString()),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createNotificationInFirestore(
  userId: string,
  item: NotificationItem
): Promise<void> {
  const notifId = sanitizeDocId(item.id, 'notif');
  const path = `users/${userId}/notifications/${notifId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'notifications', notifId), {
      ownerId: userId,
      category: item.category,
      severity: item.severity,
      title: clampStr(item.title, 160, 'Alert'),
      message: clampStr(item.message, FIRESTORE_CONSTRAINTS.MAX_NOTIF_MSG_LEN, 'Store alert'),
      read: Boolean(item.read),
      ...(item.doorId ? { doorId: sanitizeDocId(item.doorId, 'door') } : {}),
      ...(item.targetTab ? { targetTab: item.targetTab } : {}),
      timestampIso: clampStr(item.timestampIso, 64, new Date().toISOString()),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationReadInFirestore(
  userId: string,
  notifId: string
): Promise<void> {
  const safeId = sanitizeDocId(notifId, 'notif');
  const path = `users/${userId}/notifications/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'notifications', safeId), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveMediaAssetToFirestore(
  userId: string,
  asset: ImageAsset
): Promise<void> {
  const assetId = sanitizeDocId(asset.id, 'asset');
  const path = `users/${userId}/mediaAssets/${assetId}`;
  try {
    const safeUrl = await compressAssetUrlForFirestore(asset.url);
    await setDoc(doc(db, 'users', userId, 'mediaAssets', assetId), {
      ownerId: userId,
      title: clampStr(asset.title, 160, 'Cooler Snapshot'),
      category: asset.category,
      url: safeUrl,
      ...(asset.storeName ? { storeName: clampStr(asset.storeName, 120) } : {}),
      ...(asset.doorId ? { doorId: sanitizeDocId(asset.doorId, 'door') } : {}),
      ...(asset.doorLabel ? { doorLabel: clampStr(asset.doorLabel, 120) } : {}),
      ...(asset.skuId ? { skuId: sanitizeDocId(asset.skuId, 'sku') } : {}),
      tags: (asset.tags || []).slice(0, 16).map((t) => clampStr(t, 40)),
      builtIn: Boolean(asset.builtIn),
      createdAtIso: clampStr(asset.createdAtIso, 64, new Date().toISOString()),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteMediaAssetInFirestore(userId: string, assetId: string): Promise<void> {
  const safeId = sanitizeDocId(assetId, 'asset');
  const path = `users/${userId}/mediaAssets/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'mediaAssets', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function appendChatMessageToFirestore(
  userId: string,
  msg: ChatMessageItem
): Promise<void> {
  const msgId = sanitizeDocId(msg.id, 'msg');
  const path = `users/${userId}/chats/${msgId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'chats', msgId), {
      ownerId: userId,
      role: msg.role,
      modelUsed: clampStr(msg.modelUsed, 80, 'gemini-4-hydrogen'),
      content: clampStr(msg.content, FIRESTORE_CONSTRAINTS.MAX_CHAT_CONTENT_LEN, ''),
      ...(msg.sources && msg.sources.length > 0
        ? { sources: stripUndefinedDeep(msg.sources.slice(0, 20)) }
        : {}),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clearChatMessagesInFirestore(
  userId: string,
  messageIds: string[]
): Promise<void> {
  const path = `users/${userId}/chats`;
  try {
    const batch = writeBatch(db);
    messageIds.slice(0, 100).forEach((id) => {
      batch.delete(doc(db, 'users', userId, 'chats', sanitizeDocId(id, 'msg')));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAuditLogsInFirestore(
  userId: string,
  entryIds: string[]
): Promise<void> {
  if (entryIds.length === 0) return;
  const path = `users/${userId}/auditLogs`;
  try {
    const batch = writeBatch(db);
    entryIds.slice(0, 150).forEach((id) => {
      batch.delete(doc(db, 'users', userId, 'auditLogs', sanitizeDocId(id, 'alog')));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function markAllNotificationsReadInFirestore(
  userId: string,
  notifIds: string[]
): Promise<void> {
  if (notifIds.length === 0) return;
  const path = `users/${userId}/notifications`;
  try {
    const batch = writeBatch(db);
    notifIds.slice(0, 60).forEach((id) => {
      batch.update(doc(db, 'users', userId, 'notifications', sanitizeDocId(id, 'notif')), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function clearNotificationsInFirestore(
  userId: string,
  notifIds: string[]
): Promise<void> {
  if (notifIds.length === 0) return;
  const path = `users/${userId}/notifications`;
  try {
    const batch = writeBatch(db);
    notifIds.slice(0, 60).forEach((id) => {
      batch.delete(doc(db, 'users', userId, 'notifications', sanitizeDocId(id, 'notif')));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserWorkspace(
  userId: string,
  cache: WorkspaceCreatedAtCache,
  handlers: {
    onUserRoot: (data: {
      activeStoreId: string;
      onboarding: Partial<OnboardingState>;
      subscription: SubscriptionState;
    }) => void;
    onStores: (stores: StoreProfile[]) => void;
    onCustomSkus: (skus: SkuItem[]) => void;
    onOrders: (orders: DistributorOrderRecord[]) => void;
    onAuditLogs: (entries: AuditLogEntry[]) => void;
    onNotifications: (items: NotificationItem[]) => void;
    onMediaAssets: (assets: ImageAsset[]) => void;
    onChats: (messages: ChatMessageItem[]) => void;
  }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  // 1. User workspace root doc
  const userPath = `users/${userId}`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', userId),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        cache.userCreatedAt = d.createdAt;
        handlers.onUserRoot({
          activeStoreId: String(d.activeStoreId || ''),
          onboarding: {
            completed: Boolean(d.onboardingCompleted),
            dismissedChecklist: Boolean(d.dismissedChecklist),
            operatorRole: d.operatorRole || 'store-manager',
            completedSteps: Array.isArray(d.completedSteps) ? d.completedSteps : [],
          },
          subscription: {
            planTier: d.planTier || 'starter',
            billingCycle: d.billingCycle || 'monthly',
            doorQuota: Number(d.doorQuota) || 2,
            storeCount: Number(d.storeCount) || 1,
            googlePlayLinked: Boolean(d.googlePlayLinked),
            status: String(d.subscriptionStatus || 'active'),
          },
        });
      },
      (error) => handleFirestoreError(error, OperationType.GET, userPath)
    )
  );

  // 2. Stores subcollection
  const storesPath = `users/${userId}/stores`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'stores'), where('ownerId', '==', userId)),
      (snap) => {
        if (snap.empty) return;
        const list: StoreProfile[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          cache.stores[docSnap.id] = d.createdAt;
          return {
            id: docSnap.id,
            layoutTemplate: String(d.layoutTemplate || 'Custom Cooler'),
            doors: Array.isArray(d.doors) ? d.doors.map(deserializeDoorFromFirestore) : [],
            carriedSkuIds: Array.isArray(d.carriedSkuIds) ? (d.carriedSkuIds as string[]) : [],
            insights: Array.isArray(d.insights) ? d.insights : [],
            audits: Array.isArray(d.audits) ? d.audits : [],
            settings: d.settings,
          };
        });
        handlers.onStores(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, storesPath)
    )
  );

  // 3. Custom SKUs & inventory overrides
  const skusPath = `users/${userId}/customSkus`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'customSkus'), where('ownerId', '==', userId)),
      (snap) => {
        const list: SkuItem[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          cache.customSkus[docSnap.id] = d.createdAt;
          return {
            id: docSnap.id,
            skuCode: String(d.skuCode || docSnap.id),
            name: String(d.name || ''),
            shortName: String(d.shortName || ''),
            brand: d.brand || 'custom',
            brandLabel: String(d.brandLabel || 'House Brand'),
            brandColor: String(d.brandColor || '#0284c7'),
            size: String(d.size || '16 oz'),
            containerType: d.containerType || 'can',
            price: Number(d.price) || 0,
            weeklyVelocity: Number(d.weeklyVelocity) || 0,
            marginPct: Number(d.marginPct) || 0,
            backroomQty: Number(d.backroomQty) || 0,
            parLevel: Number(d.parLevel) || 0,
            primaryColor: String(d.primaryColor || '#0284c7'),
            secondaryColor: String(d.secondaryColor || '#0ea5e9'),
            capColor: String(d.capColor || '#e2e8f0'),
            upc: d.upc ? String(d.upc) : undefined,
            distributor: d.distributor ? String(d.distributor) : undefined,
            category: d.category ? String(d.category) : undefined,
            unitsPerCase: d.unitsPerCase ? Number(d.unitsPerCase) : undefined,
            netCaseCost: typeof d.netCaseCost === 'number' ? d.netCaseCost : undefined,
          };
        });
        handlers.onCustomSkus(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, skusPath)
    )
  );

  // 4. Distributor Orders
  const ordersPath = `users/${userId}/orders`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'orders'), where('ownerId', '==', userId), limit(60)),
      (snap) => {
        const list: DistributorOrderRecord[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            cache.orders[docSnap.id] = d.createdAt;
            return {
              id: docSnap.id,
              poNumber: String(d.poNumber),
              createdAtIso: String(d.createdAtIso),
              storeName: String(d.storeName),
              distributorSummary: String(d.distributorSummary),
              totalCases: Number(d.totalCases) || 1,
              totalUnits: Number(d.totalUnits) || 1,
              totalWholesaleCost: Number(d.totalWholesaleCost) || 0,
              status: d.status === 'received' ? ('received' as const) : ('submitted' as const),
              lines: Array.isArray(d.lines) ? d.lines : [],
            };
          })
          .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))
          .slice(0, 40);
        handlers.onOrders(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, ordersPath)
    )
  );

  // 5. Audit Logs
  const auditLogsPath = `users/${userId}/auditLogs`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'auditLogs'), where('ownerId', '==', userId), limit(150)),
      (snap) => {
        if (snap.empty) return;
        const list: AuditLogEntry[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              timestampIso: String(d.timestampIso),
              category: d.category,
              severity: d.severity,
              actor: String(d.actor),
              storeName: String(d.storeName),
              doorLabel: d.doorLabel ? String(d.doorLabel) : undefined,
              action: String(d.action),
              details: String(d.details),
            };
          })
          .sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
        handlers.onAuditLogs(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, auditLogsPath)
    )
  );

  // 6. Notifications
  const notifsPath = `users/${userId}/notifications`;
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'users', userId, 'notifications'),
        where('ownerId', '==', userId),
        limit(60)
      ),
      (snap) => {
        if (snap.empty) return;
        const list: NotificationItem[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            cache.notifications[docSnap.id] = d.createdAt;
            return {
              id: docSnap.id,
              timestampIso: String(d.timestampIso),
              category: d.category,
              severity: d.severity,
              title: String(d.title),
              message: String(d.message),
              read: Boolean(d.read),
              doorId: d.doorId ? String(d.doorId) : undefined,
              targetTab: d.targetTab,
            };
          })
          .sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
        handlers.onNotifications(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, notifsPath)
    )
  );

  // 7. Media Assets
  const mediaPath = `users/${userId}/mediaAssets`;
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'users', userId, 'mediaAssets'),
        where('ownerId', '==', userId),
        limit(40)
      ),
      (snap) => {
        if (snap.empty) return;
        const list: ImageAsset[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              title: String(d.title),
              category: d.category,
              url: String(d.url),
              createdAtIso: String(d.createdAtIso),
              storeName: d.storeName ? String(d.storeName) : undefined,
              doorId: d.doorId ? String(d.doorId) : undefined,
              doorLabel: d.doorLabel ? String(d.doorLabel) : undefined,
              skuId: d.skuId ? String(d.skuId) : undefined,
              tags: Array.isArray(d.tags) ? d.tags : [],
              builtIn: Boolean(d.builtIn),
            };
          })
          .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        handlers.onMediaAssets(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, mediaPath)
    )
  );

  // 8. Chat Messages
  const chatsPath = `users/${userId}/chats`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'chats'), where('ownerId', '==', userId), limit(80)),
      (snap) => {
        const list: (ChatMessageItem & { _sortMs: number })[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : 0;
          return {
            id: docSnap.id,
            role: d.role === 'model' ? 'model' : 'user',
            modelUsed: String(d.modelUsed || 'gemini-4-hydrogen'),
            content: String(d.content || ''),
            sources: Array.isArray(d.sources) ? d.sources : undefined,
            _sortMs: ts,
          };
        });
        list.sort((a, b) => a._sortMs - b._sortMs || a.id.localeCompare(b.id));
        handlers.onChats(list.map(({ _sortMs: _, ...rest }) => rest));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, chatsPath)
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}
