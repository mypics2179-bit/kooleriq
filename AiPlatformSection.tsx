import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe,
  Images,
  Send,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import {
  ChatMessageItem,
  CoolerDoor,
  GroundingSource,
  ImageAsset,
  SkuItem,
  StoreSettings,
} from '../types/kooleriq';
import { formatTemp, getDoorMetrics } from '../utils/formatters';

interface PlanogramAiAction {
  doorId: string;
  doorNumber: string;
  slotCoord: string;
  actionType: string;
  currentSkuId?: string;
  recommendedSkuId: string;
  recommendedSkuName: string;
  weeklyDollarGain: number;
  confidence: number;
  rationale: string;
}

interface VisionFinding {
  area: string;
  status: string;
  observation: string;
  recommendedAction: string;
}

interface AiPlatformSectionProps {
  doors: CoolerDoor[];
  selectedDoorId: string;
  skuCatalog: Record<string, SkuItem>;
  carriedSkuIds: string[];
  settings: StoreSettings;
  imageAssets: ImageAsset[];
  authToken: string | null;
  chatMessages: ChatMessageItem[];
  copilotError?: string | null;
  onApplyRecommendedSlot: (
    doorId: string,
    slotCoord: string,
    recommendedSkuId: string,
    weeklyDollarGain: number
  ) => boolean;
  onSelectDoor: (doorId: string) => void;
  onRecordVisionAudit: (
    doorId: string,
    summary: string,
    compliancePct: number,
    oosCount: number
  ) => void;
  onSendCopilotMessage: (
    text: string,
    modelMode: 'standard' | 'fast',
    useSearchGrounding: boolean
  ) => Promise<void>;
  onOpenCopilotDrawer: () => void;
  onGoToScanHub: () => void;
  onGoToReports: () => void;
}

async function compressImageDataUrl(sourceUrl: string): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 960;
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ base64: dataUrl, mimeType: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('Unable to load image for vision inspection.'));
    img.src = sourceUrl;
  });
}

export const AiPlatformSection: React.FC<AiPlatformSectionProps> = ({
  doors,
  selectedDoorId,
  skuCatalog,
  carriedSkuIds,
  settings,
  imageAssets,
  authToken,
  chatMessages,
  copilotError,
  onApplyRecommendedSlot,
  onSelectDoor,
  onRecordVisionAudit,
  onSendCopilotMessage,
  onOpenCopilotDrawer,
  onGoToScanHub,
  onGoToReports,
}) => {
  const [activeEngine, setActiveEngine] = useState<'optimizer' | 'vision' | 'copilot'>('optimizer');

  // Planogram Optimizer state
  const [goalMode, setGoalMode] = useState<'maximize-margin' | 'fix-oos' | 'cold-chain-balance'>(
    'maximize-margin'
  );
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<{
    executiveSummary: string;
    estimatedWeeklyGain: number;
    actions: PlanogramAiAction[];
    modelUsed: string;
  } | null>(null);
  const [appliedActionKeys, setAppliedActionKeys] = useState<Record<string, boolean>>({});

  // Vision Shelf Inspector state
  const [visionDoorId, setVisionDoorId] = useState<string>(selectedDoorId || doors[0]?.id || '');
  const [visionImageUrl, setVisionImageUrl] = useState<string>('');
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<{
    summary: string;
    complianceEstimatePct: number;
    detectedOosCount: number;
    findings: VisionFinding[];
    modelUsed: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Embedded Copilot Quick-Ask & Google Search Grounding state
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotMode, setCopilotMode] = useState<'standard' | 'fast'>('standard');
  const [copilotSearch, setCopilotSearch] = useState(true);
  const [copilotSending, setCopilotSending] = useState(false);
  const [marketBriefLoading, setMarketBriefLoading] = useState(false);
  const [marketBriefError, setMarketBriefError] = useState<string | null>(null);
  const [marketBrief, setMarketBrief] = useState<{
    summary: string;
    sources: GroundingSource[];
    searchQueries: string[];
  } | null>(null);

  const activeVisionDoor = useMemo(
    () => doors.find((d) => d.id === visionDoorId) ?? doors[0],
    [doors, visionDoorId]
  );

  const coolerCaptureAssets = useMemo(
    () => imageAssets.filter((a) => a.category === 'cooler-capture' || Boolean(a.url)),
    [imageAssets]
  );

  const buildStoreSummaries = () => {
    const doorsSummary = doors
      .map((door) => {
        const m = getDoorMetrics(door);
        const notableSlots = door.shelves
          .flat()
          .filter(
            (s) =>
              s.currentDepth === 0 ||
              s.status === 'low' ||
              s.status === 'violation' ||
              s.shelfIndex <= 1
          )
          .slice(0, 14)
          .map((s) => {
            const sku = skuCatalog[s.skuId];
            return `${s.coord}: ${s.skuId} (${sku?.shortName || s.skuId}, depth ${s.currentDepth}/${s.maxDepth}, status=${s.status}, $${sku?.price.toFixed(2) || '0'})`;
          })
          .join('; ');
        return `doorId=${door.id} | Door ${door.number} (${door.label}, ${formatTemp(
          door.tempF,
          settings.tempUnit
        )}, compliance ${m.compliancePct.toFixed(1)}%, OOS=${m.oosCount}) -> ${notableSlots}`;
      })
      .join('\n');

    const carriedSet = new Set(carriedSkuIds);
    const carriedCatalogSummary = Object.values(skuCatalog)
      .filter((s) => carriedSet.has(s.id))
      .slice(0, 45)
      .map(
        (s) =>
          `${s.id} | ${s.name} | $${s.price.toFixed(2)} | ${s.marginPct.toFixed(0)}% margin | vel ${s.weeklyVelocity}/wk | walkIn ${s.backroomQty}u`
      )
      .join('\n');

    return { doorsSummary, carriedCatalogSummary };
  };

  const handleRunPlanogramAi = async () => {
    if (planLoading) return;
    setPlanLoading(true);
    setPlanError(null);

    try {
      const { doorsSummary, carriedCatalogSummary } = buildStoreSummaries();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch('/api/ai/planogram-analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storeName: settings.storeName,
          layoutTemplate: `${doors.length} cooler doors`,
          doorsSummary,
          carriedCatalogSummary,
          goalMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI planogram analysis failed.');
      }
      setPlanResult({
        executiveSummary: data.plan?.executiveSummary || 'Analysis completed.',
        estimatedWeeklyGain: Number(data.plan?.estimatedWeeklyGain) || 0,
        actions: Array.isArray(data.plan?.actions) ? data.plan.actions : [],
        modelUsed: data.modelUsed || 'gemini-4-hydrogen',
      });
      setAppliedActionKeys({});
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Unable to reach KoolerIQ AI Engine.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setVisionImageUrl(String(reader.result));
      setVisionResult(null);
      setVisionError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRunVisionAudit = async () => {
    if (!visionImageUrl || visionLoading || !activeVisionDoor) return;
    setVisionLoading(true);
    setVisionError(null);

    try {
      const { base64, mimeType } = await compressImageDataUrl(visionImageUrl);
      const expectedSkus = activeVisionDoor.shelves
        .slice(0, 3)
        .map(
          (row, idx) =>
            `Shelf S${idx + 1}: ${row
              .map((s) => `${s.coord} ${skuCatalog[s.skuId]?.shortName || s.skuId}`)
              .join(', ')}`
        )
        .join('\n');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch('/api/ai/vision-audit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          doorLabel: activeVisionDoor.label,
          doorGridSummary: expectedSkus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI vision audit failed.');
      }

      const parsedAudit = {
        summary: data.audit?.summary || 'Inspection complete.',
        complianceEstimatePct: Number(data.audit?.complianceEstimatePct) || 0,
        detectedOosCount: Number(data.audit?.detectedOosCount) || 0,
        findings: Array.isArray(data.audit?.findings) ? data.audit.findings : [],
        modelUsed: data.modelUsed || 'gemini-4-hydrogen',
      };
      setVisionResult(parsedAudit);
      onRecordVisionAudit(
        activeVisionDoor.id,
        parsedAudit.summary,
        parsedAudit.complianceEstimatePct,
        parsedAudit.detectedOosCount
      );
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : 'Unable to analyze cooler image.');
    } finally {
      setVisionLoading(false);
    }
  };

  const handleQuickCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = copilotInput.trim();
    if (!text || copilotSending) return;
    setCopilotInput('');
    setCopilotSending(true);
    try {
      await onSendCopilotMessage(text, copilotMode, copilotMode === 'standard' && copilotSearch);
    } finally {
      setCopilotSending(false);
    }
  };

  const handleRunLiveSearchBrief = async (queryText: string) => {
    if (marketBriefLoading) return;
    setMarketBriefLoading(true);
    setMarketBriefError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch('/api/ai/market-search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: queryText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google Search briefing failed.');
      }
      setMarketBrief({
        summary: data.summary || 'No search-grounded results returned.',
        sources: Array.isArray(data.sources) ? data.sources : [],
        searchQueries: Array.isArray(data.searchQueries) ? data.searchQueries : [],
      });
    } catch (err) {
      setMarketBriefError(
        err instanceof Error ? err.message : 'Unable to reach Google Search grounding service.'
      );
    } finally {
      setMarketBriefLoading(false);
    }
  };

  const latestReply = useMemo(() => {
    const reversed = [...chatMessages].reverse();
    return reversed.find((m) => m.role === 'model') ?? null;
  }, [chatMessages]);

  return (
    <section
      id="ai-platform-section"
      aria-label="KoolerIQ AI Platform"
      className="mt-8 pt-6 border-t border-[var(--kq-border)] space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--kq-text-muted)] font-mono-tabular">
            <span className="font-semibold text-[var(--kq-accent)] inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              KoolerIQ AI Platform
            </span>
            <span aria-hidden="true">·</span>
            <span>Planogram Intelligence</span>
            <span aria-hidden="true">·</span>
            <span>Optical Shelf Vision</span>
            <span aria-hidden="true">·</span>
            <span>Search-Grounded Copilot</span>
          </div>
          <h2 className="text-lg sm:text-xl font-display font-bold tracking-tight text-[var(--kq-text)]">
            Storewide AI Merchandising &amp; Vision Platform
          </h2>
        </div>

        {/* Engine Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] w-fit overflow-x-auto">
          {(
            [
              { id: 'optimizer', label: 'Planogram Optimizer', icon: Sparkles },
              { id: 'vision', label: 'Vision Shelf Inspector', icon: Eye },
              { id: 'copilot', label: 'Copilot & Market Intel', icon: Bot },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeEngine === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveEngine(tab.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] shadow-sm'
                    : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Active AI Workbench */}
      <div className="glacier-card rounded-xl p-4 sm:p-5 space-y-4">
        {activeEngine === 'optimizer' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[var(--kq-border)]">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[var(--kq-text)]">
                  Storewide Planogram &amp; Revenue Optimization Engine
                </h3>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-0.5">
                  Scans all {doors.length} cooler doors, walk-in backstock, and Swire/PepsiCo
                  margins to generate one-click facing changes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={goalMode}
                  onChange={(e) =>
                    setGoalMode(
                      e.target.value as 'maximize-margin' | 'fix-oos' | 'cold-chain-balance'
                    )
                  }
                  aria-label="Select AI optimization objective"
                  className="min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)]"
                >
                  <option value="maximize-margin">Goal: Maximize Weekly Margin</option>
                  <option value="fix-oos">Goal: Zero Out-of-Stock Priority</option>
                  <option value="cold-chain-balance">Goal: Thermal Door Efficiency</option>
                </select>

                <button
                  type="button"
                  disabled={planLoading}
                  onClick={handleRunPlanogramAi}
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {planLoading ? 'Analyzing Coolers...' : 'Run AI Store Analysis'}
                </button>
              </div>
            </div>

            {planError && (
              <div className="rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-4 py-3 text-xs text-[var(--kq-crimson-text)]">
                {planError}
              </div>
            )}

            {!planResult && !planLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3.5 space-y-1">
                  <div className="font-semibold text-[var(--kq-text)]">
                    1. Live Door Telemetry Context
                  </div>
                  <p className="text-[var(--kq-text-secondary)]">
                    Reads real shelf depths, OOS coordinates, and door temperatures across{' '}
                    {settings.storeName}.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3.5 space-y-1">
                  <div className="font-semibold text-[var(--kq-text)]">
                    2. Wholesale Margin Matching
                  </div>
                  <p className="text-[var(--kq-text-secondary)]">
                    Cross-references {carriedSkuIds.length} carried beverages, retail prices, and
                    walk-in stock counts.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3.5 space-y-1">
                  <div className="font-semibold text-[var(--kq-text)]">
                    3. Instant Planogram Commit
                  </div>
                  <p className="text-[var(--kq-text-secondary)]">
                    Apply recommended SKU swaps straight onto cooler doors and record them in your
                    Audit Log.
                  </p>
                </div>
              </div>
            ) : planLoading ? (
              <div className="space-y-2.5">
                <div className="h-12 rounded-lg bg-[var(--kq-surface-muted)] animate-pulse" />
                <div className="h-20 rounded-lg bg-[var(--kq-surface-muted)] animate-pulse" />
                <div className="h-20 rounded-lg bg-[var(--kq-surface-muted)] animate-pulse" />
              </div>
            ) : planResult ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3.5">
                  <p className="text-xs sm:text-sm text-[var(--kq-text)] leading-relaxed">
                    {planResult.executiveSummary}
                  </p>
                  <div className="shrink-0 text-right font-mono-tabular">
                    <div className="text-[11px] text-[var(--kq-text-muted)]">
                      Projected Lift · {planResult.modelUsed}
                    </div>
                    <div className="text-lg font-bold text-[var(--kq-emerald)]">
                      +${planResult.estimatedWeeklyGain.toFixed(0)}/wk
                    </div>
                  </div>
                </div>

                {planResult.actions.length === 0 ? (
                  <p className="text-xs text-[var(--kq-text-muted)]">
                    No slot swaps returned for this pass. Try switching optimization goal and running
                    again.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--kq-border)] border border-[var(--kq-border)] rounded-lg overflow-hidden">
                    {planResult.actions.map((act, idx) => {
                      const key = `${act.doorId}-${act.slotCoord}-${act.recommendedSkuId}-${idx}`;
                      const isApplied = Boolean(appliedActionKeys[key]);
                      return (
                        <div
                          key={key}
                          className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--kq-surface)]"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                              <span className="font-semibold text-[var(--kq-accent)]">
                                Door {act.doorNumber} · {act.slotCoord}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[var(--kq-text-muted)]">
                                {act.actionType.toUpperCase()}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[var(--kq-emerald)] font-semibold">
                                +${Number(act.weeklyDollarGain || 0).toFixed(0)}/wk
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[var(--kq-text-muted)]">
                                {Math.round(act.confidence || 92)}% conf
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-[var(--kq-text)]">
                              Assign {act.recommendedSkuName}
                            </div>
                            <p className="text-xs text-[var(--kq-text-secondary)]">
                              {act.rationale}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onSelectDoor(act.doorId)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] hover:border-[var(--kq-accent)] whitespace-nowrap"
                            >
                              View Door
                            </button>
                            <button
                              type="button"
                              disabled={isApplied}
                              onClick={() => {
                                const ok = onApplyRecommendedSlot(
                                  act.doorId,
                                  act.slotCoord,
                                  act.recommendedSkuId,
                                  act.weeklyDollarGain
                                );
                                if (ok) {
                                  setAppliedActionKeys((prev) => ({ ...prev, [key]: true }));
                                }
                              }}
                              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${
                                isApplied
                                  ? 'bg-[var(--kq-emerald-soft)] border border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                                  : 'bg-[var(--kq-emerald)] text-white hover:opacity-90'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              {isApplied ? 'Applied' : 'Apply to Cooler'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {activeEngine === 'vision' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[var(--kq-border)]">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[var(--kq-text)]">
                  Multimodal Cooler Door Vision Inspector
                </h3>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-0.5">
                  Send a real cooler door photo or saved Image Library frame to detect gaps, facing
                  drift, and restock priorities.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={activeVisionDoor?.id || ''}
                  onChange={(e) => setVisionDoorId(e.target.value)}
                  aria-label="Target cooler door for vision audit"
                  className="min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)]"
                >
                  {doors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Door {d.number} · {d.label}
                    </option>
                  ))}
                </select>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[42px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Upload Cooler Photo
                </button>

                <button
                  type="button"
                  onClick={onGoToScanHub}
                  className="min-h-[42px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-xs font-semibold text-[var(--kq-accent)] hover:opacity-90 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Live Scan Hub
                </button>
              </div>
            </div>

            {visionError && (
              <div className="rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-4 py-3 text-xs text-[var(--kq-crimson-text)]">
                {visionError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-5 space-y-3">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--kq-cabinet)] border border-[var(--kq-border)] flex items-center justify-center relative">
                  {visionImageUrl ? (
                    <img
                      src={visionImageUrl}
                      alt="Selected cooler shelf frame for AI inspection"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-2">
                      <Images className="w-6 h-6 text-sky-400 mx-auto" />
                      <div className="text-xs font-medium text-slate-200">
                        Upload a cooler photo or pick a saved frame below
                      </div>
                    </div>
                  )}
                </div>

                {coolerCaptureAssets.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-[var(--kq-text-muted)]">
                      Use saved Image Library asset
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {coolerCaptureAssets.slice(0, 6).map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => {
                            setVisionImageUrl(asset.url);
                            setVisionResult(null);
                            setVisionError(null);
                          }}
                          className={`w-14 h-14 rounded-lg overflow-hidden border shrink-0 transition-colors ${
                            visionImageUrl === asset.url
                              ? 'border-[var(--kq-accent)] ring-2 ring-[var(--kq-accent)]'
                              : 'border-[var(--kq-border)] hover:border-[var(--kq-accent)]'
                          }`}
                          title={asset.title}
                        >
                          <img
                            src={asset.url}
                            alt={asset.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!visionImageUrl || visionLoading}
                  onClick={handleRunVisionAudit}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-45 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {visionLoading
                    ? 'Inspecting Shelf Image...'
                    : `Run AI Vision Audit · Door ${activeVisionDoor?.number || '01'}`}
                </button>
              </div>

              <div className="lg:col-span-7 space-y-3">
                {visionLoading ? (
                  <div className="space-y-2.5">
                    <div className="h-16 rounded-lg bg-[var(--kq-surface-muted)] animate-pulse" />
                    <div className="h-24 rounded-lg bg-[var(--kq-surface-muted)] animate-pulse" />
                  </div>
                ) : visionResult ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                        <span className="text-[var(--kq-emerald)] font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Logged to Store Audits · {visionResult.modelUsed}
                        </span>
                        <span className="text-[var(--kq-text)] font-bold">
                          {visionResult.complianceEstimatePct.toFixed(0)}% Full ·{' '}
                          {visionResult.detectedOosCount} Gaps
                        </span>
                      </div>
                      <p className="text-xs text-[var(--kq-text)] leading-relaxed">
                        {visionResult.summary}
                      </p>
                    </div>

                    <div className="divide-y divide-[var(--kq-border)] border border-[var(--kq-border)] rounded-lg overflow-hidden">
                      {visionResult.findings.map((f, i) => (
                        <div key={i} className="p-3 bg-[var(--kq-surface)] space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[var(--kq-text)]">{f.area}</span>
                            <span className="font-mono-tabular text-[var(--kq-accent)] font-medium">
                              {f.status}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--kq-text-secondary)]">
                            {f.observation}
                          </p>
                          <p className="text-[11px] font-medium text-[var(--kq-emerald)]">
                            Next: {f.recommendedAction}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-6 text-center space-y-2">
                    <div className="text-sm font-semibold text-[var(--kq-text)]">
                      Ready for Optical Shelf Inspection
                    </div>
                    <p className="text-xs text-[var(--kq-text-secondary)] max-w-md mx-auto">
                      Select any cooler door, attach a shelf photograph or saved frame, and run
                      visual analysis to log shelf compliance and out-of-stock gaps automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeEngine === 'copilot' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--kq-border)]">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[var(--kq-text)]">
                  Store Telemetry Copilot &amp; Web Search Grounding
                </h3>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-0.5">
                  Ask live questions grounded in {settings.storeName}&apos;s doors, Swire/PepsiCo
                  case costs, and 2026 convenience beverage trends.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)]">
                  <button
                    type="button"
                    onClick={() => setCopilotMode('standard')}
                    className={`min-h-[34px] px-3 py-1 rounded text-xs font-semibold ${
                      copilotMode === 'standard'
                        ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                        : 'text-[var(--kq-text-secondary)]'
                    }`}
                  >
                    Analyst
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopilotMode('fast')}
                    className={`min-h-[34px] px-3 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 ${
                      copilotMode === 'fast'
                        ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                        : 'text-[var(--kq-text-secondary)]'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    Fast
                  </button>
                </div>

                {copilotMode === 'standard' && (
                  <button
                    type="button"
                    onClick={() => setCopilotSearch((v) => !v)}
                    className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 ${
                      copilotSearch
                        ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                        : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-muted)]'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Search: {copilotSearch ? 'On' : 'Off'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenCopilotDrawer}
                  className="min-h-[36px] px-3 py-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-accent)] hover:border-[var(--kq-accent)] inline-flex items-center gap-1 whitespace-nowrap"
                >
                  Open Full Thread
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleQuickCopilotSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder={`Ask KoolerIQ AI about ${settings.storeName}, OOS priorities, or beverage trends...`}
                className="flex-1 min-h-[44px] px-3.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] placeholder:text-[var(--kq-text-muted)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
              <button
                type="submit"
                disabled={!copilotInput.trim() || copilotSending}
                className="min-h-[44px] px-5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-45 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                {copilotSending ? 'Thinking...' : 'Ask KoolerIQ AI'}
              </button>
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                '2026 C-store energy drink trends & top flavors',
                'Zero sugar soda & prebiotic cooler growth benchmarks',
                'Best selling RTD iced coffee convenience store sizes',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={marketBriefLoading}
                  onClick={() => handleRunLiveSearchBrief(preset)}
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] hover:border-[var(--kq-accent)] text-[11px] font-medium text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] inline-flex items-center gap-1.5 transition-colors"
                >
                  <Globe className="w-3 h-3 text-[var(--kq-emerald)]" />
                  {preset}
                </button>
              ))}
            </div>

            {copilotError && (
              <div className="rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-4 py-3 text-xs text-[var(--kq-crimson-text)]">
                {copilotError}
              </div>
            )}

            {marketBriefError && (
              <div className="rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-4 py-3 text-xs text-[var(--kq-crimson-text)]">
                {marketBriefError}
              </div>
            )}

            {marketBrief && (
              <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-emerald)] p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular text-[var(--kq-emerald)] font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Google Search Live Briefing · gemini-4-hydrogen
                  </span>
                  {marketBrief.searchQueries.length > 0 && (
                    <span className="text-[var(--kq-text-muted)] font-normal truncate max-w-md">
                      Query: {marketBrief.searchQueries.join(' · ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--kq-text)] whitespace-pre-wrap leading-relaxed">
                  {marketBrief.summary}
                </p>
                {marketBrief.sources.length > 0 && (
                  <div className="pt-2 border-t border-[var(--kq-border)] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {marketBrief.sources.slice(0, 6).map((src) => (
                      <a
                        key={src.uri}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-[var(--kq-emerald)] hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{src.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {latestReply && (
              <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[var(--kq-accent)] font-semibold">
                  <span>Latest Copilot Response · {latestReply.modelUsed}</span>
                  <button
                    type="button"
                    onClick={onOpenCopilotDrawer}
                    className="hover:underline font-sans"
                  >
                    View Conversation ({chatMessages.length})
                  </button>
                </div>
                <p className="text-xs text-[var(--kq-text)] whitespace-pre-wrap leading-relaxed">
                  {latestReply.content}
                </p>
                {latestReply.sources && latestReply.sources.length > 0 && (
                  <div className="pt-2 border-t border-[var(--kq-border)] space-y-1">
                    <div className="text-[10px] font-mono-tabular font-semibold text-[var(--kq-accent)]">
                      Google Search Grounding Sources ({latestReply.sources.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {latestReply.sources.slice(0, 4).map((src) => (
                        <a
                          key={src.uri}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] text-[var(--kq-emerald)] hover:underline truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3-Column Platform Capability Footer Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveEngine('optimizer')}
          className="glacier-card rounded-xl p-4 text-left hover:border-[var(--kq-accent)] transition-colors space-y-1"
        >
          <div className="text-xs font-semibold text-[var(--kq-accent)] flex items-center justify-between">
            <span>Revenue &amp; Slot Engine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm font-semibold text-[var(--kq-text)]">
            Structured Planogram Swaps
          </div>
          <p className="text-xs text-[var(--kq-text-secondary)]">
            Targets high-velocity energy &amp; hydration facings across your {doors.length}-door
            layout.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveEngine('vision')}
          className="glacier-card rounded-xl p-4 text-left hover:border-[var(--kq-accent)] transition-colors space-y-1"
        >
          <div className="text-xs font-semibold text-[var(--kq-accent)] flex items-center justify-between">
            <span>Optical Shelf Vision</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm font-semibold text-[var(--kq-text)]">
            Photo &amp; Frame Auditing
          </div>
          <p className="text-xs text-[var(--kq-text-secondary)]">
            Inspects door snapshots for empty facings, fronting quality, and compliance.
          </p>
        </button>

        <button
          type="button"
          onClick={onGoToReports}
          className="glacier-card rounded-xl p-4 text-left hover:border-[var(--kq-accent)] transition-colors space-y-1"
        >
          <div className="text-xs font-semibold text-[var(--kq-accent)] flex items-center justify-between">
            <span>Search Grounded Trends</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm font-semibold text-[var(--kq-text)]">
            2026 C-Store Category Intel
          </div>
          <p className="text-xs text-[var(--kq-text-secondary)]">
            Open full velocity charts, search-cited market reports, and CSV exports.
          </p>
        </button>
      </div>
    </section>
  );
};
