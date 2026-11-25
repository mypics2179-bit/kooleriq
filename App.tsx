import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  BarChart3,
  Bell,
  Bot,
  ClipboardList,
  Images,
  LayoutGrid,
  Lock,
  LogIn,
  LogOut,
  Moon,
  Package,
  Plus,
  ScanBarcode,
  Settings as SettingsIcon,
  ShoppingCart,
  Store,
  Sun,
} from 'lucide-react';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { AiPlatformSection } from './components/AiPlatformSection';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { AuthGateScreen } from './components/AuthGateScreen';
import { BarcodeQrScannerModal, ScanModePreference } from './components/BarcodeQrScannerModal';
import { CsvImportExportModal } from './components/CsvImportExportModal';
import { ImageLibraryModal } from './components/ImageLibraryModal';
import { InventoryScreen } from './components/InventoryScreen';
import { KoolerIQLogo } from './components/KoolerIQLogo';
import { NotificationCenterDrawer } from './components/NotificationCenterDrawer';
import {
  OnboardingChecklistBanner,
  OnboardingWizardModal,
} from './components/OnboardingFlow';
import { OrdersScreen } from './components/OrdersScreen';
import { PlanogramScreen } from './components/PlanogramScreen';
import { PrototypePreviewModal } from './components/PrototypePreviewModal';
import { ReportsScreen } from './components/ReportsScreen';
import { ScanHubScreen } from './components/ScanHubScreen';
import { SettingsScreen } from './components/SettingsScreen';
import {
  AddCustomSkuModal,
  CreateStoreModal,
  DoorLayoutEditorModal,
} from './components/StoreModals';
import {
  buildCustomDoor,
  INITIAL_STORES,
  SKU_CATALOG,
  slot as buildSlot,
} from './data/mockStoreData';
import { auth, googleAuthProvider } from './lib/firebase';
import {
  appendAuditLogToFirestore,
  appendChatMessageToFirestore,
  clearAuditLogsInFirestore,
  clearChatMessagesInFirestore,
  clearNotificationsInFirestore,
  createNotificationInFirestore,
  createOrderInFirestore,
  deleteMediaAssetInFirestore,
  ensureUserWorkspaceBootstrapped,
  markAllNotificationsReadInFirestore,
  markNotificationReadInFirestore,
  sanitizeDocId,
  saveMediaAssetToFirestore,
  subscribeToUserWorkspace,
  updateUserPreferencesInFirestore,
  updateUserSubscriptionInFirestore,
  upsertCustomSkuInFirestore,
  upsertStoreInFirestore,
  WorkspaceCreatedAtCache,
} from './lib/firestoreWorkspace';
import {
  AuditLogCategory,
  AuditLogEntry,
  AuditLogSeverity,
  AuditRecord,
  BillingCycle,
  ChatMessageItem,
  CoolerDoor,
  DistributorOrderLine,
  DistributorOrderRecord,
  DoorHardwareType,
  ImageAsset,
  NavTab,
  normalizeNavTab,
  NotificationCategory,
  NotificationItem,
  OnboardingState,
  OperatorRole,
  PlanTier,
  SkuItem,
  StoreProfile,
  StoreSettings,
  SubscriptionState,
} from './types/kooleriq';
import {
  BEVERAGE_CSV_URL,
  generateAuditLogCsv,
  parseBeverageCsv,
} from './utils/beverageCsvParser';
import { formatTemp, getDoorMetrics } from './utils/formatters';

function cloneDoors(doors: CoolerDoor[]): CoolerDoor[] {
  return doors.map((d) => ({
    ...d,
    shelves: d.shelves.map((shelf) =>
      shelf.map((s) => ({
        ...s,
        aiRecommendation: s.aiRecommendation ? { ...s.aiRecommendation } : undefined,
      }))
    ),
  }));
}

function cloneStores(stores: StoreProfile[]): StoreProfile[] {
  return stores.map((st) => ({
    ...st,
    doors: cloneDoors(st.doors),
    carriedSkuIds: [...st.carriedSkuIds],
    insights: st.insights.map((i) => ({ ...i })),
    audits: st.audits.map((a) => ({ ...a })),
    settings: { ...st.settings },
  }));
}

function cloneCatalog(cat: Record<string, SkuItem>): Record<string, SkuItem> {
  const copy: Record<string, SkuItem> = {};
  for (const key of Object.keys(cat)) {
    copy[key] = { ...cat[key] };
  }
  return copy;
}

const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  planTier: 'starter',
  billingCycle: 'monthly',
  doorQuota: 2,
  storeCount: 1,
  googlePlayLinked: true,
  status: 'active',
};

const DEFAULT_ONBOARDING: OnboardingState = {
  completed: false,
  dismissedChecklist: false,
  operatorRole: 'store-manager',
  completedSteps: [],
};

const ONBOARDING_STORAGE_KEY = 'kooleriq-onboarding-v1';
const AUDIT_LOG_STORAGE_KEY = 'kooleriq-auditlog-v1';
const NOTIFICATIONS_STORAGE_KEY = 'kooleriq-notifications-v1';
const MEDIA_LIBRARY_STORAGE_KEY = 'kooleriq-media-v1';
const ORDERS_STORAGE_KEY = 'kooleriq-orders-v1';

const DEFAULT_IMAGE_ASSETS: ImageAsset[] = [
  {
    id: 'asset-brand-emblem',
    title: 'KoolerIQ Brand Emblem',
    category: 'brand-signage',
    url: '/src/assets/images/kooleriq_brand_logo_1795456908836.jpg',
    createdAtIso: new Date(Date.now() - 86400_000 * 3).toISOString(),
    storeName: 'All Fleet Stores',
    tags: ['logo', 'brand', 'kooleriq'],
    builtIn: true,
  },
];

function buildInitialAuditLog(): AuditLogEntry[] {
  const now = Date.now();
  return [
    {
      id: 'alog-init-1',
      timestampIso: new Date(now - 1000 * 60 * 18).toISOString(),
      category: 'csv',
      severity: 'success',
      actor: 'System Sync',
      storeName: INITIAL_STORES[0].settings.storeName,
      action: 'Distributor UPC Catalog Synced',
      details:
        'Loaded 157 Swire Coca-Cola and PepsiCo beverage SKUs with wholesale net case costs and UPC barcodes.',
    },
    {
      id: 'alog-init-2',
      timestampIso: new Date(now - 1000 * 60 * 42).toISOString(),
      category: 'shelf-audit',
      severity: 'warning',
      actor: 'Store Manager',
      storeName: INITIAL_STORES[0].settings.storeName,
      doorLabel: INITIAL_STORES[0].doors[0]?.label,
      action: 'Optical Shelf Audit Logged',
      details: 'Verified cooler facings; flagged low-depth energy facings for backroom pull.',
    },
    {
      id: 'alog-init-3',
      timestampIso: new Date(now - 1000 * 60 * 95).toISOString(),
      category: 'cold-chain',
      severity: 'info',
      actor: 'Telemetry Monitor',
      storeName: INITIAL_STORES[0].settings.storeName,
      doorLabel: INITIAL_STORES[0].doors[0]?.label,
      action: 'Compressor Temperature Nominal',
      details: 'Cooler bay stabilized within target 34–38°F cold-chain operating band.',
    },
  ];
}

function buildInitialNotifications(): NotificationItem[] {
  const now = Date.now();
  const primaryStore = INITIAL_STORES[0];
  const warmDoor = primaryStore.doors.find(
    (d) => d.tempF > primaryStore.settings.maxTempAlertF
  );
  const oosDoor = primaryStore.doors.find((d) =>
    d.shelves.flat().some((s) => s.currentDepth === 0)
  );

  const items: NotificationItem[] = [];
  if (warmDoor) {
    items.push({
      id: `notif-warm-${warmDoor.id}`,
      timestampIso: new Date(now - 1000 * 60 * 6).toISOString(),
      category: 'cold-chain',
      severity: 'critical',
      title: `High-Temp Alert · Door ${warmDoor.number}`,
      message: `${warmDoor.label} is reading ${warmDoor.tempF.toFixed(1)}°F (above ${primaryStore.settings.maxTempAlertF}°F threshold).`,
      read: false,
      doorId: warmDoor.id,
      targetTab: 'settings',
    });
  }
  if (oosDoor) {
    const oosCount = oosDoor.shelves.flat().filter((s) => s.currentDepth === 0).length;
    items.push({
      id: `notif-oos-${oosDoor.id}`,
      timestampIso: new Date(now - 1000 * 60 * 14).toISOString(),
      category: 'stock',
      severity: 'warning',
      title: `${oosCount} Out-of-Stock Facings · Door ${oosDoor.number}`,
      message: `${oosDoor.label} has empty slots queued for walk-in restocking.`,
      read: false,
      doorId: oosDoor.id,
      targetTab: 'dashboard',
    });
  }
  items.push({
    id: 'notif-csv-master',
    timestampIso: new Date(now - 1000 * 60 * 35).toISOString(),
    category: 'system',
    severity: 'success',
    title: 'Swire Coca-Cola & PepsiCo UPC Sheet Active',
    message: '157 distributor beverages, net case costs, and margins are ready for scanning and CSV export.',
    read: true,
    targetTab: 'inventory',
  });
  return items;
}

const CATEGORY_SKU_MAP: Record<string, string[]> = {
  energy: [
    'sku-celsius-peach',
    'sku-celsius-arctic',
    'sku-monster-zero',
    'sku-monster-orig',
    'sku-redbull-orig',
    'sku-redbull-sf',
    'sku-alani-cherry',
  ],
  csd: [
    'sku-coke-orig',
    'sku-coke-zero',
    'sku-sprite-20',
    'sku-olipop-grape',
    'sku-olipop-rootbeer',
  ],
  hydration: [
    'sku-gatorade-cool',
    'sku-gatorade-glacier',
    'sku-liquid-death-mtn',
    'sku-liquid-death-lime',
  ],
  coffee: [
    'sku-starbucks-double',
    'sku-starbucks-frap',
    'sku-yerba-berry',
    'sku-corepower-choc',
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [stores, setStores] = useState<StoreProfile[]>(() => cloneStores(INITIAL_STORES));
  const [activeStoreId, setActiveStoreId] = useState<string>(INITIAL_STORES[0].id);
  const [skuCatalog, setSkuCatalog] = useState<Record<string, SkuItem>>(() =>
    cloneCatalog(SKU_CATALOG)
  );
  const [subscription, setSubscription] = useState<SubscriptionState>({ ...DEFAULT_SUBSCRIPTION });
  const [selectedDoorId, setSelectedDoorId] = useState<string>(INITIAL_STORES[0].doors[0].id);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return window.localStorage.getItem('kooleriq-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem('kooleriq-theme', theme);
    } catch {
      // ignore storage failure
    }
  }, [theme]);

  // Modals for per-store layout, custom drinks, onboarding, barcode/QR, audit log, notifications, CSV & image library
  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [doorEditorOpen, setDoorEditorOpen] = useState(false);
  const [addSkuOpen, setAddSkuOpen] = useState(false);
  const [prefillUpc, setPrefillUpc] = useState('');
  const [pickedSkuImageUrl, setPickedSkuImageUrl] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerInitialMode, setScannerInitialMode] = useState<
    'camera' | 'upload' | 'manual' | 'labels'
  >('camera');
  const [scannerInitialPreference, setScannerInitialPreference] =
    useState<ScanModePreference>('auto');
  const [scannerTargetSlot, setScannerTargetSlot] = useState<{
    doorId: string;
    doorNumber: string;
    slotId: string;
    slotCoord: string;
  } | null>(null);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvModalTab, setCsvModalTab] = useState<'import' | 'export'>('import');
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false);
  const [imageLibraryMode, setImageLibraryMode] = useState<'manage' | 'pick-for-sku'>('manage');
  const [prototypeOpen, setPrototypeOpen] = useState(false);

  const [orders, setOrders] = useState<DistributorOrderRecord[]>(() => {
    try {
      const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    try {
      const raw = window.localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
      if (!raw) return buildInitialAuditLog();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : buildInitialAuditLog();
    } catch {
      return buildInitialAuditLog();
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) return buildInitialNotifications();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : buildInitialNotifications();
    } catch {
      return buildInitialNotifications();
    }
  });

  const [imageAssets, setImageAssets] = useState<ImageAsset[]>(() => {
    try {
      const raw = window.localStorage.getItem(MEDIA_LIBRARY_STORAGE_KEY);
      if (!raw) return DEFAULT_IMAGE_ASSETS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_IMAGE_ASSETS;
    } catch {
      return DEFAULT_IMAGE_ASSETS;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(auditLog.slice(0, 150)));
    } catch {
      // ignore storage failure
    }
  }, [auditLog]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(notifications.slice(0, 60))
      );
    } catch {
      // ignore storage failure
    }
  }, [notifications]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MEDIA_LIBRARY_STORAGE_KEY, JSON.stringify(imageAssets.slice(0, 40)));
    } catch {
      // ignore storage quota exceeded for large photos
    }
  }, [imageAssets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders.slice(0, 40)));
    } catch {
      // ignore storage failure
    }
  }, [orders]);

  // User Onboarding state (inline checklist + explicit 4-step wizard, never auto-popped on load)
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => {
    try {
      const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_ONBOARDING };
      const parsed = JSON.parse(raw) as Partial<OnboardingState>;
      return {
        completed: Boolean(parsed.completed),
        dismissedChecklist: Boolean(parsed.dismissedChecklist),
        operatorRole: parsed.operatorRole || 'store-manager',
        completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
      };
    } catch {
      return { ...DEFAULT_ONBOARDING };
    }
  });
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [cameraGranted, setCameraGranted] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboarding));
    } catch {
      // ignore storage failure
    }
  }, [onboarding]);

  useEffect(() => {
    let active = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          if (!active) return;
          setCameraGranted(status.state === 'granted');
          status.onchange = () => {
            if (active) setCameraGranted(status.state === 'granted');
          };
        })
        .catch(() => {
          // ignore unsupported permissions query
        });
    }
    return () => {
      active = false;
    };
  }, []);

  const markOnboardingStep = useCallback((stepId: string) => {
    setOnboarding((prev) =>
      prev.completedSteps.includes(stepId)
        ? prev
        : { ...prev, completedSteps: [...prev.completedSteps, stepId] }
    );
  }, []);

  // Firebase Auth & Firestore real-time state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fatalBoundaryError, setFatalBoundaryError] = useState<Error | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState<boolean>(false);
  const firestoreReadyRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const prefsSaveTimeoutRef = useRef<number | null>(null);
  const csvTextRef = useRef<string | null>(null);
  const createdAtCacheRef = useRef<WorkspaceCreatedAtCache>({
    stores: {},
    customSkus: {},
    orders: {},
    notifications: {},
  });
  const storeSyncHashRef = useRef<Record<string, string>>({});
  const prefsSyncHashRef = useRef<string>('');

  // Gemini Multi-Turn Copilot state
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId) ?? stores[0],
    [stores, activeStoreId]
  );

  const doors = activeStore.doors;
  const insights = activeStore.insights;
  const audits = activeStore.audits;
  const settings = activeStore.settings;
  const carriedSkuIds = activeStore.carriedSkuIds;

  const updateActiveStore = useCallback(
    (updater: (store: StoreProfile) => StoreProfile) => {
      setStores((prev) =>
        prev.map((st) => (st.id === activeStore.id ? updater(st) : st))
      );
    },
    [activeStore.id]
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const appendAuditLog = useCallback(
    (
      category: AuditLogCategory,
      severity: AuditLogSeverity,
      action: string,
      details: string,
      doorLabel?: string
    ) => {
      const entry: AuditLogEntry = {
        id: sanitizeDocId(`alog-${Date.now()}-${Math.floor(Math.random() * 999)}`, 'alog'),
        timestampIso: new Date().toISOString(),
        category,
        severity,
        actor: authUser?.email || 'Store Operator',
        storeName: settings.storeName,
        doorLabel,
        action,
        details,
      };
      setAuditLog((prev) => [entry, ...prev].slice(0, 150));
      if (authUser && firestoreReadyRef.current) {
        void appendAuditLogToFirestore(authUser.uid, entry);
      }
    },
    [authUser, settings.storeName]
  );

  const pushNotification = useCallback(
    (
      category: NotificationCategory,
      severity: NotificationItem['severity'],
      title: string,
      message: string,
      targetTab?: NavTab,
      doorId?: string
    ) => {
      const item: NotificationItem = {
        id: sanitizeDocId(`notif-${Date.now()}-${Math.floor(Math.random() * 999)}`, 'notif'),
        timestampIso: new Date().toISOString(),
        category,
        severity,
        title,
        message,
        read: false,
        targetTab,
        doorId,
      };
      setNotifications((prev) => [item, ...prev].slice(0, 60));
      if (authUser && firestoreReadyRef.current) {
        void createNotificationInFirestore(authUser.uid, item);
      }
    },
    [authUser]
  );

  // Firebase Auth listener + Firestore real-time workspace subscription
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    let active = true;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      firestoreReadyRef.current = false;
      setAuthUser(user);

      if (!user) {
        setAuthToken(null);
        setAuthLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        if (!active) return;
        setAuthToken(token);
        setAuthError(null);

        const defaults = {
          stores: cloneStores(INITIAL_STORES),
          activeStoreId: INITIAL_STORES[0].id,
          onboarding: { ...DEFAULT_ONBOARDING },
          subscription: { ...DEFAULT_SUBSCRIPTION },
          initialAuditLog: buildInitialAuditLog(),
          initialNotifications: buildInitialNotifications(),
        };

        await ensureUserWorkspaceBootstrapped(user, defaults, createdAtCacheRef.current);
        if (!active) return;

        unsubFirestore = subscribeToUserWorkspace(user.uid, createdAtCacheRef.current, {
          onUserRoot: (data) => {
            const nextOnboarding: OnboardingState = {
              completed: Boolean(data.onboarding.completed),
              dismissedChecklist: Boolean(data.onboarding.dismissedChecklist),
              operatorRole: data.onboarding.operatorRole || 'store-manager',
              completedSteps: Array.isArray(data.onboarding.completedSteps)
                ? data.onboarding.completedSteps
                : [],
            };
            const nextActiveId = data.activeStoreId || INITIAL_STORES[0].id;
            prefsSyncHashRef.current = JSON.stringify({
              activeStoreId: nextActiveId,
              onboarding: nextOnboarding,
            });
            setActiveStoreId(nextActiveId);
            setOnboarding(nextOnboarding);
            setSubscription(data.subscription);
          },
          onStores: (cloudStores) => {
            if (cloudStores.length === 0) return;
            const nextHashes: Record<string, string> = {};
            cloudStores.forEach((st) => {
              nextHashes[st.id] = JSON.stringify({
                l: st.layoutTemplate,
                d: st.doors,
                c: st.carriedSkuIds,
                i: st.insights,
                a: st.audits,
                s: st.settings,
              });
            });
            storeSyncHashRef.current = nextHashes;
            setStores(cloudStores);
            setSelectedDoorId((prevDoor) => {
              const allDoorIds = new Set(cloudStores.flatMap((s) => s.doors.map((d) => d.id)));
              if (prevDoor && allDoorIds.has(prevDoor)) return prevDoor;
              return cloudStores[0]?.doors[0]?.id || prevDoor;
            });
          },
          onCustomSkus: (customSkus) => {
            if (customSkus.length === 0) return;
            setSkuCatalog((prev) => {
              const next = { ...prev };
              customSkus.forEach((sku) => {
                next[sku.id] = sku;
              });
              return next;
            });
          },
          onOrders: (cloudOrders) => {
            setOrders(cloudOrders);
          },
          onAuditLogs: (cloudLogs) => {
            setAuditLog(cloudLogs);
          },
          onNotifications: (cloudNotifs) => {
            setNotifications(cloudNotifs);
          },
          onMediaAssets: (cloudAssets) => {
            setImageAssets((prev) => {
              const builtIns = prev.filter((a) => a.builtIn);
              const ids = new Set(cloudAssets.map((a) => a.id));
              return [...cloudAssets, ...builtIns.filter((b) => !ids.has(b.id))];
            });
          },
          onChats: (cloudChats) => {
            setChatMessages(cloudChats);
          },
        });

        firestoreReadyRef.current = true;
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Unable to initialize cloud workspace.';
        if (msg.includes('Quota exceeded')) {
          setFatalBoundaryError(err instanceof Error ? err : new Error(msg));
          return;
        }
        try {
          const parsed = JSON.parse(msg) as { error?: string };
          setAuthError(parsed?.error || msg);
        } catch {
          setAuthError(msg);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  // Load Swire Coca-Cola & PepsiCo UPC / wholesale cost CSV on mount
  useEffect(() => {
    let cancelled = false;
    fetch(BEVERAGE_CSV_URL)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('CSV load failed'))))
      .then((text) => {
        if (cancelled) return;
        csvTextRef.current = text;
        setSkuCatalog((prev) => parseBeverageCsv(text, prev));
      })
      .catch(() => {
        // Keep base catalog active if local CSV asset is unavailable
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced sync of changed store layouts & telemetry to Firestore
  useEffect(() => {
    if (!authUser || !firestoreReadyRef.current) return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      stores.forEach((st) => {
        const sig = JSON.stringify({
          l: st.layoutTemplate,
          d: st.doors,
          c: st.carriedSkuIds,
          i: st.insights,
          a: st.audits,
          s: st.settings,
        });
        if (storeSyncHashRef.current[st.id] !== sig) {
          storeSyncHashRef.current[st.id] = sig;
          void upsertStoreInFirestore(
            authUser.uid,
            st,
            createdAtCacheRef.current.stores[st.id]
          );
        }
      });
    }, 650);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [authUser, stores]);

  // Debounced sync of active store selection and onboarding preferences to Firestore
  useEffect(() => {
    if (!authUser || !firestoreReadyRef.current) return;
    const sig = JSON.stringify({ activeStoreId, onboarding });
    if (prefsSyncHashRef.current === sig) return;

    if (prefsSaveTimeoutRef.current) {
      window.clearTimeout(prefsSaveTimeoutRef.current);
    }

    prefsSaveTimeoutRef.current = window.setTimeout(() => {
      prefsSyncHashRef.current = sig;
      void updateUserPreferencesInFirestore(authUser.uid, activeStoreId, onboarding);
    }, 500);

    return () => {
      if (prefsSaveTimeoutRef.current) {
        window.clearTimeout(prefsSaveTimeoutRef.current);
      }
    };
  }, [authUser, activeStoreId, onboarding]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setAuthToken(token);
      markOnboardingStep('sync');
      showToast(`Signed in as ${cred.user.email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in was cancelled.';
      setAuthError(message);
      showToast(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    firestoreReadyRef.current = false;
    await signOut(auth);
    setAuthToken(null);
    setSubscription({ ...DEFAULT_SUBSCRIPTION });
    setChatMessages([]);
    setOrders([]);
    setChatOpen(false);
    setScannerOpen(false);
    setAuditLogOpen(false);
    setNotificationsOpen(false);
    setCsvModalOpen(false);
    setImageLibraryOpen(false);
    showToast('Signed out. Workspace screens are locked.');
  };

  const handleSelectPlan = async (
    planTier: PlanTier,
    billingCycle: BillingCycle,
    doorQuota: number,
    storeCount: number
  ) => {
    if (!authUser) {
      await handleGoogleSignIn();
      return;
    }

    setIsSavingPlan(true);
    try {
      const nextSub: SubscriptionState = {
        planTier,
        billingCycle,
        doorQuota,
        storeCount,
        googlePlayLinked: true,
        status: 'active',
      };
      await updateUserSubscriptionInFirestore(authUser.uid, nextSub);
      setSubscription(nextSub);
      showToast(
        `Activated ${planTier.toUpperCase()} (${billingCycle}) linked to Google Play.`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleSwitchStore = (storeId: string) => {
    const target = stores.find((s) => s.id === storeId);
    if (!target) return;
    setActiveStoreId(target.id);
    if (target.doors[0]) {
      setSelectedDoorId(target.doors[0].id);
    }
    showToast(`Switched to ${target.settings.storeName} (${target.layoutTemplate}).`);
  };

  const handleCreateStore = (payload: {
    storeName: string;
    storeCode: string;
    address: string;
    routeId: string;
    preset: 'bodega-2' | 'cstore-4' | 'plaza-6' | 'custom';
    customDoors: number;
    customShelves: number;
    customFacings: number;
    hardwareType: DoorHardwareType;
    categories: string[];
  }) => {
    const newStoreId = `store-${Date.now()}`;
    const carriedIds = Array.from(
      new Set(payload.categories.flatMap((c) => CATEGORY_SKU_MAP[c] ?? []))
    );
    const pool = carriedIds.length > 0 ? carriedIds : Object.keys(skuCatalog);

    let generatedDoors: CoolerDoor[] = [];
    let templateLabel = 'Custom Cooler Layout';

    if (payload.preset === 'bodega-2') {
      templateLabel = '2-Door Slim & Mini';
      generatedDoors = [
        buildCustomDoor({
          id: `${newStoreId}-d1`,
          number: '01',
          label: 'Door 01 · Craft & Energy Slim',
          category: 'Slim Reach-In',
          hardwareType: 'slim-reach-in',
          shelvesCount: 5,
          facingsPerShelf: 4,
          defaultMaxDepth: 5,
          skuPool: pool,
        }),
        buildCustomDoor({
          id: `${newStoreId}-d2`,
          number: '02',
          label: 'Door 02 · Countertop Grab-n-Go',
          category: 'Countertop Mini',
          hardwareType: 'countertop-mini',
          shelvesCount: 4,
          facingsPerShelf: 4,
          defaultMaxDepth: 4,
          skuPool: pool.slice().reverse(),
        }),
      ];
    } else if (payload.preset === 'cstore-4') {
      templateLabel = '4-Door C-Store Standard';
      generatedDoors = Array.from({ length: 4 }).map((_, idx) =>
        buildCustomDoor({
          id: `${newStoreId}-d${idx + 1}`,
          number: String(idx + 1).padStart(2, '0'),
          label: `Door 0${idx + 1} · Beverage Bay ${idx + 1}`,
          category: idx === 0 ? 'Energy' : idx === 1 ? 'CSD & Fizz' : idx === 2 ? 'Hydration' : 'Cold Brew & Craft',
          hardwareType: 'standard-glass',
          shelvesCount: 5,
          facingsPerShelf: 6,
          defaultMaxDepth: 6,
          skuPool: pool.slice(idx * 2).concat(pool.slice(0, idx * 2)),
        })
      );
    } else if (payload.preset === 'plaza-6') {
      templateLabel = '6-Door Travel Plaza';
      generatedDoors = Array.from({ length: 6 }).map((_, idx) =>
        buildCustomDoor({
          id: `${newStoreId}-d${idx + 1}`,
          number: String(idx + 1).padStart(2, '0'),
          label:
            idx === 0
              ? 'Bay 01 · Open Air Curtain'
              : idx === 5
                ? 'Bay 06 · Walk-In Cave'
                : `Door 0${idx + 1} · Plaza Cooler`,
          category: idx === 0 ? 'High-Turn Air Curtain' : idx === 5 ? 'Walk-In Cave' : 'Highway Beverage',
          hardwareType:
            idx === 0 ? 'wide-air-curtain' : idx === 5 ? 'walk-in-cave' : 'standard-glass',
          shelvesCount: idx === 5 ? 4 : 5,
          facingsPerShelf: idx === 0 ? 8 : 6,
          defaultMaxDepth: idx === 0 || idx === 5 ? 8 : 6,
          skuPool: pool.slice(idx).concat(pool.slice(0, idx)),
        })
      );
    } else {
      templateLabel = `${payload.customDoors}-Door Custom (${payload.customShelves}×${payload.customFacings})`;
      generatedDoors = Array.from({ length: payload.customDoors }).map((_, idx) =>
        buildCustomDoor({
          id: `${newStoreId}-d${idx + 1}`,
          number: String(idx + 1).padStart(2, '0'),
          label: `Door ${String(idx + 1).padStart(2, '0')} · Custom Bay`,
          category: 'Custom Assortment',
          hardwareType: payload.hardwareType,
          shelvesCount: payload.customShelves,
          facingsPerShelf: payload.customFacings,
          defaultMaxDepth: 6,
          skuPool: pool.slice(idx).concat(pool.slice(0, idx)),
        })
      );
    }

    const newStore: StoreProfile = {
      id: newStoreId,
      layoutTemplate: templateLabel,
      doors: generatedDoors,
      carriedSkuIds: pool,
      insights: [],
      audits: [],
      settings: {
        ...settings,
        storeName: payload.storeName,
        storeCode: payload.storeCode,
        address: payload.address,
        routeId: payload.routeId,
      },
    };

    setStores((prev) => [...prev, newStore]);
    setActiveStoreId(newStore.id);
    if (generatedDoors[0]) {
      setSelectedDoorId(generatedDoors[0].id);
    }
    setActiveTab('dashboard');
    appendAuditLog(
      'layout',
      'success',
      'Created New Store Layout',
      `${payload.storeName} (${payload.storeCode}) configured with ${templateLabel}.`
    );
    pushNotification(
      'system',
      'success',
      `Store Added · ${payload.storeName}`,
      `Initialized ${generatedDoors.length} cooler doors with ${templateLabel}.`,
      'dashboard'
    );
    showToast(`Created ${payload.storeName} (${templateLabel}).`);
  };

  const handleUpdateDoorLayout = (
    doorId: string,
    patch: {
      label: string;
      category: string;
      hardwareType: DoorHardwareType;
      shelvesCount: number;
      facingsPerShelf: number;
      defaultMaxDepth: number;
    }
  ) => {
    const pool = carriedSkuIds.length > 0 ? carriedSkuIds : Object.keys(skuCatalog);
    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((door) => {
        if (door.id !== doorId) return door;
        const prefix = `D${door.number}-${door.id.slice(-3)}`;
        const nextShelves = Array.from({ length: patch.shelvesCount }).map((_, sIdx) =>
          Array.from({ length: patch.facingsPerShelf }).map((__, fIdx) => {
            const existing = door.shelves[sIdx]?.[fIdx];
            if (existing) {
              const clampedDepth = Math.min(existing.currentDepth, patch.defaultMaxDepth);
              return {
                ...existing,
                maxDepth: patch.defaultMaxDepth,
                currentDepth: clampedDepth,
                status: recomputeSlotStatus(
                  existing.skuId,
                  existing.plannedSkuId,
                  clampedDepth,
                  patch.defaultMaxDepth,
                  store.settings.lowStockThresholdPct
                ),
              };
            }
            const fallbackSku = pool[(sIdx * patch.facingsPerShelf + fIdx) % pool.length];
            return buildSlot(
              prefix,
              sIdx,
              fIdx,
              fallbackSku,
              patch.defaultMaxDepth,
              patch.defaultMaxDepth
            );
          })
        );
        return {
          ...door,
          label: patch.label,
          category: patch.category,
          hardwareType: patch.hardwareType,
          facingsPerShelf: patch.facingsPerShelf,
          defaultMaxDepth: patch.defaultMaxDepth,
          shelves: nextShelves,
        };
      }),
    }));
    markOnboardingStep('layout');
    appendAuditLog(
      'layout',
      'info',
      'Updated Cooler Door Geometry',
      `${patch.label} updated to ${patch.shelvesCount} shelves × ${patch.facingsPerShelf} facings.`,
      patch.label
    );
    showToast(
      `Updated ${patch.label} (${patch.shelvesCount} shelves × ${patch.facingsPerShelf} facings).`
    );
  };

  const handleAddDoor = (payload: {
    label: string;
    category: string;
    hardwareType: DoorHardwareType;
    shelvesCount: number;
    facingsPerShelf: number;
    defaultMaxDepth: number;
  }) => {
    const pool = carriedSkuIds.length > 0 ? carriedSkuIds : Object.keys(skuCatalog);
    const nextNum = String(doors.length + 1).padStart(2, '0');
    const newDoor = buildCustomDoor({
      id: `${activeStore.id}-door-${Date.now()}`,
      number: nextNum,
      label: payload.label,
      category: payload.category,
      hardwareType: payload.hardwareType,
      shelvesCount: payload.shelvesCount,
      facingsPerShelf: payload.facingsPerShelf,
      defaultMaxDepth: payload.defaultMaxDepth,
      skuPool: pool,
    });

    updateActiveStore((store) => ({
      ...store,
      doors: [...store.doors, newDoor],
    }));
    setSelectedDoorId(newDoor.id);
    markOnboardingStep('layout');
    appendAuditLog(
      'layout',
      'success',
      'Added Cooler Door',
      `${newDoor.label} (${payload.shelvesCount}×${payload.facingsPerShelf}) added to layout.`,
      newDoor.label
    );
    showToast(`Added ${newDoor.label} to ${settings.storeName}.`);
  };

  const handleDeleteDoor = (doorId: string) => {
    if (doors.length <= 1) return;
    const removedDoor = doors.find((d) => d.id === doorId);
    const remaining = doors.filter((d) => d.id !== doorId);
    updateActiveStore((store) => ({
      ...store,
      doors: remaining,
    }));
    if (selectedDoorId === doorId && remaining[0]) {
      setSelectedDoorId(remaining[0].id);
    }
    markOnboardingStep('layout');
    appendAuditLog(
      'layout',
      'warning',
      'Removed Cooler Door',
      `Removed ${removedDoor?.label || 'cooler door'} from store schematic.`,
      removedDoor?.label
    );
    showToast('Removed cooler door from store layout.');
  };

  const handleAssignSlotSku = (doorId: string, slotId: string, newSkuId: string) => {
    const nextSku = skuCatalog[newSkuId];
    if (!nextSku) return;
    const targetDoor = doors.find((d) => d.id === doorId);

    updateActiveStore((store) => ({
      ...store,
      carriedSkuIds: store.carriedSkuIds.includes(newSkuId)
        ? store.carriedSkuIds
        : [...store.carriedSkuIds, newSkuId],
      doors: store.doors.map((door) => {
        if (door.id !== doorId) return door;
        return {
          ...door,
          shelves: door.shelves.map((shelf) =>
            shelf.map((s) => {
              if (s.id !== slotId) return s;
              const nextDepth = s.currentDepth === 0 ? s.maxDepth : s.currentDepth;
              return {
                ...s,
                skuId: newSkuId,
                plannedSkuId: newSkuId,
                currentDepth: nextDepth,
                status: recomputeSlotStatus(
                  newSkuId,
                  newSkuId,
                  nextDepth,
                  s.maxDepth,
                  store.settings.lowStockThresholdPct
                ),
              };
            })
          ),
        };
      }),
    }));
    appendAuditLog(
      'planogram',
      'info',
      'Reassigned Shelf Facing SKU',
      `Assigned ${nextSku.name} (${nextSku.upc || nextSku.skuCode}) to slot.`,
      targetDoor?.label
    );
    showToast(`Assigned ${nextSku.shortName} to slot.`);
  };

  const handleCreateCustomSku = (newSku: SkuItem) => {
    setSkuCatalog((prev) => ({
      ...prev,
      [newSku.id]: newSku,
    }));
    updateActiveStore((store) => ({
      ...store,
      carriedSkuIds: [...store.carriedSkuIds, newSku.id],
    }));
    if (authUser && firestoreReadyRef.current) {
      void upsertCustomSkuInFirestore(
        authUser.uid,
        newSku,
        createdAtCacheRef.current.customSkus[newSku.id]
      );
    }
    markOnboardingStep('assortment');
    appendAuditLog(
      'inventory',
      'success',
      'Added Custom Beverage SKU',
      `${newSku.name} (${newSku.upc || newSku.skuCode}) added at $${newSku.price.toFixed(2)}.`
    );
    showToast(`Added ${newSku.name} to ${settings.storeName} catalog.`);
  };

  const handleToggleCarriedSku = (skuId: string) => {
    const sku = skuCatalog[skuId];
    const wasCarried = carriedSkuIds.includes(skuId);
    updateActiveStore((store) => {
      const exists = store.carriedSkuIds.includes(skuId);
      return {
        ...store,
        carriedSkuIds: exists
          ? store.carriedSkuIds.filter((id) => id !== skuId)
          : [...store.carriedSkuIds, skuId],
      };
    });
    markOnboardingStep('assortment');
    if (sku) {
      appendAuditLog(
        'inventory',
        'info',
        wasCarried ? 'Removed SKU from Store Lineup' : 'Enabled SKU in Store Lineup',
        `${sku.name} (${sku.upc || sku.skuCode}).`
      );
    }
  };

  const storeContextSummary = useMemo(() => {
    const header = `Active Store: ${settings.storeName} (${settings.storeCode}, ${activeStore.layoutTemplate}, ${doors.length} doors, ${carriedSkuIds.length} active SKUs)`;
    const doorLines = doors
      .map((door) => {
        const m = getDoorMetrics(door);
        const oosCoords = door.shelves
          .flat()
          .filter((s) => s.currentDepth === 0)
          .map((s) => `${s.coord} (${skuCatalog[s.skuId]?.shortName})`)
          .join(', ');
        return `Door ${door.number} (${door.shelves.length}x${door.facingsPerShelf}, ${door.category}): ${formatTemp(
          door.tempF,
          settings.tempUnit
        )}, compliance ${m.compliancePct.toFixed(1)}%, ${m.oosCount} OOS [${
          oosCoords || 'none'
        }], pending AI lift +$${m.projectedWeeklyLift}/wk.`;
      })
      .join('\n');
    return `${header}\n${doorLines}`;
  }, [activeStore.layoutTemplate, carriedSkuIds.length, doors, skuCatalog, settings]);

  const handleSendChatMessage = async (
    text: string,
    modelMode: 'standard' | 'fast',
    useSearchGrounding: boolean
  ) => {
    setChatError(null);
    const userMsg: ChatMessageItem = {
      id: sanitizeDocId(`msg-u-${Date.now()}`, 'msg'),
      role: 'user',
      modelUsed: modelMode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen',
      content: text,
    };

    const historySnapshot = chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setChatMessages((prev) => [...prev, userMsg]);
    if (authUser && firestoreReadyRef.current) {
      void appendChatMessageToFirestore(authUser.uid, userMsg);
    }
    setChatSending(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authUser) {
        const token = await authUser.getIdToken();
        setAuthToken(token);
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: historySnapshot,
          modelMode,
          useSearchGrounding,
          storeContext: storeContextSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini assistant failed to respond.');
      }

      const modelMsg: ChatMessageItem = {
        id: sanitizeDocId(`msg-m-${Date.now() + 1}`, 'msg'),
        role: 'model',
        modelUsed:
          data.modelUsed ||
          (modelMode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen'),
        content: data.reply,
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setChatMessages((prev) => [...prev, modelMsg]);
      if (authUser && firestoreReadyRef.current) {
        void appendChatMessageToFirestore(authUser.uid, modelMsg);
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to reach KoolerIQ Copilot.');
    } finally {
      setChatSending(false);
    }
  };

  const handleClearChatHistory = async () => {
    const idsToDelete = chatMessages.map((m) => m.id);
    setChatMessages([]);
    setChatError(null);
    if (authUser && firestoreReadyRef.current && idsToDelete.length > 0) {
      void clearChatMessagesInFirestore(authUser.uid, idsToDelete);
    }
  };

  function recomputeSlotStatus(
    skuId: string,
    plannedSkuId: string,
    depth: number,
    maxDepth: number,
    lowPct: number
  ): 'optimal' | 'low' | 'oos' | 'violation' {
    if (depth <= 0) return 'oos';
    if (skuId !== plannedSkuId) return 'violation';
    if ((depth / maxDepth) * 100 <= lowPct) return 'low';
    return 'optimal';
  }

  const handleAdjustDepth = (doorId: string, slotId: string, delta: number) => {
    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((door) => {
        if (door.id !== doorId) return door;
        return {
          ...door,
          shelves: door.shelves.map((shelf) =>
            shelf.map((s) => {
              if (s.id !== slotId) return s;
              const nextDepth = Math.max(0, Math.min(s.maxDepth, s.currentDepth + delta));
              return {
                ...s,
                currentDepth: nextDepth,
                status: recomputeSlotStatus(
                  s.skuId,
                  s.plannedSkuId,
                  nextDepth,
                  s.maxDepth,
                  store.settings.lowStockThresholdPct
                ),
              };
            })
          ),
        };
      }),
    }));
  };

  const handleRestockFull = (doorId: string, slotId: string) => {
    let restockedUnits = 0;
    let targetSkuId = '';
    let slotCoord = '';

    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((door) => {
        if (door.id !== doorId) return door;
        return {
          ...door,
          shelves: door.shelves.map((shelf) =>
            shelf.map((s) => {
              if (s.id !== slotId) return s;
              restockedUnits = Math.max(0, s.maxDepth - s.currentDepth);
              targetSkuId = s.skuId;
              slotCoord = s.coord;
              return {
                ...s,
                currentDepth: s.maxDepth,
                status: recomputeSlotStatus(
                  s.skuId,
                  s.plannedSkuId,
                  s.maxDepth,
                  s.maxDepth,
                  store.settings.lowStockThresholdPct
                ),
              };
            })
          ),
        };
      }),
    }));

    if (restockedUnits > 0 && targetSkuId) {
      setSkuCatalog((prev) => {
        const sku = prev[targetSkuId];
        if (!sku) return prev;
        return {
          ...prev,
          [targetSkuId]: {
            ...sku,
            backroomQty: Math.max(0, sku.backroomQty - restockedUnits),
          },
        };
      });
      showToast(`Restocked ${slotCoord} (+${restockedUnits} units from walk-in).`);
    }
  };

  const handleApplySlotAi = (doorId: string, slotId: string) => {
    let appliedGain = 0;
    let newSkuName = '';

    updateActiveStore((store) => ({
      ...store,
      insights: store.insights.map((ins) =>
        ins.slotId === slotId ? { ...ins, status: 'applied' } : ins
      ),
      doors: store.doors.map((door) => {
        if (door.id !== doorId) return door;
        return {
          ...door,
          shelves: door.shelves.map((shelf) =>
            shelf.map((s) => {
              if (s.id !== slotId || !s.aiRecommendation || s.aiRecommendation.applied) {
                return s;
              }
              const nextSkuId = s.aiRecommendation.targetSkuId;
              appliedGain = s.aiRecommendation.weeklyDollarGain;
              newSkuName = skuCatalog[nextSkuId]?.shortName ?? nextSkuId;
              return {
                ...s,
                skuId: nextSkuId,
                plannedSkuId: nextSkuId,
                currentDepth: s.maxDepth,
                status: 'optimal',
                aiRecommendation: { ...s.aiRecommendation, applied: true },
              };
            })
          ),
        };
      }),
    }));

    if (appliedGain > 0) {
      showToast(`AI Swap applied: ${newSkuName} (+$${appliedGain}/wk projected).`);
    }
  };

  const handleFixViolation = (doorId: string, slotId: string) => {
    let fixedCoord = '';
    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((door) => {
        if (door.id !== doorId) return door;
        return {
          ...door,
          shelves: door.shelves.map((shelf) =>
            shelf.map((s) => {
              if (s.id !== slotId) return s;
              fixedCoord = s.coord;
              return {
                ...s,
                skuId: s.plannedSkuId,
                currentDepth: s.maxDepth,
                status: 'optimal',
              };
            })
          ),
        };
      }),
    }));
    if (fixedCoord) {
      showToast(`Restored compliant planogram SKU at ${fixedCoord}.`);
    }
  };

  const handleOptimizeDoor = (doorId: string) => {
    let swaps = 0;
    let totalGain = 0;
    const appliedSlotIds = new Set<string>();

    updateActiveStore((store) => {
      const nextDoors = store.doors.map((door) => {
        if (door.id !== doorId) return door;
        return {
          ...door,
          shelves: door.shelves.map((shelf) =>
            shelf.map((s) => {
              if (!s.aiRecommendation || s.aiRecommendation.applied) return s;
              swaps++;
              totalGain += s.aiRecommendation.weeklyDollarGain;
              appliedSlotIds.add(s.id);
              const nextSkuId = s.aiRecommendation.targetSkuId;
              return {
                ...s,
                skuId: nextSkuId,
                plannedSkuId: nextSkuId,
                currentDepth: s.maxDepth,
                status: 'optimal' as const,
                aiRecommendation: { ...s.aiRecommendation, applied: true },
              };
            })
          ),
        };
      });

      return {
        ...store,
        doors: nextDoors,
        insights: store.insights.map((ins) =>
          appliedSlotIds.has(ins.slotId) ? { ...ins, status: 'applied' as const } : ins
        ),
      };
    });

    if (swaps > 0) {
      showToast(`Optimized ${swaps} facings (+$${totalGain}/wk projected revenue).`);
    }
  };

  const handleRestockAllDoorOos = (doorId: string) => {
    let filledCount = 0;
    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((door) => {
        if (door.id !== doorId) return door;
        return {
          ...door,
          lastAuditAt: 'Just now',
          shelves: door.shelves.map((shelf) =>
            shelf.map((s) => {
              if (s.currentDepth > 0 && s.status !== 'violation') return s;
              filledCount++;
              return {
                ...s,
                skuId: s.plannedSkuId,
                currentDepth: s.maxDepth,
                status: 'optimal',
              };
            })
          ),
        };
      }),
    }));
    if (filledCount > 0) {
      showToast(`Filled ${filledCount} OOS/misplaced facings on cooler door.`);
    }
  };

  const handleRunAudit = (doorId: string) => {
    const door = doors.find((d) => d.id === doorId);
    if (!door) return;
    const metrics = getDoorMetrics(door);
    const newRecord: AuditRecord = {
      id: `aud-${Date.now()}`,
      doorId: door.id,
      doorLabel: door.label,
      timestamp: 'Just now',
      compliancePct: metrics.compliancePct,
      facingsDetected: metrics.totalFacings - metrics.oosCount,
      totalFacings: metrics.totalFacings,
      oosCount: metrics.oosCount,
      aiConfidence: 98.1,
      status: 'verified',
      summary:
        metrics.oosCount > 0
          ? `${metrics.oosCount} OOS gaps detected via optical scan; queued for pull.`
          : '100% shelf facing presence verified by KoolerIQ Vision.',
    };
    updateActiveStore((store) => ({
      ...store,
      audits: [newRecord, ...store.audits],
      doors: store.doors.map((d) =>
        d.id === doorId ? { ...d, lastAuditAt: 'Just now' } : d
      ),
    }));
    markOnboardingStep('audit');
    appendAuditLog(
      'shelf-audit',
      metrics.oosCount > 0 ? 'warning' : 'success',
      `Optical Audit Verified · Door ${door.number}`,
      `${metrics.compliancePct.toFixed(1)}% compliant (${metrics.totalFacings - metrics.oosCount}/${metrics.totalFacings} facings active, ${metrics.oosCount} OOS).`,
      door.label
    );
    pushNotification(
      'audit',
      metrics.oosCount > 0 ? 'warning' : 'success',
      `Door ${door.number} Audit Completed`,
      `${metrics.compliancePct.toFixed(1)}% compliant · ${metrics.oosCount} empty facings flagged.`,
      'scan',
      door.id
    );
  };

  const handleApplyInsight = (insightId: string) => {
    const ins = insights.find((i) => i.id === insightId);
    if (!ins || ins.status === 'applied') return;
    handleApplySlotAi(ins.doorId, ins.slotId);
  };

  const handleDismissInsight = (insightId: string) => {
    updateActiveStore((store) => ({
      ...store,
      insights: store.insights.map((ins) =>
        ins.id === insightId ? { ...ins, status: 'dismissed' } : ins
      ),
    }));
    showToast('Recommendation dismissed.');
  };

  const handlePullSkuToFloor = (skuId: string) => {
    let pulled = 0;
    const available = skuCatalog[skuId]?.backroomQty ?? 0;
    if (available <= 0) return;

    let remaining = available;
    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((door) => ({
        ...door,
        shelves: door.shelves.map((shelf) =>
          shelf.map((s) => {
            if (s.skuId !== skuId || s.currentDepth >= s.maxDepth || remaining <= 0) {
              return s;
            }
            const needed = s.maxDepth - s.currentDepth;
            const add = Math.min(needed, remaining);
            remaining -= add;
            pulled += add;
            const nextDepth = s.currentDepth + add;
            return {
              ...s,
              currentDepth: nextDepth,
              status: recomputeSlotStatus(
                s.skuId,
                s.plannedSkuId,
                nextDepth,
                s.maxDepth,
                store.settings.lowStockThresholdPct
              ),
            };
          })
        ),
      })),
    }));

    if (pulled > 0) {
      const updatedSku: SkuItem = {
        ...skuCatalog[skuId],
        backroomQty: Math.max(0, skuCatalog[skuId].backroomQty - pulled),
      };
      setSkuCatalog((prev) => ({
        ...prev,
        [skuId]: updatedSku,
      }));
      if (authUser && firestoreReadyRef.current) {
        void upsertCustomSkuInFirestore(
          authUser.uid,
          updatedSku,
          createdAtCacheRef.current.customSkus[skuId]
        );
      }
      showToast(`Pulled ${pulled} units of ${skuCatalog[skuId].shortName} to cooler floor.`);
    }
  };

  const handleOrderBackroomCase = (skuId: string) => {
    const target = skuCatalog[skuId];
    if (!target) return;
    const caseUnits = target.unitsPerCase ?? 12;
    const costLabel =
      typeof target.netCaseCost === 'number' && target.netCaseCost > 0
        ? ` · $${target.netCaseCost.toFixed(2)} net`
        : '';
    const updatedSku: SkuItem = {
      ...target,
      backroomQty: target.backroomQty + caseUnits,
    };
    setSkuCatalog((prev) => ({
      ...prev,
      [skuId]: updatedSku,
    }));
    if (authUser && firestoreReadyRef.current) {
      void upsertCustomSkuInFirestore(
        authUser.uid,
        updatedSku,
        createdAtCacheRef.current.customSkus[skuId]
      );
    }
    appendAuditLog(
      'inventory',
      'info',
      'Backroom Case Ordered',
      `Added +1 case (${caseUnits} units${costLabel}) of ${target.name} to walk-in backstock.`
    );
    showToast(`Added +1 case (${caseUnits} units${costLabel}) of ${target.shortName} to walk-in.`);
  };

  const handleBatchRestockOos = () => {
    let filledSlots = 0;
    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((door) => ({
        ...door,
        shelves: door.shelves.map((shelf) =>
          shelf.map((s) => {
            if (s.currentDepth > 0) return s;
            filledSlots++;
            return {
              ...s,
              currentDepth: s.maxDepth,
              status: recomputeSlotStatus(
                s.skuId,
                s.plannedSkuId,
                s.maxDepth,
                s.maxDepth,
                store.settings.lowStockThresholdPct
              ),
            };
          })
        ),
      })),
    }));
    if (filledSlots > 0) {
      appendAuditLog(
        'inventory',
        'success',
        'Batch OOS Floor Restock',
        `Restocked ${filledSlots} empty cooler facings across ${doors.length} doors.`
      );
      pushNotification(
        'stock',
        'success',
        'Batch Restock Completed',
        `Filled ${filledSlots} empty cooler facings in ${settings.storeName}.`,
        'dashboard'
      );
      showToast(`Completed batch pull: restocked ${filledSlots} empty cooler facings.`);
    }
  };

  const handleSubmitDistributorOrder = (payload: {
    lines: DistributorOrderLine[];
    receiveImmediately: boolean;
  }) => {
    if (payload.lines.length === 0) return;
    const totalCases = payload.lines.reduce((acc, l) => acc + l.cases, 0);
    const totalUnits = payload.lines.reduce((acc, l) => acc + l.cases * l.unitsPerCase, 0);
    const totalWholesaleCost = payload.lines.reduce(
      (acc, l) => acc + l.cases * l.netCaseCost,
      0
    );
    const distributors = Array.from(new Set(payload.lines.map((l) => l.distributor)));
    const poNumber = `PO-${settings.storeCode}-${String(orders.length + 101)}`;

    if (payload.receiveImmediately) {
      setSkuCatalog((prev) => {
        const next = { ...prev };
        payload.lines.forEach((line) => {
          const current = next[line.skuId];
          if (current) {
            next[line.skuId] = {
              ...current,
              backroomQty: current.backroomQty + line.cases * line.unitsPerCase,
            };
          }
        });
        return next;
      });
    }

    const record: DistributorOrderRecord = {
      id: sanitizeDocId(`ord-${Date.now()}`, 'ord'),
      poNumber,
      createdAtIso: new Date().toISOString(),
      storeName: settings.storeName,
      distributorSummary: distributors.join(' + '),
      totalCases,
      totalUnits,
      totalWholesaleCost,
      status: payload.receiveImmediately ? 'received' : 'submitted',
      lines: payload.lines,
    };

    setOrders((prev) => [record, ...prev].slice(0, 40));
    if (authUser && firestoreReadyRef.current) {
      void createOrderInFirestore(authUser.uid, record);
      if (payload.receiveImmediately) {
        payload.lines.forEach((line) => {
          const current = skuCatalog[line.skuId];
          if (current) {
            const updatedSku: SkuItem = {
              ...current,
              backroomQty: current.backroomQty + line.cases * line.unitsPerCase,
            };
            void upsertCustomSkuInFirestore(
              authUser.uid,
              updatedSku,
              createdAtCacheRef.current.customSkus[updatedSku.id]
            );
          }
        });
      }
    }
    appendAuditLog(
      'inventory',
      'success',
      `Submitted ${poNumber} (${totalCases} Cases)`,
      `${distributors.join(', ')} · ${totalUnits} units ($${totalWholesaleCost.toFixed(2)} net)${
        payload.receiveImmediately ? ' received into walk-in.' : ' queued for delivery.'
      }`
    );
    pushNotification(
      'stock',
      'success',
      `${poNumber} ${payload.receiveImmediately ? 'Received' : 'Submitted'}`,
      `${totalCases} cases (${totalUnits} units) · $${totalWholesaleCost.toFixed(2)} net wholesale.`,
      'orders'
    );
    showToast(
      `${poNumber}: ${totalCases} cases ($${totalWholesaleCost.toFixed(2)}) ${
        payload.receiveImmediately ? 'received to walk-in.' : 'submitted.'
      }`
    );
  };

  const handleApplyAiPlatformRecommendation = (
    doorId: string,
    slotCoord: string,
    recommendedSkuId: string,
    weeklyDollarGain: number
  ): boolean => {
    const resolvedSku =
      skuCatalog[recommendedSkuId] ||
      Object.values(skuCatalog).find(
        (s) =>
          s.id.toLowerCase() === recommendedSkuId.toLowerCase() ||
          s.skuCode.toLowerCase() === recommendedSkuId.toLowerCase() ||
          s.name.toLowerCase() === recommendedSkuId.toLowerCase()
      );
    if (!resolvedSku) {
      showToast('Recommended SKU was not found in the active catalog.');
      return false;
    }

    const targetDoor = doors.find((d) => d.id === doorId) ?? doors[0];
    if (!targetDoor) return false;
    const normalizedCoord = slotCoord.trim().toUpperCase();
    const targetSlot = targetDoor.shelves
      .flat()
      .find((s) => s.coord.toUpperCase() === normalizedCoord);
    if (!targetSlot) {
      showToast(`Facing ${slotCoord} was not found on Door ${targetDoor.number}.`);
      return false;
    }

    updateActiveStore((store) => ({
      ...store,
      carriedSkuIds: store.carriedSkuIds.includes(resolvedSku.id)
        ? store.carriedSkuIds
        : [...store.carriedSkuIds, resolvedSku.id],
      doors: store.doors.map((d) => {
        if (d.id !== targetDoor.id) return d;
        return {
          ...d,
          shelves: d.shelves.map((shelf) =>
            shelf.map((s) =>
              s.id === targetSlot.id
                ? {
                    ...s,
                    skuId: resolvedSku.id,
                    plannedSkuId: resolvedSku.id,
                    currentDepth: s.maxDepth,
                    status: 'optimal',
                  }
                : s
            )
          ),
        };
      }),
    }));

    setSelectedDoorId(targetDoor.id);
    appendAuditLog(
      'planogram',
      'success',
      `Applied AI Platform Action · Door ${targetDoor.number} ${targetSlot.coord}`,
      `Assigned ${resolvedSku.name} (+$${Number(weeklyDollarGain || 0).toFixed(0)}/wk projected).`,
      targetDoor.label
    );
    showToast(
      `Updated Door ${targetDoor.number} ${targetSlot.coord} → ${resolvedSku.shortName}`
    );
    return true;
  };

  const handleRecordVisionAudit = (
    doorId: string,
    summary: string,
    compliancePct: number,
    oosCount: number
  ) => {
    const door = doors.find((d) => d.id === doorId) ?? doors[0];
    if (!door) return;
    const totalFacings = door.shelves.flat().length;
    const detected = Math.max(0, totalFacings - Math.max(0, oosCount));
    const record: AuditRecord = {
      id: `aud-vis-${Date.now()}`,
      doorId: door.id,
      doorLabel: door.label,
      timestamp: 'Just now',
      compliancePct: Math.max(0, Math.min(100, compliancePct)),
      facingsDetected: detected,
      totalFacings,
      oosCount: Math.max(0, oosCount),
      aiConfidence: 96.4,
      status: 'verified',
      summary,
    };

    updateActiveStore((store) => ({
      ...store,
      audits: [record, ...store.audits],
      doors: store.doors.map((d) =>
        d.id === door.id ? { ...d, lastAuditAt: 'Just now' } : d
      ),
    }));
    markOnboardingStep('audit');
    appendAuditLog(
      'shelf-audit',
      oosCount > 0 ? 'warning' : 'success',
      `AI Vision Audit Logged · Door ${door.number}`,
      summary,
      door.label
    );
    pushNotification(
      'audit',
      oosCount > 0 ? 'warning' : 'success',
      `AI Vision Audit · Door ${door.number}`,
      `${compliancePct.toFixed(0)}% full · ${oosCount} OOS gaps observed.`,
      'reports',
      door.id
    );
  };

  const handleUpdateDoorTargetTemp = (doorId: string, deltaF: number) => {
    const targetDoor = doors.find((d) => d.id === doorId);
    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((d) =>
        d.id === doorId
          ? {
              ...d,
              targetTempF: Math.max(32, Math.min(40, Number((d.targetTempF + deltaF).toFixed(1)))),
            }
          : d
      ),
    }));
    if (targetDoor) {
      appendAuditLog(
        'cold-chain',
        'info',
        'Adjusted Door Target Temperature',
        `Changed ${targetDoor.label} setpoint by ${deltaF > 0 ? `+${deltaF}` : deltaF}°F.`,
        targetDoor.label
      );
    }
  };

  const handleUpdateSettings = (patch: Partial<StoreSettings>) => {
    updateActiveStore((store) => ({
      ...store,
      settings: { ...store.settings, ...patch },
    }));
    appendAuditLog(
      'cold-chain',
      'info',
      'Updated Store Thresholds',
      `Updated store settings (${Object.keys(patch).join(', ')}).`
    );
  };

  const handleExportCsv = () => {
    const header =
      'Store,Door,Slot,SKU Code,UPC,Distributor,Category,SKU Name,Depth,Max Depth,Status,Units/Case,Net Unit Cost,Net Case Cost,Retail Price,Est Margin %\n';
    const rows = doors
      .flatMap((door) =>
        door.shelves.flat().map((s) => {
          const sku = skuCatalog[s.skuId] ?? Object.values(skuCatalog)[0];
          return [
            `"${settings.storeName}"`,
            `Door ${door.number}`,
            s.coord,
            sku.skuCode,
            sku.upc ?? '',
            `"${sku.distributor ?? 'Direct'}"`,
            `"${sku.category ?? sku.brandLabel}"`,
            `"${sku.name}"`,
            s.currentDepth,
            s.maxDepth,
            s.status,
            sku.unitsPerCase ?? 12,
            typeof sku.netUnitCost === 'number' ? sku.netUnitCost.toFixed(2) : '',
            typeof sku.netCaseCost === 'number' ? sku.netCaseCost.toFixed(2) : '',
            sku.price.toFixed(2),
            sku.marginPct.toFixed(1),
          ].join(',');
        })
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kooleriq-planogram-${settings.storeCode.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    appendAuditLog(
      'csv',
      'info',
      'Exported Planogram CSV',
      `Downloaded planogram & wholesale cost report for ${settings.storeName}.`
    );
    showToast('Downloaded planogram & wholesale cost CSV report.');
  };

  const handleResetDemo = () => {
    const fresh = cloneStores(INITIAL_STORES);
    setStores(fresh);
    setActiveStoreId(fresh[0].id);
    setSelectedDoorId(fresh[0].doors[0].id);
    const base = cloneCatalog(SKU_CATALOG);
    setSkuCatalog(csvTextRef.current ? parseBeverageCsv(csvTextRef.current, base) : base);
    setOnboarding({ ...DEFAULT_ONBOARDING });
    setAuditLog(buildInitialAuditLog());
    setNotifications(buildInitialNotifications());
    showToast('Reset all stores and layouts to baseline.');
  };

  const handleApplyImportedCatalog = (payload: {
    nextCatalog: Record<string, SkuItem>;
    newSkuIds: string[];
    carryImportedInStore: boolean;
    sourceLabel: string;
    totalRows: number;
  }) => {
    setSkuCatalog(payload.nextCatalog);
    if (payload.carryImportedInStore && payload.newSkuIds.length > 0) {
      updateActiveStore((store) => ({
        ...store,
        carriedSkuIds: Array.from(new Set([...store.carriedSkuIds, ...payload.newSkuIds])),
      }));
    }
    if (authUser && firestoreReadyRef.current && payload.newSkuIds.length > 0) {
      payload.newSkuIds.slice(0, 50).forEach((id) => {
        const sku = payload.nextCatalog[id];
        if (sku) {
          void upsertCustomSkuInFirestore(
            authUser.uid,
            sku,
            createdAtCacheRef.current.customSkus[id]
          );
        }
      });
    }
    markOnboardingStep('assortment');
    appendAuditLog(
      'csv',
      'success',
      'Imported Beverage CSV Catalog',
      `Processed ${payload.totalRows} rows from ${payload.sourceLabel} (${payload.newSkuIds.length} new SKUs).`
    );
    pushNotification(
      'system',
      'success',
      'CSV Catalog Imported',
      `${payload.totalRows} rows synced from ${payload.sourceLabel}.`,
      'inventory'
    );
    showToast(`Imported ${payload.totalRows} CSV rows from ${payload.sourceLabel}.`);
  };

  const handleSaveAuditFrameToLibrary = (door: CoolerDoor, dataUrl: string) => {
    const metrics = getDoorMetrics(door);
    const asset: ImageAsset = {
      id: sanitizeDocId(`img-cap-${Date.now()}`, 'asset'),
      title: `${settings.storeCode} · Door ${door.number} Frame`,
      category: 'cooler-capture',
      url: dataUrl,
      createdAtIso: new Date().toISOString(),
      storeName: settings.storeName,
      doorId: door.id,
      doorLabel: door.label,
      tags: ['audit', `door-${door.number}`, `${metrics.compliancePct.toFixed(0)}pct`],
    };
    setImageAssets((prev) => [asset, ...prev].slice(0, 40));
    if (authUser && firestoreReadyRef.current) {
      void saveMediaAssetToFirestore(authUser.uid, asset);
    }
    appendAuditLog(
      'media',
      'success',
      'Saved Cooler Frame to Image Library',
      `Captured optical frame for ${door.label} (${metrics.compliancePct.toFixed(1)}% compliant).`,
      door.label
    );
    showToast(`Saved Door ${door.number} snapshot to Image Library.`);
  };

  const handleAssignImageToSku = (skuId: string, url: string) => {
    const sku = skuCatalog[skuId];
    if (!sku) return;
    const updatedSku: SkuItem = { ...sku, imageUrl: url };
    setSkuCatalog((prev) => ({
      ...prev,
      [skuId]: updatedSku,
    }));
    if (authUser && firestoreReadyRef.current) {
      void upsertCustomSkuInFirestore(
        authUser.uid,
        updatedSku,
        createdAtCacheRef.current.customSkus[skuId]
      );
    }
    appendAuditLog(
      'media',
      'info',
      'Updated Product Pack Image',
      `Attached Image Library photo to ${sku.name}.`
    );
    showToast(`Attached photo to ${sku.shortName}.`);
  };

  const handleAssignImageToDoor = (doorId: string, url: string) => {
    const target = doors.find((d) => d.id === doorId);
    updateActiveStore((store) => ({
      ...store,
      doors: store.doors.map((d) => (d.id === doorId ? { ...d, photoUrl: url } : d)),
    }));
    appendAuditLog(
      'media',
      'info',
      'Updated Cooler Door Reference Image',
      `Attached Image Library frame to ${target?.label || 'cooler door'}.`,
      target?.label
    );
    showToast(`Attached reference frame to ${target?.label || 'cooler door'}.`);
  };

  const handleApplyOnboarding = (payload: {
    operatorRole: OperatorRole;
    storeName: string;
    storeCode: string;
    address: string;
    routeId: string;
    tempUnit: 'F' | 'C';
    layoutChoice: 'keep' | 'bodega-2' | 'cstore-4' | 'plaza-6' | 'custom';
    customDoors: number;
    customShelves: number;
    customFacings: number;
    hardwareType: DoorHardwareType;
    distributorMix: 'keep' | 'swire' | 'pepsico' | 'energy-craft' | 'all-157';
    completedSteps: string[];
    markCompleted: boolean;
  }) => {
    const allItems = Object.values(skuCatalog);
    let nextCarriedSkuIds = activeStore.carriedSkuIds;

    if (payload.distributorMix === 'all-157') {
      nextCarriedSkuIds = allItems.map((s) => s.id);
    } else if (payload.distributorMix === 'swire') {
      nextCarriedSkuIds = allItems
        .filter((s) => s.distributor === 'Swire Coca-Cola' || !s.distributor)
        .map((s) => s.id);
    } else if (payload.distributorMix === 'pepsico') {
      nextCarriedSkuIds = allItems
        .filter((s) => s.distributor === 'PepsiCo' || !s.distributor)
        .map((s) => s.id);
    } else if (payload.distributorMix === 'energy-craft') {
      nextCarriedSkuIds = allItems
        .filter((s) => {
          const cat = (s.category || '').toLowerCase();
          return (
            cat.includes('energy') ||
            cat.includes('protein') ||
            cat.includes('tea') ||
            ['monster', 'celsius', 'redbull', 'reign', 'alani', 'rockstar', 'bang', 'nos', 'core-power', 'starbucks', 'yerba-mate'].includes(
              s.brand
            )
          );
        })
        .map((s) => s.id);
    }

    const skuPool =
      nextCarriedSkuIds.length > 0 ? nextCarriedSkuIds : Object.keys(skuCatalog);

    let nextDoors = activeStore.doors;
    let nextTemplate = activeStore.layoutTemplate;
    const stamp = Date.now();

    if (payload.layoutChoice === 'bodega-2') {
      nextTemplate = '2-Door Slim & Mini';
      nextDoors = [
        buildCustomDoor({
          id: `${activeStore.id}-ob-${stamp}-1`,
          number: '01',
          label: 'Door 01 · Craft & Energy Slim',
          category: 'Slim Reach-In',
          hardwareType: 'slim-reach-in',
          shelvesCount: 5,
          facingsPerShelf: 4,
          defaultMaxDepth: 5,
          skuPool,
        }),
        buildCustomDoor({
          id: `${activeStore.id}-ob-${stamp}-2`,
          number: '02',
          label: 'Door 02 · Countertop Grab-n-Go',
          category: 'Countertop Mini',
          hardwareType: 'countertop-mini',
          shelvesCount: 4,
          facingsPerShelf: 4,
          defaultMaxDepth: 4,
          skuPool: skuPool.slice().reverse(),
        }),
      ];
    } else if (payload.layoutChoice === 'cstore-4') {
      nextTemplate = '4-Door C-Store Standard';
      nextDoors = Array.from({ length: 4 }).map((_, idx) =>
        buildCustomDoor({
          id: `${activeStore.id}-ob-${stamp}-${idx + 1}`,
          number: String(idx + 1).padStart(2, '0'),
          label: `Door 0${idx + 1} · Beverage Bay ${idx + 1}`,
          category:
            idx === 0
              ? 'Energy'
              : idx === 1
                ? 'CSD & Fizz'
                : idx === 2
                  ? 'Hydration'
                  : 'Cold Brew & Craft',
          hardwareType: 'standard-glass',
          shelvesCount: 5,
          facingsPerShelf: 6,
          defaultMaxDepth: 6,
          skuPool: skuPool.slice(idx * 2).concat(skuPool.slice(0, idx * 2)),
        })
      );
    } else if (payload.layoutChoice === 'plaza-6') {
      nextTemplate = '6-Door Travel Plaza';
      nextDoors = Array.from({ length: 6 }).map((_, idx) =>
        buildCustomDoor({
          id: `${activeStore.id}-ob-${stamp}-${idx + 1}`,
          number: String(idx + 1).padStart(2, '0'),
          label:
            idx === 0
              ? 'Bay 01 · Open Air Curtain'
              : idx === 5
                ? 'Bay 06 · Walk-In Cave'
                : `Door 0${idx + 1} · Plaza Cooler`,
          category:
            idx === 0
              ? 'High-Turn Air Curtain'
              : idx === 5
                ? 'Walk-In Cave'
                : 'Highway Beverage',
          hardwareType:
            idx === 0 ? 'wide-air-curtain' : idx === 5 ? 'walk-in-cave' : 'standard-glass',
          shelvesCount: idx === 5 ? 4 : 5,
          facingsPerShelf: idx === 0 ? 8 : 6,
          defaultMaxDepth: idx === 0 || idx === 5 ? 8 : 6,
          skuPool: skuPool.slice(idx).concat(skuPool.slice(0, idx)),
        })
      );
    } else if (payload.layoutChoice === 'custom') {
      nextTemplate = `${payload.customDoors}-Door Custom (${payload.customShelves}×${payload.customFacings})`;
      nextDoors = Array.from({ length: payload.customDoors }).map((_, idx) =>
        buildCustomDoor({
          id: `${activeStore.id}-ob-${stamp}-${idx + 1}`,
          number: String(idx + 1).padStart(2, '0'),
          label: `Door ${String(idx + 1).padStart(2, '0')} · Custom Bay`,
          category: 'Custom Assortment',
          hardwareType: payload.hardwareType,
          shelvesCount: payload.customShelves,
          facingsPerShelf: payload.customFacings,
          defaultMaxDepth: 6,
          skuPool: skuPool.slice(idx).concat(skuPool.slice(0, idx)),
        })
      );
    }

    const placedSkuIds = nextDoors.flatMap((d) =>
      d.shelves.flat().map((s) => s.skuId)
    );
    const mergedCarried = Array.from(new Set([...nextCarriedSkuIds, ...placedSkuIds]));

    updateActiveStore((store) => ({
      ...store,
      layoutTemplate: nextTemplate,
      doors: nextDoors,
      carriedSkuIds: mergedCarried,
      settings: {
        ...store.settings,
        storeName: payload.storeName,
        storeCode: payload.storeCode,
        address: payload.address,
        routeId: payload.routeId,
        tempUnit: payload.tempUnit,
      },
    }));

    if (payload.layoutChoice !== 'keep' && nextDoors[0]) {
      setSelectedDoorId(nextDoors[0].id);
    }

    setOnboarding((prev) => ({
      ...prev,
      operatorRole: payload.operatorRole,
      completedSteps: Array.from(new Set([...prev.completedSteps, ...payload.completedSteps])),
      completed: prev.completed || payload.markCompleted,
    }));

    showToast(
      payload.markCompleted
        ? `Saved onboarding setup for ${payload.storeName}.`
        : 'Saved onboarding progress.'
    );
  };

  const handleOnboardingQuickAction = (stepId: string) => {
    if (stepId === 'profile') {
      setOnboardingStep(1);
      setOnboardingOpen(true);
    } else if (stepId === 'layout') {
      setOnboardingStep(2);
      setOnboardingOpen(true);
    } else if (stepId === 'assortment') {
      setOnboardingStep(3);
      setOnboardingOpen(true);
    } else if (stepId === 'camera') {
      setOnboardingStep(4);
      setOnboardingOpen(true);
    } else if (stepId === 'audit') {
      setActiveTab('scan');
    } else if (stepId === 'sync') {
      if (!authUser) {
        handleGoogleSignIn();
      } else {
        setOnboardingStep(4);
        setOnboardingOpen(true);
      }
    }
  };

  const openScannerWithPreset = (
    mode: 'camera' | 'upload' | 'manual' | 'labels' = 'camera',
    pref: ScanModePreference = 'auto'
  ) => {
    setScannerTargetSlot(null);
    setScannerInitialMode(mode);
    setScannerInitialPreference(pref);
    setScannerOpen(true);
  };

  // 5-Action Navigation Model with Scan as the Centerpiece
  const desktopNavItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'scan', label: 'Scan' },
    { id: 'orders', label: 'Orders' },
    { id: 'reports', label: 'Reports' },
  ];

  const mobileNavItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'scan', label: 'Scan', icon: ScanBarcode },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const pageTitleMap: Record<NavTab, string> = {
    dashboard: 'Cooler Planogram Dashboard',
    inventory: 'Walk-In & Floor Inventory',
    scan: 'Optical Shelf & Barcode Scan Hub',
    orders: 'Distributor Orders & Replenishment',
    reports: 'AI Insights, Audits & Reports',
    settings: 'Store & Cooler Settings',
  };

  const planDisplayName =
    subscription.planTier === 'enterprise'
      ? 'Enterprise Fleet'
      : subscription.planTier === 'pro'
        ? 'Pro Operator'
        : 'Starter';

  const lockedTabs = useMemo<ReadonlySet<NavTab>>(
    () => new Set<NavTab>(['dashboard', 'inventory', 'scan', 'orders', 'reports']),
    []
  );
  const isWorkspaceLocked = !authUser && lockedTabs.has(activeTab);

  const requireSignedInAction = useCallback(
    (fn: () => void) => {
      if (!authUser) {
        showToast('Sign in with Google to unlock KoolerIQ workspace tools.');
        void handleGoogleSignIn();
        return;
      }
      fn();
    },
    [authUser, showToast]
  );

  if (fatalBoundaryError) {
    throw fatalBoundaryError;
  }

  return (
    <div className="min-h-screen bg-[var(--kq-canvas)] text-[var(--kq-text)] flex flex-col">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 h-14 lg:h-16 bg-[var(--kq-header)] backdrop-blur-md border-b border-[var(--kq-border)]">
        <div className="max-w-[1440px] mx-auto h-full px-4 lg:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 focus-visible:outline-none"
            aria-label="KoolerIQ Home"
          >
            <KoolerIQLogo size={30} showWordmark />
          </button>

          <nav className="hidden lg:flex items-center gap-5" aria-label="Primary navigation">
            {desktopNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const isCenterScan = item.id === 'scan';
              const isTabLocked = !authUser && lockedTabs.has(item.id);

              if (isCenterScan) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab('scan')}
                    className={`min-h-[40px] px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                      isActive
                        ? 'bg-[var(--kq-accent)] border-[var(--kq-accent)] text-[var(--kq-accent-fg)] shadow-sm'
                        : 'bg-[var(--kq-accent-soft)] border-[var(--kq-accent-border)] text-[var(--kq-accent)] hover:bg-[var(--kq-accent)] hover:text-[var(--kq-accent-fg)]'
                    }`}
                  >
                    {isTabLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <ScanBarcode className="w-4 h-4" />
                    )}
                    {item.label}
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 px-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[var(--kq-accent)] font-semibold'
                      : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                  }`}
                >
                  {isTabLocked && <Lock className="w-3 h-3 text-[var(--kq-text-muted)]" />}
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-[var(--kq-accent)] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            {!authUser ? (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={handleGoogleSignIn}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-60 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'scan') {
                    openScannerWithPreset('camera', 'auto');
                  } else {
                    setActiveTab('scan');
                  }
                }}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ScanBarcode className="w-4 h-4" />
                {activeTab === 'scan' ? 'Quick Barcode / QR' : 'Start Scan'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-6 pt-5 pb-24 lg:pb-10">
        {/* Store Switcher & Operator Utility Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-5 pb-4 border-b border-[var(--kq-border)]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-[var(--kq-text)]">
                {pageTitleMap[activeTab]}
              </h1>
            </div>

            <div className="text-xs text-[var(--kq-text-muted)] flex flex-wrap items-center gap-2">
              {authUser ? (
                <>
                  <span className="font-mono-tabular text-[var(--kq-text-secondary)]">
                    {activeStore.layoutTemplate}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-[var(--kq-accent)] font-medium">
                    {doors.length} cooler doors
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-[var(--kq-emerald)] font-medium">
                    {planDisplayName} · Firestore Synced
                  </span>
                </>
              ) : (
                <span className="font-mono-tabular text-[var(--kq-text-secondary)] inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Dashboard, Inventory, Scan Hub, Orders &amp; Reports locked until Google Sign-In
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-[var(--kq-text-secondary)]">
                www.kooleriq.com
              </span>
            </div>
          </div>

          {/* Store Selector + Copilot + Theme + Settings + Auth */}
          <div className="flex items-center gap-2 flex-wrap">
            {authUser && (
              <>
                {/* Multi-Store Switcher */}
                <div className="flex items-center gap-1.5 bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] rounded-lg px-2.5 min-h-[40px]">
                  <Store className="w-3.5 h-3.5 text-[var(--kq-accent)] shrink-0" />
                  <select
                    value={activeStore.id}
                    onChange={(e) => handleSwitchStore(e.target.value)}
                    aria-label="Select store location"
                    className="bg-transparent text-xs font-semibold text-[var(--kq-text)] focus:outline-none py-2 pr-1 max-w-[200px]"
                  >
                    {stores.map((st) => (
                      <option
                        key={st.id}
                        value={st.id}
                        className="bg-[var(--kq-surface)] text-[var(--kq-text)]"
                      >
                        {st.settings.storeName} ({st.doors.length}D)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => requireSignedInAction(() => setCreateStoreOpen(true))}
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  New Store
                </button>

                <button
                  type="button"
                  onClick={() =>
                    requireSignedInAction(() => {
                      setScannerTargetSlot(null);
                      setScannerOpen(true);
                    })
                  }
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:bg-[var(--kq-accent-soft)] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ScanBarcode className="w-4 h-4" />
                  Scan UPC / QR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    window.setTimeout(() => {
                      document
                        .getElementById('ai-platform-section')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 60);
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:bg-[var(--kq-accent-soft)] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  AI Platform
                </button>

                <button
                  type="button"
                  onClick={() => requireSignedInAction(() => setChatOpen(true))}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Bot className="w-4 h-4" />
                  AI Copilot
                </button>

                <button
                  type="button"
                  onClick={() => requireSignedInAction(() => setAuditLogOpen(true))}
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:border-[var(--kq-accent)] transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                  title="Open Compliance & Operator Audit Log"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Audit Log
                </button>

                <button
                  type="button"
                  onClick={() =>
                    requireSignedInAction(() => {
                      setImageLibraryMode('manage');
                      setImageLibraryOpen(true);
                    })
                  }
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:border-[var(--kq-accent)] transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                  title="Open Cooler & Product Image Library"
                >
                  <Images className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Media
                </button>

                <button
                  type="button"
                  onClick={() => requireSignedInAction(() => setNotificationsOpen(true))}
                  className="relative min-h-[40px] px-3 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:border-[var(--kq-accent)] transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                  aria-label="Open Notification Center"
                  title="Notification Center"
                >
                  <Bell className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  <span className="hidden sm:inline">Alerts</span>
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="font-mono-tabular text-[11px] font-bold text-[var(--kq-crimson)]">
                      ({notifications.filter((n) => !n.read).length})
                    </span>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className="min-h-[40px] min-w-[40px] px-2.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:border-[var(--kq-accent)] transition-colors flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} color theme`}
              title={theme === 'light' ? 'Switch to Obsidian Dark' : 'Switch to Nordic Frost'}
            >
              {theme === 'light' ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-[var(--kq-amber)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-[var(--kq-surface-elevated)] border-[var(--kq-accent)] text-[var(--kq-text)] font-semibold'
                  : 'bg-[var(--kq-surface)] border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              Settings
            </button>

            {authLoading ? null : authUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-crimson)] transition-colors flex items-center gap-2 whitespace-nowrap max-w-[200px]"
                title={`Signed in as ${authUser.email}`}
              >
                <span className="truncate">{authUser.email}</span>
                <LogOut className="w-3.5 h-3.5 text-[var(--kq-text-muted)] shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={handleGoogleSignIn}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {authUser && (
          <OnboardingChecklistBanner
            onboarding={onboarding}
            isSignedIn={Boolean(authUser)}
            auditsCount={audits.length}
            cameraGranted={cameraGranted}
            onOpenWizard={(initialStep = 1) => {
              setOnboardingStep(initialStep);
              setOnboardingOpen(true);
            }}
            onDismissChecklist={() =>
              setOnboarding((prev) => ({ ...prev, dismissedChecklist: true }))
            }
            onQuickAction={handleOnboardingQuickAction}
          />
        )}

        {authError && authUser && (
          <div className="mb-4 rounded-xl bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-4 py-3 text-xs text-[var(--kq-crimson-text)] flex items-center justify-between gap-3">
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="underline font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {authLoading && lockedTabs.has(activeTab) ? (
          <div className="py-16 flex items-center justify-center">
            <div className="glacier-card rounded-xl px-6 py-5 text-xs font-mono-tabular text-[var(--kq-text-secondary)]">
              Verifying Google authentication &amp; Firestore session...
            </div>
          </div>
        ) : isWorkspaceLocked ? (
          <AuthGateScreen
            lockedTab={activeTab}
            isSigningIn={isSigningIn}
            authError={authError}
            onSignIn={handleGoogleSignIn}
            onOpenPrototype={() => setPrototypeOpen(true)}
          />
        ) : null}

        {!authLoading && authUser && activeTab === 'dashboard' && (
          <>
            <PlanogramScreen
              doors={doors}
              selectedDoorId={selectedDoorId}
              onSelectDoor={setSelectedDoorId}
              skuCatalog={skuCatalog}
              carriedSkuIds={carriedSkuIds}
              settings={settings}
              onAdjustDepth={handleAdjustDepth}
              onRestockFull={handleRestockFull}
              onAssignSlotSku={handleAssignSlotSku}
              onApplySlotAi={handleApplySlotAi}
              onFixViolation={handleFixViolation}
              onOptimizeDoor={handleOptimizeDoor}
              onRestockAllDoorOos={handleRestockAllDoorOos}
              onOpenDoorEditor={() => setDoorEditorOpen(true)}
              onOpenAddSkuModal={() => {
                setPrefillUpc('');
                setPickedSkuImageUrl('');
                setAddSkuOpen(true);
              }}
              onOpenScannerForSlot={(target) => {
                setScannerTargetSlot(target);
                setScannerInitialMode('camera');
                setScannerInitialPreference('barcode');
                setScannerOpen(true);
              }}
              onGoToAudit={() => setActiveTab('scan')}
            />

            <AiPlatformSection
              doors={doors}
              selectedDoorId={selectedDoorId}
              skuCatalog={skuCatalog}
              carriedSkuIds={carriedSkuIds}
              settings={settings}
              imageAssets={imageAssets}
              authToken={authToken}
              chatMessages={chatMessages}
              copilotError={chatError}
              onApplyRecommendedSlot={handleApplyAiPlatformRecommendation}
              onSelectDoor={(doorId) => {
                setSelectedDoorId(doorId);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onRecordVisionAudit={handleRecordVisionAudit}
              onSendCopilotMessage={handleSendChatMessage}
              onOpenCopilotDrawer={() => setChatOpen(true)}
              onGoToScanHub={() => setActiveTab('scan')}
              onGoToReports={() => setActiveTab('reports')}
            />
          </>
        )}

        {!authLoading && authUser && activeTab === 'inventory' && (
          <InventoryScreen
            doors={doors}
            skuCatalog={skuCatalog}
            carriedSkuIds={carriedSkuIds}
            settings={settings}
            onPullSkuToFloor={handlePullSkuToFloor}
            onOrderBackroomCase={handleOrderBackroomCase}
            onToggleCarriedSku={handleToggleCarriedSku}
            onOpenAddSkuModal={() => {
              setPrefillUpc('');
              setPickedSkuImageUrl('');
              setAddSkuOpen(true);
            }}
            onOpenScanner={() => openScannerWithPreset('camera', 'barcode')}
            onOpenCsvHub={() => {
              setCsvModalTab('import');
              setCsvModalOpen(true);
            }}
            onOpenImageLibrary={() => {
              setImageLibraryMode('manage');
              setImageLibraryOpen(true);
            }}
            onBatchRestockOos={handleBatchRestockOos}
          />
        )}

        {!authLoading && authUser && activeTab === 'scan' && (
          <ScanHubScreen
            doors={doors}
            selectedDoorId={selectedDoorId}
            onSelectDoor={setSelectedDoorId}
            skuCatalog={skuCatalog}
            settings={settings}
            audits={audits}
            cameraGranted={cameraGranted}
            onRunAudit={handleRunAudit}
            onSyncDoorGaps={handleRestockAllDoorOos}
            onOpenScannerPreset={openScannerWithPreset}
            onOpenAuditLog={() => setAuditLogOpen(true)}
            onOpenImageLibrary={() => {
              setImageLibraryMode('manage');
              setImageLibraryOpen(true);
            }}
            onSaveAuditFrameToLibrary={handleSaveAuditFrameToLibrary}
          />
        )}

        {!authLoading && authUser && activeTab === 'orders' && (
          <OrdersScreen
            doors={doors}
            skuCatalog={skuCatalog}
            carriedSkuIds={carriedSkuIds}
            settings={settings}
            orders={orders}
            subscription={subscription}
            isAuthenticated={Boolean(authUser)}
            isSavingPlan={isSavingPlan}
            onSubmitOrder={handleSubmitDistributorOrder}
            onSelectPlan={handleSelectPlan}
            onSignInPrompt={handleGoogleSignIn}
            onExportEventLogged={(reportName) => {
              appendAuditLog(
                'csv',
                'info',
                `Exported ${reportName}`,
                `Generated distributor PO CSV for ${settings.storeName}.`
              );
              showToast(`Downloaded ${reportName}.`);
            }}
          />
        )}

        {!authLoading && authUser && activeTab === 'reports' && (
          <ReportsScreen
            doors={doors}
            insights={insights}
            audits={audits}
            auditLog={auditLog}
            imageAssets={imageAssets}
            skuCatalog={skuCatalog}
            settings={settings}
            authToken={authToken}
            onApplyInsight={handleApplyInsight}
            onDismissInsight={handleDismissInsight}
            onPreviewDoor={(doorId) => {
              setSelectedDoorId(doorId);
              setActiveTab('dashboard');
            }}
            onOpenAuditLog={() => setAuditLogOpen(true)}
            onOpenCsvHub={(tab) => {
              setCsvModalTab(tab);
              setCsvModalOpen(true);
            }}
            onOpenImageLibrary={() => {
              setImageLibraryMode('manage');
              setImageLibraryOpen(true);
            }}
            onExportPlanogramCsv={handleExportCsv}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            doors={doors}
            onUpdateSettings={(patch) => requireSignedInAction(() => handleUpdateSettings(patch))}
            onUpdateDoorTargetTemp={(doorId, deltaF) =>
              requireSignedInAction(() => handleUpdateDoorTargetTemp(doorId, deltaF))
            }
            onExportCsv={() => requireSignedInAction(handleExportCsv)}
            onResetDemo={() => requireSignedInAction(handleResetDemo)}
            onOpenOnboarding={() =>
              requireSignedInAction(() => {
                setOnboardingStep(1);
                setOnboardingOpen(true);
              })
            }
            onOpenCsvHub={() =>
              requireSignedInAction(() => {
                setCsvModalTab('export');
                setCsvModalOpen(true);
              })
            }
            onOpenImageLibrary={() =>
              requireSignedInAction(() => {
                setImageLibraryMode('manage');
                setImageLibraryOpen(true);
              })
            }
            onOpenAuditLog={() => requireSignedInAction(() => setAuditLogOpen(true))}
            onOpenPrototype={() => setPrototypeOpen(true)}
          />
        )}
      </main>

      {/* Quiet Desktop Footer */}
      <footer className="hidden lg:block border-t border-[var(--kq-border)] py-4 px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs text-[var(--kq-text-muted)]">
          <span>KoolerIQ Cold-Chain Telemetry · www.kooleriq.com · Available on Google Play</span>
          <span>
            {settings.storeName} · Route {settings.routeId}
          </span>
        </div>
      </footer>

      {/* Store & Cooler Layout Modals */}
      <CreateStoreModal
        open={createStoreOpen}
        onClose={() => setCreateStoreOpen(false)}
        onCreateStore={handleCreateStore}
      />

      <DoorLayoutEditorModal
        open={doorEditorOpen}
        onClose={() => setDoorEditorOpen(false)}
        doors={doors}
        activeDoorId={selectedDoorId}
        onUpdateDoorLayout={handleUpdateDoorLayout}
        onAddDoor={handleAddDoor}
        onDeleteDoor={handleDeleteDoor}
      />

      <AddCustomSkuModal
        open={addSkuOpen}
        onClose={() => {
          setAddSkuOpen(false);
          setPrefillUpc('');
          setPickedSkuImageUrl('');
        }}
        onCreateSku={handleCreateCustomSku}
        initialUpc={prefillUpc}
        pickedImageUrl={pickedSkuImageUrl}
        onClearPickedImage={() => setPickedSkuImageUrl('')}
        onOpenImagePicker={() => {
          setImageLibraryMode('pick-for-sku');
          setImageLibraryOpen(true);
        }}
      />

      <BarcodeQrScannerModal
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          setScannerTargetSlot(null);
        }}
        doors={doors}
        selectedDoorId={selectedDoorId}
        skuCatalog={skuCatalog}
        carriedSkuIds={carriedSkuIds}
        settings={settings}
        targetSlotContext={scannerTargetSlot}
        initialMode={scannerInitialMode}
        initialPreference={scannerInitialPreference}
        onSelectDoorAndNavigate={(doorId, tab) => {
          setSelectedDoorId(doorId);
          setActiveTab(tab);
        }}
        onAssignSkuToTargetSlot={handleAssignSlotSku}
        onOrderBackroomCase={handleOrderBackroomCase}
        onPullSkuToFloor={handlePullSkuToFloor}
        onToggleCarriedSku={handleToggleCarriedSku}
        onCreateSkuFromBarcode={(code) => {
          setPrefillUpc(code);
          setAddSkuOpen(true);
        }}
      />

      <OnboardingWizardModal
        open={onboardingOpen}
        initialStep={onboardingStep}
        onClose={() => setOnboardingOpen(false)}
        onboarding={onboarding}
        settings={settings}
        doors={doors}
        skuCatalog={skuCatalog}
        carriedSkuIds={carriedSkuIds}
        isSignedIn={Boolean(authUser)}
        userEmail={authUser?.email}
        onApplyOnboarding={handleApplyOnboarding}
        onOpenScanner={() => openScannerWithPreset('camera', 'auto')}
        onGoToAudit={() => setActiveTab('scan')}
        onSignIn={handleGoogleSignIn}
        onCameraGranted={() => {
          setCameraGranted(true);
          markOnboardingStep('camera');
        }}
      />

      <AuditLogDrawer
        open={auditLogOpen}
        onClose={() => setAuditLogOpen(false)}
        entries={auditLog}
        onExportCsv={() => {
          const csv = generateAuditLogCsv(auditLog);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `kooleriq-audit-log-${settings.storeCode.toLowerCase()}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          appendAuditLog('csv', 'info', 'Exported Audit Log CSV', `Exported ${auditLog.length} events.`);
          showToast('Downloaded Audit Log CSV.');
        }}
        onClearEntries={() => {
          const ids = auditLog.map((e) => e.id);
          setAuditLog([]);
          if (authUser && firestoreReadyRef.current && ids.length > 0) {
            void clearAuditLogsInFirestore(authUser.uid, ids);
          }
          showToast('Cleared audit log entries.');
        }}
      />

      <NotificationCenterDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={(id) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          );
          if (authUser && firestoreReadyRef.current) {
            void markNotificationReadInFirestore(authUser.uid, id);
          }
        }}
        onMarkAllRead={() => {
          const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          if (authUser && firestoreReadyRef.current && unreadIds.length > 0) {
            void markAllNotificationsReadInFirestore(authUser.uid, unreadIds);
          }
        }}
        onClearRead={() => {
          const readIds = notifications.filter((n) => n.read).map((n) => n.id);
          setNotifications((prev) => prev.filter((n) => !n.read));
          if (authUser && firestoreReadyRef.current && readIds.length > 0) {
            void clearNotificationsInFirestore(authUser.uid, readIds);
          }
        }}
        onNavigate={(tab, doorId) => {
          if (doorId) setSelectedDoorId(doorId);
          setActiveTab(normalizeNavTab(tab));
        }}
      />

      <CsvImportExportModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        initialTab={csvModalTab}
        doors={doors}
        skuCatalog={skuCatalog}
        carriedSkuIds={carriedSkuIds}
        audits={audits}
        auditLogEntries={auditLog}
        settings={settings}
        onApplyImportedCatalog={handleApplyImportedCatalog}
        onExportEventLogged={(reportName) => {
          appendAuditLog('csv', 'info', `Exported ${reportName}`, `Generated CSV for ${settings.storeName}.`);
          showToast(`Downloaded ${reportName}.`);
        }}
      />

      <ImageLibraryModal
        open={imageLibraryOpen}
        onClose={() => setImageLibraryOpen(false)}
        assets={imageAssets}
        doors={doors}
        skuCatalog={skuCatalog}
        carriedSkuIds={carriedSkuIds}
        selectionMode={imageLibraryMode}
        onAddAsset={(asset) => {
          const enriched: ImageAsset = {
            ...asset,
            id: sanitizeDocId(asset.id, 'asset'),
            storeName: asset.storeName || settings.storeName,
          };
          setImageAssets((prev) => [enriched, ...prev].slice(0, 40));
          if (authUser && firestoreReadyRef.current) {
            void saveMediaAssetToFirestore(authUser.uid, enriched);
          }
          appendAuditLog(
            'media',
            'success',
            'Added Image to Media Library',
            `Stored "${enriched.title}" (${enriched.category}).`
          );
          showToast(`Added "${enriched.title}" to Image Library.`);
        }}
        onDeleteAsset={(assetId) => {
          const target = imageAssets.find((a) => a.id === assetId);
          setImageAssets((prev) => prev.filter((a) => a.id !== assetId));
          if (authUser && firestoreReadyRef.current) {
            void deleteMediaAssetInFirestore(authUser.uid, assetId);
          }
          if (target) {
            appendAuditLog('media', 'warning', 'Removed Image Asset', `Deleted "${target.title}".`);
            showToast(`Removed "${target.title}".`);
          }
        }}
        onAssignToSku={handleAssignImageToSku}
        onAssignToDoor={handleAssignImageToDoor}
        onPickUrl={(url, title) => {
          setPickedSkuImageUrl(url);
          showToast(`Selected "${title}" for custom drink.`);
        }}
      />

      {/* Multi-Turn Gemini Merchandising Copilot Drawer */}
      <AiAssistantDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        onClearHistory={handleClearChatHistory}
        isSending={chatSending}
        errorMsg={chatError}
      />

      <PrototypePreviewModal
        open={prototypeOpen}
        onClose={() => setPrototypeOpen(false)}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 max-w-sm glacier-hud rounded-lg border border-[var(--kq-accent-border)] px-4 py-3 text-xs font-medium text-[var(--kq-text)]">
          {toastMsg}
        </div>
      )}

      {/* Mobile Anchored 5-Point Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--kq-header)] backdrop-blur-md border-t border-[var(--kq-border)] px-2"
        aria-label="Mobile bottom navigation"
      >
        <div className="grid grid-cols-5 h-full items-center max-w-md mx-auto">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isCentralScan = item.id === 'scan';
            const isTabLocked = !authUser && lockedTabs.has(item.id);

            if (isCentralScan) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className="flex flex-col items-center justify-center -mt-4 focus-visible:outline-none"
                  aria-label="Scan Centerpiece"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all shadow-md ${
                      isActive
                        ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] border-[var(--kq-accent)]'
                        : 'bg-[var(--kq-surface)] text-[var(--kq-accent)] border-[var(--kq-accent-border)]'
                    }`}
                  >
                    {isTabLocked ? <Lock className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-[10px] font-medium mt-0.5 ${
                      isActive ? 'text-[var(--kq-accent)] font-semibold' : 'text-[var(--kq-text-secondary)]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className="min-h-[44px] flex flex-col items-center justify-center gap-1 focus-visible:outline-none relative"
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-[var(--kq-accent)]' : 'text-[var(--kq-text-muted)]'
                    }`}
                  />
                  {isTabLocked && (
                    <Lock className="w-2.5 h-2.5 text-[var(--kq-accent)] absolute -top-1 -right-1.5" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium leading-none ${
                    isActive ? 'text-[var(--kq-accent)] font-semibold' : 'text-[var(--kq-text-muted)]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
