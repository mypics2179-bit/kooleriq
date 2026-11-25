import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Eye,
  Globe,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { BRAND_VELOCITY_DATA, HOURLY_COOLER_TELEMETRY } from '../data/mockStoreData';
import { GroundingSource, InsightItem, SkuItem, StoreSettings } from '../types/kooleriq';
import { formatTemp } from '../utils/formatters';
import { BeverageVisual } from './BeverageVisual';

interface InsightsScreenProps {
  insights: InsightItem[];
  skuCatalog: Record<string, SkuItem>;
  settings: StoreSettings;
  authToken: string | null;
  onApplyInsight: (insightId: string) => void;
  onDismissInsight: (insightId: string) => void;
  onPreviewDoor: (doorId: string) => void;
}

const MARKET_PRESETS = [
  'Top selling convenience store energy drinks 2026',
  'Zero sugar soda and functional hydration cooler growth trends',
  'RTD iced coffee retail velocity convenience store benchmarks',
];

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  insights,
  skuCatalog,
  settings,
  authToken,
  onApplyInsight,
  onDismissInsight,
  onPreviewDoor,
}) => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'applied' | 'all'>('pending');
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number>(5);

  const [marketQuery, setMarketQuery] = useState<string>(MARKET_PRESETS[0]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketResult, setMarketResult] = useState<{
    summary: string;
    sources: GroundingSource[];
    modelUsed: string;
  } | null>(null);

  const pendingInsights = useMemo(
    () => insights.filter((i) => i.status === 'pending'),
    [insights]
  );
  const appliedInsights = useMemo(
    () => insights.filter((i) => i.status === 'applied'),
    [insights]
  );

  const pendingWeeklyLift = pendingInsights.reduce((acc, i) => acc + i.weeklyDollarGain, 0);
  const capturedWeeklyLift = appliedInsights.reduce((acc, i) => acc + i.weeklyDollarGain, 0);

  const visibleInsights = useMemo(() => {
    if (statusFilter === 'pending') return pendingInsights;
    if (statusFilter === 'applied') return appliedInsights;
    return insights.filter((i) => i.status !== 'dismissed');
  }, [insights, pendingInsights, appliedInsights, statusFilter]);

  const maxHourlyOpens = Math.max(...HOURLY_COOLER_TELEMETRY.map((h) => h.opens));
  const selectedHour = HOURLY_COOLER_TELEMETRY[hoveredHourIdx] ?? HOURLY_COOLER_TELEMETRY[0];

  const runMarketSearch = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || marketLoading) return;
    setMarketQuery(trimmed);
    setMarketLoading(true);
    setMarketError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/ai/market-search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Search grounding request failed.');
      }
      setMarketResult({
        summary: data.summary,
        sources: Array.isArray(data.sources) ? data.sources : [],
        modelUsed: data.modelUsed || 'gemini-4-hydrogen',
      });
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : 'Unable to fetch search-grounded trends.');
    } finally {
      setMarketLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top 4-Card Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glacier-card rounded-lg p-3.5">
          <div className="text-xs text-[var(--kq-text-secondary)]">Pending Weekly Lift</div>
          <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-emerald)] mt-1">
            +${pendingWeeklyLift}/wk
          </div>
          <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5 font-mono-tabular">
            {pendingInsights.length} facing swaps ready
          </div>
        </div>

        <div className="glacier-card rounded-lg p-3.5">
          <div className="text-xs text-[var(--kq-text-secondary)]">Captured Revenue Lift</div>
          <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-accent)] mt-1">
            +${capturedWeeklyLift}/wk
          </div>
          <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5 font-mono-tabular">
            {appliedInsights.length} swaps applied today
          </div>
        </div>

        <div className="glacier-card rounded-lg p-3.5">
          <div className="text-xs text-[var(--kq-text-secondary)]">Annualized Impact</div>
          <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-text)] mt-1">
            +${((pendingWeeklyLift + capturedWeeklyLift) * 52).toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5">
            Projected store gain
          </div>
        </div>

        <div className="glacier-card rounded-lg p-3.5">
          <div className="text-xs text-[var(--kq-text-secondary)]">Avg Model Confidence</div>
          <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-text)] mt-1">
            92.4%
          </div>
          <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5">
            POS + door-open telemetry
          </div>
        </div>
      </div>

      {/* Live Google Search Grounding Beverage Intelligence */}
      <div className="glacier-glass rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
              <Globe className="w-4 h-4" />
              <span>LIVE GOOGLE SEARCH GROUNDING · GEMINI-4-HYDROGEN</span>
            </div>
            <h2 className="text-base font-semibold text-[var(--kq-text)] mt-1">
              Live Beverage Market Intelligence
            </h2>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runMarketSearch(marketQuery);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--kq-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={marketQuery}
              onChange={(e) => setMarketQuery(e.target.value)}
              placeholder="Search live beverage trends, seasonal demand, or c-store category benchmarks..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] placeholder:text-[var(--kq-text-muted)] focus:outline-none focus:border-[var(--kq-accent)]"
            />
          </div>
          <button
            type="submit"
            disabled={marketLoading || !marketQuery.trim()}
            className="min-h-[44px] px-5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            {marketLoading ? 'Searching Web...' : 'Query Live Trends'}
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {MARKET_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => runMarketSearch(preset)}
              disabled={marketLoading}
              className="min-h-[34px] px-3 py-1 rounded bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] hover:border-[var(--kq-accent)] text-[11px] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        {marketError && (
          <div className="rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-4 py-3 text-xs text-[var(--kq-crimson-text)]">
            {marketError}
          </div>
        )}

        {marketResult && (
          <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 space-y-3">
            <div className="text-xs text-[var(--kq-text)] leading-relaxed whitespace-pre-wrap">
              {marketResult.summary}
            </div>
            {marketResult.sources.length > 0 && (
              <div className="pt-3 border-t border-[var(--kq-border)] space-y-1.5">
                <div className="text-[11px] font-mono-tabular text-[var(--kq-accent)] font-semibold">
                  Verified Web Sources ({marketResult.sources.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {marketResult.sources.map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--kq-emerald)] hover:underline truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{src.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Brand Shelf Share vs Velocity */}
        <div className="lg:col-span-7 glacier-card rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--kq-text)]">
                Shelf Share vs. Unit Velocity
              </h2>
              <p className="text-xs text-[var(--kq-text-muted)] mt-0.5">
                Identifies under-faced high-velocity brands across store coolers
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--kq-text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm bg-[var(--kq-border-strong)]"
                  aria-hidden="true"
                />
                Shelf Share %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--kq-accent)]" aria-hidden="true" />
                Sales Velocity %
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {BRAND_VELOCITY_DATA.map((row) => {
              const delta = row.salesVelocityPct - row.shelfSharePct;
              return (
                <div key={row.brand} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-[var(--kq-text)]">{row.brand}</span>
                    </div>
                    <div className="font-mono-tabular flex items-center gap-3">
                      <span className="text-[var(--kq-text-muted)]">
                        {row.shelfSharePct}% space / {row.salesVelocityPct}% sales
                      </span>
                      <span
                        className={
                          delta > 0
                            ? 'text-[var(--kq-emerald)] font-semibold'
                            : 'text-[var(--kq-amber)] font-semibold'
                        }
                      >
                        {delta > 0 ? `+${delta}% under-faced` : `${delta}% over-faced`}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 rounded-sm bg-[var(--kq-surface-muted)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--kq-text-muted)] opacity-45 rounded-sm"
                        style={{ width: `${row.shelfSharePct * 3}%` }}
                      />
                    </div>
                    <div className="h-2 rounded-sm bg-[var(--kq-surface-muted)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--kq-accent)] rounded-sm"
                        style={{ width: `${row.salesVelocityPct * 3}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly Cooler Door Opens & Temp Recovery */}
        <div className="lg:col-span-5 glacier-card rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-base font-semibold text-[var(--kq-text)]">
                Hourly Traffic &amp; Thermal Load
              </h2>
              <span className="text-xs font-mono-tabular text-[var(--kq-accent)] font-medium">
                {selectedHour.hour} · {selectedHour.opens} opens ·{' '}
                {formatTemp(selectedHour.tempF, settings.tempUnit)}
              </span>
            </div>
            <p className="text-xs text-[var(--kq-text-muted)] mb-5">
              Tap or hover a bar to inspect rush-hour door openings and compressor recovery
            </p>
          </div>

          <div className="grid grid-cols-8 gap-2 items-end h-44 pt-4 border-b border-[var(--kq-border)] pb-2">
            {HOURLY_COOLER_TELEMETRY.map((item, idx) => {
              const heightPct = Math.round((item.opens / maxHourlyOpens) * 100);
              const isActive = idx === hoveredHourIdx;
              return (
                <button
                  key={item.hour}
                  type="button"
                  onMouseEnter={() => setHoveredHourIdx(idx)}
                  onClick={() => setHoveredHourIdx(idx)}
                  className="h-full flex flex-col items-center justify-end gap-1.5 group focus-visible:outline-none"
                >
                  <span className="text-[10px] font-mono-tabular text-[var(--kq-text-secondary)]">
                    {item.opens}
                  </span>
                  <div className="w-full flex items-end justify-center flex-1">
                    <div
                      className={`w-full max-w-[24px] rounded-t transition-colors ${
                        isActive
                          ? 'bg-[var(--kq-accent)]'
                          : 'bg-[var(--kq-surface-elevated)] group-hover:bg-[var(--kq-accent-border)]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-mono-tabular ${
                      isActive
                        ? 'text-[var(--kq-accent)] font-semibold'
                        : 'text-[var(--kq-text-muted)]'
                    }`}
                  >
                    {item.hour}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[var(--kq-text-secondary)]">
            <span>Peak traffic window: 4:00 PM – 6:00 PM</span>
            <span className="font-mono-tabular text-[var(--kq-emerald)] font-medium">
              Recovery &lt; 4.2 min
            </span>
          </div>
        </div>
      </div>

      {/* Actionable AI Recommendations Queue */}
      <div className="glacier-card rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--kq-emerald)]" />
            <h2 className="text-base font-semibold text-[var(--kq-text)]">
              AI Facing Swap Recommendations
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] self-start">
            {(
              [
                { id: 'pending', label: `Pending (${pendingInsights.length})` },
                { id: 'applied', label: `Applied (${appliedInsights.length})` },
                { id: 'all', label: 'All' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[36px] px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                    : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {visibleInsights.length === 0 ? (
          <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-6 text-center text-sm text-[var(--kq-text-secondary)]">
            No recommendations in this view. Switch tabs to review applied swaps.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleInsights.map((ins) => {
              const currentSku = skuCatalog[ins.currentSkuId];
              const recSku = skuCatalog[ins.recommendedSkuId];
              const isApplied = ins.status === 'applied';

              return (
                <div
                  key={ins.id}
                  className={`rounded-lg p-4 border transition-colors ${
                    isApplied
                      ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)]'
                      : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] hover:border-[var(--kq-accent-border)]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                        <span className="text-[var(--kq-accent)] font-semibold">{ins.doorLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[var(--kq-text)]">Slot {ins.slotCoord}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[var(--kq-emerald)] font-semibold">
                          +{ins.projectedLiftPct}% REV (+${ins.weeklyDollarGain}/wk)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[var(--kq-text-muted)]">
                          {ins.confidence}% confidence
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <BeverageVisual sku={currentSku} size="sm" dimmed />
                          <span className="text-xs text-[var(--kq-text-muted)] line-through">
                            {currentSku.name}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--kq-emerald)] shrink-0" />
                        <div className="flex items-center gap-2">
                          <BeverageVisual sku={recSku} size="sm" />
                          <span className="text-sm font-semibold text-[var(--kq-text)]">
                            {recSku.name}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--kq-text-secondary)] leading-relaxed">
                        {ins.rationale}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onPreviewDoor(ins.doorId)}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Door
                      </button>

                      {isApplied ? (
                        <span className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-emerald-soft)] border border-[var(--kq-emerald)] text-[var(--kq-emerald-text)] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
                          <Check className="w-4 h-4" />
                          Applied to Planogram
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onDismissInsight(ins.id)}
                            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-muted)] hover:text-[var(--kq-crimson)] hover:border-[var(--kq-crimson)] transition-colors flex items-center justify-center"
                            aria-label="Dismiss recommendation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onApplyInsight(ins.id)}
                            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-emerald)] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Apply Swap
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
