export type NavTab = 'dashboard' | 'inventory' | 'scan' | 'orders' | 'reports' | 'settings';

export function normalizeNavTab(tab?: string): NavTab {
  if (tab === 'dashboard' || tab === 'planogram') return 'dashboard';
  if (tab === 'inventory') return 'inventory';
  if (tab === 'scan' || tab === 'audit') return 'scan';
  if (tab === 'orders' || tab === 'pricing') return 'orders';
  if (tab === 'reports' || tab === 'insights') return 'reports';
  if (tab === 'settings') return 'settings';
  return 'dashboard';
}

export type BrandId =
  | 'monster'
  | 'celsius'
  | 'redbull'
  | 'coca-cola'
  | 'pepsi'
  | 'mtn-dew'
  | 'dr-pepper'
  | 'gatorade'
  | 'powerade'
  | 'bodyarmor'
  | 'rockstar'
  | 'reign'
  | 'bang'
  | 'nos'
  | 'liquid-death'
  | 'starbucks'
  | 'alani'
  | 'olipop'
  | 'yerba-mate'
  | 'core-power'
  | 'fairlife'
  | 'dasani'
  | 'smartwater'
  | 'vitaminwater'
  | 'fanta'
  | 'sprite'
  | 'squirt'
  | 'peace-tea'
  | 'lipton'
  | 'naked'
  | 'muscle-milk'
  | 'propel'
  | 'aquafina'
  | 'schweppes'
  | 'custom';

export type ContainerType = 'can' | 'tall-can' | 'bottle' | 'glass-bottle';

export type FacingStatus = 'optimal' | 'low' | 'oos' | 'violation';

export type DoorHardwareType =
  | 'standard-glass'
  | 'slim-reach-in'
  | 'wide-air-curtain'
  | 'countertop-mini'
  | 'walk-in-cave';

export interface SkuItem {
  id: string;
  skuCode: string;
  name: string;
  shortName: string;
  brand: BrandId;
  brandLabel: string;
  brandColor: string;
  size: string;
  containerType: ContainerType;
  price: number;
  weeklyVelocity: number;
  marginPct: number;
  backroomQty: number;
  parLevel: number;
  primaryColor: string;
  secondaryColor: string;
  capColor: string;
  upc?: string;
  distributor?: string;
  category?: string;
  materialSku?: string;
  unitsPerCase?: number;
  grossCasePrice?: number;
  caseDiscount?: number;
  netCaseCost?: number;
  netUnitCost?: number;
  invoiceSource?: string;
  imageUrl?: string;
}

export interface AiRecommendation {
  targetSkuId: string;
  projectedLiftPct: number;
  weeklyDollarGain: number;
  reason: string;
  confidence: number;
  applied?: boolean;
}

export interface FacingSlot {
  id: string;
  coord: string;
  shelfIndex: number;
  facingIndex: number;
  skuId: string;
  plannedSkuId: string;
  currentDepth: number;
  maxDepth: number;
  status: FacingStatus;
  aiRecommendation?: AiRecommendation;
}

export interface CoolerDoor {
  id: string;
  number: string;
  label: string;
  category: string;
  hardwareType: DoorHardwareType;
  facingsPerShelf: number;
  defaultMaxDepth: number;
  tempF: number;
  targetTempF: number;
  humidityPct: number;
  doorOpensToday: number;
  lastAuditAt: string;
  compressorState: 'nominal' | 'defrost' | 'warning';
  shelves: FacingSlot[][];
  photoUrl?: string;
}

export interface AuditRecord {
  id: string;
  doorId: string;
  doorLabel: string;
  timestamp: string;
  compliancePct: number;
  facingsDetected: number;
  totalFacings: number;
  oosCount: number;
  aiConfidence: number;
  status: 'verified' | 'synced';
  summary: string;
}

export interface InsightItem {
  id: string;
  doorId: string;
  doorLabel: string;
  slotId: string;
  slotCoord: string;
  currentSkuId: string;
  recommendedSkuId: string;
  projectedLiftPct: number;
  weeklyDollarGain: number;
  confidence: number;
  rationale: string;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface StoreSettings {
  storeName: string;
  storeCode: string;
  address: string;
  routeId: string;
  tempUnit: 'F' | 'C';
  lowStockThresholdPct: number;
  minTempAlertF: number;
  maxTempAlertF: number;
  aiConfidenceMin: number;
  autoRestockSync: boolean;
  cameraGridOverlay: boolean;
}

export interface StoreProfile {
  id: string;
  layoutTemplate: string;
  doors: CoolerDoor[];
  carriedSkuIds: string[];
  insights: InsightItem[];
  audits: AuditRecord[];
  settings: StoreSettings;
}

export type PlanTier = 'starter' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface SubscriptionState {
  planTier: PlanTier;
  billingCycle: BillingCycle;
  doorQuota: number;
  storeCount: number;
  googlePlayLinked: boolean;
  status: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'model';
  modelUsed: string;
  content: string;
  sources?: GroundingSource[];
  createdAt?: string;
}

export type OperatorRole =
  | 'store-manager'
  | 'route-merchandiser'
  | 'multi-store-owner'
  | 'distributor-rep';

export interface OnboardingState {
  completed: boolean;
  dismissedChecklist: boolean;
  operatorRole: OperatorRole;
  completedSteps: string[];
}

export type AuditLogCategory =
  | 'shelf-audit'
  | 'planogram'
  | 'inventory'
  | 'layout'
  | 'cold-chain'
  | 'csv'
  | 'media'
  | 'system';

export type AuditLogSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface AuditLogEntry {
  id: string;
  timestampIso: string;
  category: AuditLogCategory;
  severity: AuditLogSeverity;
  actor: string;
  storeName: string;
  doorLabel?: string;
  action: string;
  details: string;
}

export type NotificationCategory = 'cold-chain' | 'stock' | 'audit' | 'system';

export interface NotificationItem {
  id: string;
  timestampIso: string;
  category: NotificationCategory;
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  read: boolean;
  doorId?: string;
  targetTab?: NavTab;
}

export type MediaAssetCategory = 'cooler-capture' | 'product-pack' | 'brand-signage';

export interface ImageAsset {
  id: string;
  title: string;
  category: MediaAssetCategory;
  url: string;
  createdAtIso: string;
  storeName?: string;
  doorId?: string;
  doorLabel?: string;
  skuId?: string;
  tags: string[];
  builtIn?: boolean;
}

export interface DistributorOrderLine {
  skuId: string;
  skuName: string;
  upc?: string;
  distributor: string;
  cases: number;
  unitsPerCase: number;
  netCaseCost: number;
}

export interface DistributorOrderRecord {
  id: string;
  poNumber: string;
  createdAtIso: string;
  storeName: string;
  distributorSummary: string;
  totalCases: number;
  totalUnits: number;
  totalWholesaleCost: number;
  status: 'received' | 'submitted';
  lines: DistributorOrderLine[];
}


