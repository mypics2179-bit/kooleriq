import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  Minus,
  PackageCheck,
  Plus,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import {
  BillingCycle,
  CoolerDoor,
  DistributorOrderLine,
  DistributorOrderRecord,
  PlanTier,
  SkuItem,
  StoreSettings,
  SubscriptionState,
} from '../types/kooleriq';
import { BeverageVisual } from './BeverageVisual';
import { PricingScreen } from './PricingScreen';

interface OrdersScreenProps {
  doors: CoolerDoor[];
  skuCatalog: Record<string, SkuItem>;
  carriedSkuIds: string[];
  settings: StoreSettings;
  orders: DistributorOrderRecord[];
  subscription: SubscriptionState;
  isAuthenticated: boolean;
  isSavingPlan: boolean;
  onSubmitOrder: (payload: {
    lines: DistributorOrderLine[];
    receiveImmediately: boolean;
  }) => void;
  onSelectPlan: (
    planTier: PlanTier,
    billingCycle: BillingCycle,
    doorQuota: number,
    storeCount: number
  ) => void;
  onSignInPrompt: () => void;
  onExportEventLogged: (label: string) => void;
}

interface DraftRow {
  sku: SkuItem;
  distributor: string;
  coolerGapUnits: number;
  backroomShortfall: number;
  suggestedCases: number;
  unitsPerCase: number;
  netCaseCost: number;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  doors,
  skuCatalog,
  carriedSkuIds,
  settings,
  orders,
  subscription,
  isAuthenticated,
  isSavingPlan,
  onSubmitOrder,
  onSelectPlan,
  onSignInPrompt,
  onExportEventLogged,
}) => {
  const [subTab, setSubTab] = useState<'restock' | 'plans'>('restock');
  const [distributorFilter, setDistributorFilter] = useState<string>('all');
  const [caseOverrides, setCaseOverrides] = useState<Record<string, number>>({});
  const [receiveImmediately, setReceiveImmediately] = useState(true);

  const coolerGapsBySku = useMemo(() => {
    const gaps: Record<string, number> = {};
    doors.forEach((door) => {
      door.shelves.flat().forEach((slot) => {
        const deficit = Math.max(0, slot.maxDepth - slot.currentDepth);
        if (deficit > 0) {
          gaps[slot.skuId] = (gaps[slot.skuId] || 0) + deficit;
        }
      });
    });
    return gaps;
  }, [doors]);

  const draftRows = useMemo<DraftRow[]>(() => {
    const carriedSet = new Set(carriedSkuIds);
    const items = Object.values(skuCatalog).filter(
      (sku) => carriedSet.has(sku.id) || (coolerGapsBySku[sku.id] || 0) > 0
    );

    return items
      .map((sku) => {
        const coolerGapUnits = coolerGapsBySku[sku.id] || 0;
        const backroomShortfall = Math.max(0, sku.parLevel - sku.backroomQty);
        const totalNeededUnits = coolerGapUnits + backroomShortfall;
        const unitsPerCase = sku.unitsPerCase ?? 12;
        const suggestedCases =
          totalNeededUnits > 0 ? Math.max(1, Math.ceil(totalNeededUnits / unitsPerCase)) : 0;
        const netCaseCost =
          typeof sku.netCaseCost === 'number' && sku.netCaseCost > 0
            ? sku.netCaseCost
            : Number((sku.price * unitsPerCase * (1 - sku.marginPct / 100)).toFixed(2));

        return {
          sku,
          distributor: sku.distributor || 'Direct / House',
          coolerGapUnits,
          backroomShortfall,
          suggestedCases,
          unitsPerCase,
          netCaseCost,
        };
      })
      .sort((a, b) => {
        if (b.suggestedCases !== a.suggestedCases) return b.suggestedCases - a.suggestedCases;
        return b.coolerGapUnits - a.coolerGapUnits;
      });
  }, [skuCatalog, carriedSkuIds, coolerGapsBySku]);

  const distributors = useMemo(() => {
    const set = new Set<string>();
    draftRows.forEach((r) => set.add(r.distributor));
    return ['all', ...Array.from(set).sort()];
  }, [draftRows]);

  const filteredRows = useMemo(() => {
    return draftRows.filter((row) =>
      distributorFilter === 'all' ? true : row.distributor === distributorFilter
    );
  }, [draftRows, distributorFilter]);

  const getCasesForRow = (row: DraftRow): number => {
    if (typeof caseOverrides[row.sku.id] === 'number') {
      return caseOverrides[row.sku.id];
    }
    return row.suggestedCases;
  };

  const activeOrderSummary = useMemo(() => {
    const lines: DistributorOrderLine[] = [];
    let totalCases = 0;
    let totalUnits = 0;
    let totalWholesaleCost = 0;
    let totalRetailValue = 0;

    filteredRows.forEach((row) => {
      const cases = getCasesForRow(row);
      if (cases <= 0) return;
      const units = cases * row.unitsPerCase;
      const cost = cases * row.netCaseCost;
      totalCases += cases;
      totalUnits += units;
      totalWholesaleCost += cost;
      totalRetailValue += units * row.sku.price;
      lines.push({
        skuId: row.sku.id,
        skuName: row.sku.name,
        upc: row.sku.upc,
        distributor: row.distributor,
        cases,
        unitsPerCase: row.unitsPerCase,
        netCaseCost: row.netCaseCost,
      });
    });

    return {
      lines,
      totalCases,
      totalUnits,
      totalWholesaleCost,
      totalRetailValue,
      estGrossProfit: Math.max(0, totalRetailValue - totalWholesaleCost),
    };
  }, [filteredRows, caseOverrides]);

  const handleSetCases = (skuId: string, next: number) => {
    setCaseOverrides((prev) => ({
      ...prev,
      [skuId]: Math.max(0, Math.min(99, next)),
    }));
  };

  const handleDownloadPoCsv = () => {
    if (activeOrderSummary.lines.length === 0) return;
    const header =
      'Store,Store Code,Distributor,SKU Name,UPC,Cases,Units/Case,Total Units,Net Case Cost,Line Wholesale Total\n';
    const body = activeOrderSummary.lines
      .map((l) =>
        [
          `"${settings.storeName.replace(/"/g, '""')}"`,
          settings.storeCode,
          `"${l.distributor.replace(/"/g, '""')}"`,
          `"${l.skuName.replace(/"/g, '""')}"`,
          l.upc || '',
          l.cases,
          l.unitsPerCase,
          l.cases * l.unitsPerCase,
          l.netCaseCost.toFixed(2),
          (l.cases * l.netCaseCost).toFixed(2),
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kooleriq-po-${settings.storeCode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onExportEventLogged('Distributor Purchase Order CSV');
  };

  const handleSubmitPo = () => {
    if (activeOrderSummary.lines.length === 0) return;
    onSubmitOrder({
      lines: activeOrderSummary.lines,
      receiveImmediately,
    });
    const resetMap: Record<string, number> = {};
    activeOrderSummary.lines.forEach((l) => {
      resetMap[l.skuId] = 0;
    });
    setCaseOverrides((prev) => ({ ...prev, ...resetMap }));
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation between Replenishment Orders & Google Play Plans */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] w-fit">
          <button
            type="button"
            onClick={() => setSubTab('restock')}
            className={`min-h-[38px] px-4 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'restock'
                ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] shadow-sm'
                : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Distributor Restock Orders
          </button>
          <button
            type="button"
            onClick={() => setSubTab('plans')}
            className={`min-h-[38px] px-4 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'plans'
                ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] shadow-sm'
                : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Plans &amp; Door Quotas
          </button>
        </div>

        {subTab === 'restock' && (
          <div className="flex items-center gap-2 flex-wrap">
            {distributors.map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => setDistributorFilter(dist)}
                className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                  distributorFilter === dist
                    ? 'bg-[var(--kq-accent)] border-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                    : 'bg-[var(--kq-surface)] border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                }`}
              >
                {dist === 'all' ? 'All Distributors' : dist}
              </button>
            ))}
          </div>
        )}
      </div>

      {subTab === 'plans' ? (
        <PricingScreen
          subscription={subscription}
          isAuthenticated={isAuthenticated}
          isSaving={isSavingPlan}
          onSelectPlan={onSelectPlan}
          onSignInPrompt={onSignInPrompt}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 8 Columns: Replenishment Picklist & Case Ordering */}
          <div className="lg:col-span-8 glacier-card rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[var(--kq-border)] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--kq-text)]">
                  Auto-Calculated Cooler &amp; Walk-In Replenishment
                </h2>
                <p className="text-xs text-[var(--kq-text-muted)] mt-0.5">
                  Computed from empty cooler facings and walk-in par deficits across {doors.length} doors
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCaseOverrides({})}
                className="min-h-[34px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]"
              >
                Reset to Suggested
              </button>
            </div>

            <div className="divide-y divide-[var(--kq-border)] max-h-[540px] overflow-y-auto">
              {filteredRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--kq-text-muted)]">
                  No beverages match the active distributor filter.
                </div>
              ) : (
                filteredRows.map((row) => {
                  const cases = getCasesForRow(row);
                  const lineTotal = cases * row.netCaseCost;
                  const needsStock = row.coolerGapUnits > 0 || row.backroomShortfall > 0;

                  return (
                    <div
                      key={row.sku.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--kq-surface-muted)]/35 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-14 rounded bg-[var(--kq-cabinet)] border border-[var(--kq-border)] flex items-center justify-center shrink-0">
                          <BeverageVisual sku={row.sku} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--kq-text)] truncate">
                            {row.sku.name}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] mt-0.5 truncate">
                            {row.distributor} · {row.sku.upc ? `UPC ${row.sku.upc}` : row.sku.skuCode} ·{' '}
                            {row.unitsPerCase}u/case · ${row.netCaseCost.toFixed(2)}/cs
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular mt-1">
                            {row.coolerGapUnits > 0 && (
                              <span className="text-[var(--kq-crimson)] font-semibold">
                                Cooler Gap: {row.coolerGapUnits}u
                              </span>
                            )}
                            {row.backroomShortfall > 0 && (
                              <span className="text-[var(--kq-amber)] font-semibold">
                                Walk-In Short: {row.backroomShortfall}u
                              </span>
                            )}
                            {!needsStock && (
                              <span className="text-[var(--kq-emerald)]">
                                At Par ({row.sku.backroomQty}u walk-in)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right font-mono-tabular">
                          <div className="text-xs font-bold text-[var(--kq-text)]">
                            ${lineTotal.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-[var(--kq-text-muted)]">
                            {cases * row.unitsPerCase} units
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetCases(row.sku.id, cases - 1)}
                            disabled={cases <= 0}
                            className="min-h-[38px] min-w-[38px] rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)] disabled:opacity-40"
                            aria-label={`Decrease cases for ${row.sku.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-9 text-center font-mono-tabular text-xs font-bold text-[var(--kq-text)]">
                            {cases}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetCases(row.sku.id, cases + 1)}
                            className="min-h-[38px] min-w-[38px] rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
                            aria-label={`Increase cases for ${row.sku.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right 4 Columns: PO Summary & Recent Order History */}
          <div className="lg:col-span-4 space-y-5">
            <div className="glacier-card rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--kq-text)] flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[var(--kq-accent)]" />
                  Purchase Order Summary
                </h3>
                <span className="text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
                  {activeOrderSummary.lines.length} SKUs
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3">
                  <div className="text-[var(--kq-text-muted)]">Order Cases</div>
                  <div className="text-lg font-mono-tabular font-bold text-[var(--kq-text)] mt-0.5">
                    {activeOrderSummary.totalCases} cs
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)]">
                    {activeOrderSummary.totalUnits} units
                  </div>
                </div>

                <div className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3">
                  <div className="text-[var(--kq-text-muted)]">Net Wholesale</div>
                  <div className="text-lg font-mono-tabular font-bold text-[var(--kq-text)] mt-0.5">
                    ${activeOrderSummary.totalWholesaleCost.toFixed(2)}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[var(--kq-emerald)] font-medium">
                    +${activeOrderSummary.estGrossProfit.toFixed(0)} est. profit
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[var(--kq-text-secondary)] cursor-pointer rounded-lg bg-[var(--kq-surface-muted)]/60 border border-[var(--kq-border)] p-3">
                <input
                  type="checkbox"
                  checked={receiveImmediately}
                  onChange={(e) => setReceiveImmediately(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--kq-border-strong)] accent-[var(--kq-accent)]"
                />
                <span>
                  <strong className="text-[var(--kq-text)] block">
                    Receive Cases into Walk-In Stock
                  </strong>
                  Increment backroom unit counts immediately upon PO submission.
                </span>
              </label>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={activeOrderSummary.lines.length === 0}
                  onClick={handleSubmitPo}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-45 transition-colors flex items-center justify-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  Submit Order ({activeOrderSummary.totalCases} Cases)
                </button>

                <button
                  type="button"
                  disabled={activeOrderSummary.lines.length === 0}
                  onClick={handleDownloadPoCsv}
                  className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] disabled:opacity-45 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Export Distributor PO CSV
                </button>
              </div>
            </div>

            {/* Order History */}
            <div className="glacier-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--kq-text)]">
                  Recent Distributor Orders
                </h3>
                <span className="text-xs font-mono-tabular text-[var(--kq-text-muted)]">
                  {orders.length} total
                </span>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-[var(--kq-text-muted)]">
                  No orders submitted yet. Adjust case quantities and submit your first Swire or
                  PepsiCo restock PO above.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {orders.slice(0, 6).map((ord) => (
                    <div
                      key={ord.id}
                      className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono-tabular font-semibold text-[var(--kq-text)]">
                          {ord.poNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--kq-emerald)]">
                          <CheckCircle2 className="w-3 h-3" />
                          {ord.status === 'received' ? 'Received' : 'Submitted'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono-tabular text-[var(--kq-text-secondary)]">
                        {ord.distributorSummary} · {ord.totalCases} cs ({ord.totalUnits}u) · $
                        {ord.totalWholesaleCost.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-mono-tabular text-[var(--kq-text-muted)]">
                        {new Date(ord.createdAtIso).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
