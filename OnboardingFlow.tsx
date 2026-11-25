import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  LayoutGrid,
  LogIn,
  Minus,
  Package,
  Plus,
  ScanBarcode,
  Sparkles,
  Store,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CoolerDoor,
  DoorHardwareType,
  OnboardingState,
  OperatorRole,
  SkuItem,
  StoreSettings,
} from '../types/kooleriq';
import { HARDWARE_LABELS } from '../utils/formatters';

interface OnboardingChecklistBannerProps {
  onboarding: OnboardingState;
  isSignedIn: boolean;
  auditsCount: number;
  cameraGranted: boolean;
  onOpenWizard: (initialStep?: number) => void;
  onDismissChecklist: () => void;
  onQuickAction: (stepId: string) => void;
}

const ROLE_LABELS: Record<OperatorRole, string> = {
  'store-manager': 'Store Manager',
  'route-merchandiser': 'Route Merchandiser',
  'multi-store-owner': 'Multi-Store Owner',
  'distributor-rep': 'Beverage Distributor Rep',
};

export const OnboardingChecklistBanner: React.FC<OnboardingChecklistBannerProps> = ({
  onboarding,
  isSignedIn,
  auditsCount,
  cameraGranted,
  onOpenWizard,
  onDismissChecklist,
  onQuickAction,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const steps = useMemo(() => {
    const done = new Set(onboarding.completedSteps);
    return [
      {
        id: 'profile',
        label: 'Store & Role Setup',
        done: done.has('profile') || onboarding.completed,
      },
      {
        id: 'layout',
        label: 'Cooler Door Layout',
        done: done.has('layout') || onboarding.completed,
      },
      {
        id: 'assortment',
        label: 'Distributor Catalog',
        done: done.has('assortment') || onboarding.completed,
      },
      {
        id: 'camera',
        label: 'Camera & UPC Scan',
        done: done.has('camera') || cameraGranted,
      },
      {
        id: 'audit',
        label: 'First Shelf Audit',
        done: done.has('audit') || auditsCount > 3,
      },
      {
        id: 'sync',
        label: 'Cloud & Play Sync',
        done: done.has('sync') || isSignedIn,
      },
    ];
  }, [onboarding, isSignedIn, auditsCount, cameraGranted]);

  if (onboarding.dismissedChecklist) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section
      aria-label="Operator onboarding checklist"
      className="mb-5 glacier-card rounded-xl p-4 sm:px-5 sm:py-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--kq-text-muted)]">
            <span className="font-semibold text-[var(--kq-accent)] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Operator Setup Guide
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-[var(--kq-text)] font-semibold">
              {doneCount} of {steps.length} complete ({pct}%)
            </span>
            <span aria-hidden="true">·</span>
            <span>{ROLE_LABELS[onboarding.operatorRole]}</span>
          </div>
          <p className="text-xs text-[var(--kq-text-secondary)]">
            Configure your cooler doors, Swire/PepsiCo beverage lineup, and camera scanner in under 2 minutes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenWizard(1)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {onboarding.completed ? 'Review Setup' : 'Start Guided Setup'}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="min-h-[38px] min-w-[38px] px-2.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] flex items-center justify-center"
            aria-label={collapsed ? 'Expand setup checklist' : 'Collapse setup checklist'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onDismissChecklist}
            className="min-h-[38px] min-w-[38px] px-2.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] flex items-center justify-center"
            aria-label="Dismiss setup checklist"
            title="Hide checklist (reopen anytime in Settings)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3.5 pt-3.5 border-t border-[var(--kq-border)] space-y-3">
          <div className="w-full h-1.5 rounded-full bg-[var(--kq-surface-muted)] overflow-hidden">
            <div
              className="h-full bg-[var(--kq-accent)] transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => onQuickAction(step.id)}
                className={`min-h-[42px] px-3 py-2 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                  step.done
                    ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                    : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border-strong)] text-[var(--kq-text)] hover:border-[var(--kq-accent)]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono-tabular font-bold shrink-0 ${
                    step.done
                      ? 'bg-[var(--kq-emerald)] text-white'
                      : 'bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)]'
                  }`}
                >
                  {step.done ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span className="text-xs font-medium truncate">{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

interface OnboardingWizardModalProps {
  open: boolean;
  initialStep?: number;
  onClose: () => void;
  onboarding: OnboardingState;
  settings: StoreSettings;
  doors: CoolerDoor[];
  skuCatalog: Record<string, SkuItem>;
  carriedSkuIds: string[];
  isSignedIn: boolean;
  userEmail?: string | null;
  onApplyOnboarding: (payload: {
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
  }) => void;
  onOpenScanner: () => void;
  onGoToAudit: () => void;
  onSignIn: () => void;
  onCameraGranted: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  open,
  initialStep = 1,
  onClose,
  onboarding,
  settings,
  doors,
  skuCatalog,
  carriedSkuIds,
  isSignedIn,
  userEmail,
  onApplyOnboarding,
  onOpenScanner,
  onGoToAudit,
  onSignIn,
  onCameraGranted,
}) => {
  const [step, setStep] = useState(initialStep);
  const [operatorRole, setOperatorRole] = useState<OperatorRole>(onboarding.operatorRole);
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeCode, setStoreCode] = useState(settings.storeCode);
  const [address, setAddress] = useState(settings.address);
  const [routeId, setRouteId] = useState(settings.routeId);
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>(settings.tempUnit);

  const [layoutChoice, setLayoutChoice] = useState<
    'keep' | 'bodega-2' | 'cstore-4' | 'plaza-6' | 'custom'
  >('keep');
  const [customDoors, setCustomDoors] = useState(doors.length);
  const [customShelves, setCustomShelves] = useState(doors[0]?.shelves.length ?? 5);
  const [customFacings, setCustomFacings] = useState(doors[0]?.facingsPerShelf ?? 6);
  const [hardwareType, setHardwareType] = useState<DoorHardwareType>(
    doors[0]?.hardwareType ?? 'standard-glass'
  );

  const [distributorMix, setDistributorMix] = useState<
    'keep' | 'swire' | 'pepsico' | 'energy-craft' | 'all-157'
  >('keep');

  const [cameraStatus, setCameraStatus] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [cameraTesting, setCameraTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setOperatorRole(onboarding.operatorRole);
    setStoreName(settings.storeName);
    setStoreCode(settings.storeCode);
    setAddress(settings.address);
    setRouteId(settings.routeId);
    setTempUnit(settings.tempUnit);
    setCustomDoors(doors.length);
    setCustomShelves(doors[0]?.shelves.length ?? 5);
    setCustomFacings(doors[0]?.facingsPerShelf ?? 6);
    setHardwareType(doors[0]?.hardwareType ?? 'standard-glass');

    let active = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((res) => {
          if (active) setCameraStatus(res.state);
        })
        .catch(() => {
          if (active) setCameraStatus('unknown');
        });
    }
    return () => {
      active = false;
    };
  }, [open, initialStep, onboarding.operatorRole, settings, doors]);

  const catalogCounts = useMemo(() => {
    const items = Object.values(skuCatalog);
    return {
      total: items.length,
      swire: items.filter((s) => s.distributor === 'Swire Coca-Cola').length,
      pepsi: items.filter((s) => s.distributor === 'PepsiCo').length,
      energy: items.filter((s) => (s.category || '').toLowerCase().includes('energy')).length,
    };
  }, [skuCatalog]);

  if (!open) return null;

  const handleRequestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('denied');
      return;
    }
    setCameraTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
      setCameraStatus('granted');
      onCameraGranted();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraStatus('denied');
      }
    } finally {
      setCameraTesting(false);
    }
  };

  const handleFinish = (markCompleted: boolean) => {
    const stepsSet = new Set(onboarding.completedSteps);
    stepsSet.add('profile');
    stepsSet.add('layout');
    stepsSet.add('assortment');
    if (cameraStatus === 'granted') stepsSet.add('camera');
    if (isSignedIn) stepsSet.add('sync');

    onApplyOnboarding({
      operatorRole,
      storeName: storeName.trim() || settings.storeName,
      storeCode: storeCode.trim() || settings.storeCode,
      address: address.trim() || settings.address,
      routeId: routeId.trim() || settings.routeId,
      tempUnit,
      layoutChoice,
      customDoors,
      customShelves,
      customFacings,
      hardwareType,
      distributorMix,
      completedSteps: Array.from(stepsSet),
      markCompleted,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto glacier-hud rounded-xl p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--kq-border)] pb-3.5">
          <div>
            <div className="text-xs font-mono-tabular font-semibold text-[var(--kq-accent)]">
              Step {step} of 4 · KoolerIQ Onboarding
            </div>
            <h2 className="text-lg font-display font-bold text-[var(--kq-text)] mt-0.5">
              {step === 1
                ? 'Your Role & Store Profile'
                : step === 2
                  ? 'Cooler Door Architecture'
                  : step === 3
                    ? 'Distributor & Beverage Lineup'
                    : 'Camera, UPC Scanner & Cloud Sync'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:bg-[var(--kq-surface-muted)]"
            aria-label="Close onboarding wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, label: 'Role & Store' },
            { num: 2, label: 'Cooler Grid' },
            { num: 3, label: 'Beverages' },
            { num: 4, label: 'Scan & Sync' },
          ].map((item) => {
            const isCurrent = step === item.num;
            const isDone = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setStep(item.num)}
                className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[var(--kq-accent)] border-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                    : isDone
                      ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                      : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-secondary)]'
                }`}
              >
                <span className="font-mono-tabular">{isDone ? '✓' : item.num}.</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step 1: Role & Store Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-2">
                Select Your Primary Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    {
                      id: 'store-manager',
                      title: 'Store Manager',
                      desc: 'Single-site cooler restocking, shelf audits & backroom pulls',
                    },
                    {
                      id: 'route-merchandiser',
                      title: 'Route Merchandiser',
                      desc: 'Daily multi-stop cooler resets, UPC scans & gap fills',
                    },
                    {
                      id: 'multi-store-owner',
                      title: 'Multi-Store Operator',
                      desc: 'Fleet planograms, margin tracking & Google Play seats',
                    },
                    {
                      id: 'distributor-rep',
                      title: 'Beverage Distributor Rep',
                      desc: 'Swire Coca-Cola / PepsiCo facing share & case ordering',
                    },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setOperatorRole(r.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      operatorRole === r.id
                        ? 'bg-[var(--kq-accent-soft)] border-[var(--kq-accent)] text-[var(--kq-text)]'
                        : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-secondary)] hover:border-[var(--kq-border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span>{r.title}</span>
                      {operatorRole === r.id && <UserCheck className="w-3.5 h-3.5 text-[var(--kq-accent)]" />}
                    </div>
                    <div className="text-[11px] text-[var(--kq-text-muted)] mt-1 leading-snug">
                      {r.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                  Primary Store Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                  Store Code
                </label>
                <input
                  type="text"
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm font-mono-tabular text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                    Route ID
                  </label>
                  <input
                    type="text"
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-mono-tabular text-[var(--kq-text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                    Temp Unit
                  </label>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] h-[42px]">
                    {(['F', 'C'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setTempUnit(u)}
                        className={`flex-1 h-full rounded text-xs font-mono-tabular font-semibold ${
                          tempUnit === u
                            ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                            : 'text-[var(--kq-text-secondary)]'
                        }`}
                      >
                        °{u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Cooler Door Layout */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--kq-text-secondary)]">
              Match KoolerIQ’s schematic grid to your store’s physical reach-in doors, open air
              curtains, or walk-in beer/beverage cave.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                [
                  {
                    id: 'keep',
                    title: `Keep Active Layout (${doors.length} Doors)`,
                    desc: `${doors[0]?.shelves.length ?? 5} shelves × ${doors[0]?.facingsPerShelf ?? 6} facings currently configured`,
                  },
                  {
                    id: 'bodega-2',
                    title: '2-Door Slim / Bodega',
                    desc: '4 facings wide · 4–5 shelves (urban & grab-n-go)',
                  },
                  {
                    id: 'cstore-4',
                    title: '4-Door C-Store Standard',
                    desc: '6 facings wide · 5 shelves (Energy, CSD, Hydration, Coffee)',
                  },
                  {
                    id: 'plaza-6',
                    title: '6-Door Travel Plaza',
                    desc: 'Includes 8-wide air curtain + deep walk-in cave',
                  },
                  {
                    id: 'custom',
                    title: 'Custom Cooler Dimensions',
                    desc: 'Set exact door count, shelf rows, and facings wide',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLayoutChoice(opt.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    layoutChoice === opt.id
                      ? 'bg-[var(--kq-accent-soft)] border-[var(--kq-accent)] text-[var(--kq-text)]'
                      : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-secondary)] hover:border-[var(--kq-border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span>{opt.title}</span>
                    {layoutChoice === opt.id && (
                      <LayoutGrid className="w-3.5 h-3.5 text-[var(--kq-accent)] shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--kq-text-muted)] mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>

            {layoutChoice === 'custom' && (
              <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3.5 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                      Doors (1–8)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCustomDoors((v) => Math.max(1, v - 1))}
                        className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono-tabular text-sm font-bold flex-1 text-center">
                        {customDoors}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomDoors((v) => Math.min(8, v + 1))}
                        className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                      Shelves (3–7)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCustomShelves((v) => Math.max(3, v - 1))}
                        className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono-tabular text-sm font-bold flex-1 text-center">
                        {customShelves}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomShelves((v) => Math.min(7, v + 1))}
                        className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                      Facings (3–8)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCustomFacings((v) => Math.max(3, v - 1))}
                        className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono-tabular text-sm font-bold flex-1 text-center">
                        {customFacings}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomFacings((v) => Math.min(8, v + 1))}
                        className="min-h-[38px] min-w-[38px] rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--kq-text-muted)] mb-1">
                    Primary Cooler Hardware
                  </label>
                  <select
                    value={hardwareType}
                    onChange={(e) => setHardwareType(e.target.value as DoorHardwareType)}
                    className="w-full min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
                  >
                    {Object.entries(HARDWARE_LABELS).map(([k, txt]) => (
                      <option key={k} value={k}>
                        {txt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Distributor Assortment */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--kq-text-secondary)]">
              Select which beverage distributors and UPC assortments this store carries. You can
              always add or toggle individual SKUs later in Inventory.
            </p>

            <div className="space-y-2">
              {(
                [
                  {
                    id: 'keep',
                    title: `Keep Current Store Lineup (${carriedSkuIds.length} SKUs carried)`,
                    desc: 'Preserve existing facings and carried beverage selections',
                  },
                  {
                    id: 'all-157',
                    title: `Full Distributor Master (${catalogCounts.total} SKUs · Swire + PepsiCo)`,
                    desc: 'Enable every Swire Coca-Cola, PepsiCo, Monster, Celsius, Gatorade & Core Power UPC',
                  },
                  {
                    id: 'swire',
                    title: `Swire Coca-Cola Focus (${catalogCounts.swire} Distributor SKUs + Core)`,
                    desc: 'Coca-Cola, Sprite, Monster Energy, Reign, BodyArmor, Powerade, Fairlife & Smartwater',
                  },
                  {
                    id: 'pepsico',
                    title: `PepsiCo Focus (${catalogCounts.pepsi} Distributor SKUs + Core)`,
                    desc: 'Pepsi, Mountain Dew, Dr Pepper, Rockstar, Celsius, Starbucks, Gatorade & Muscle Milk',
                  },
                  {
                    id: 'energy-craft',
                    title: `High-Margin Energy & Functional (${catalogCounts.energy}+ SKUs)`,
                    desc: 'Focus on Monster, Celsius, Red Bull, Reign, Alani Nu, Rockstar & Protein shakes',
                  },
                ] as const
              ).map((mix) => (
                <button
                  key={mix.id}
                  type="button"
                  onClick={() => setDistributorMix(mix.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors flex items-start justify-between gap-3 ${
                    distributorMix === mix.id
                      ? 'bg-[var(--kq-accent-soft)] border-[var(--kq-accent)] text-[var(--kq-text)]'
                      : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-secondary)] hover:border-[var(--kq-border-strong)]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{mix.title}</div>
                    <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5">{mix.desc}</div>
                  </div>
                  <Package
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      distributorMix === mix.id
                        ? 'text-[var(--kq-accent)]'
                        : 'text-[var(--kq-text-muted)]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Camera, Scanner & Cloud Sync */}
        {step === 4 && (
          <div className="space-y-3">
            {/* Camera Permission */}
            <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--kq-text)] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[var(--kq-accent)]" />
                  Rear Camera &amp; UPC/QR Access
                </div>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-1">
                  {cameraStatus === 'granted'
                    ? 'Camera permission granted — ready for live shelf audits and UPC barcode scans.'
                    : cameraStatus === 'denied'
                      ? 'Camera blocked in browser settings. Enable Camera in the address bar and retry.'
                      : 'Grant camera access once to scan beverage UPCs, cooler QR labels, and shelf facings.'}
                </p>
              </div>
              <button
                type="button"
                disabled={cameraTesting}
                onClick={handleRequestCamera}
                className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                  cameraStatus === 'granted'
                    ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                    : 'bg-[var(--kq-accent)] border-[var(--kq-accent)] text-[var(--kq-accent-fg)] hover:bg-[var(--kq-accent-hover)]'
                }`}
              >
                {cameraTesting
                  ? 'Checking...'
                  : cameraStatus === 'granted'
                    ? 'Camera Allowed ✓'
                    : 'Allow Camera'}
              </button>
            </div>

            {/* Cloud SQL & Google Play Sync */}
            <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--kq-text)] flex items-center gap-2">
                  <Store className="w-4 h-4 text-[var(--kq-accent)]" />
                  Cloud SQL Sync &amp; Google Play Account
                </div>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-1">
                  {isSignedIn
                    ? `Workspace synced to Cloud SQL for ${userEmail || 'your Google account'}.`
                    : 'Sign in with Google to save custom cooler layouts, UPC inventory, and Google Play plans.'}
                </p>
              </div>
              {isSignedIn ? (
                <span className="min-h-[38px] px-3.5 py-2 rounded-lg bg-[var(--kq-emerald-soft)] border border-[var(--kq-emerald)] text-[var(--kq-emerald-text)] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  Synced
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Sign in with Google
                </button>
              )}
            </div>

            {/* Quick Verification Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleFinish(true);
                  onOpenScanner();
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-2"
              >
                <ScanBarcode className="w-4 h-4" />
                Finish &amp; Open UPC/QR Scanner
              </button>
              <button
                type="button"
                onClick={() => {
                  handleFinish(true);
                  onGoToAudit();
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4 text-[var(--kq-accent)]" />
                Finish &amp; Run Shelf Audit
              </button>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--kq-border)]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleFinish(false)}
              className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-medium text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]"
            >
              Skip for now
            </button>
          )}

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="min-h-[44px] px-5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] inline-flex items-center gap-1.5"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFinish(true)}
                className="min-h-[44px] px-5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Save &amp; Launch KoolerIQ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
