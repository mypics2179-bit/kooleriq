import React, { useMemo, useState } from 'react';
import { Check, FileSpreadsheet, Images, PackageCheck, Plus, ScanBarcode, Search } from 'lucide-react';
import { BrandId, CoolerDoor, SkuItem, StoreSettings } from '../types/kooleriq';
import { BeverageVisual } from './BeverageVisual';

interface InventoryScreenProps {
  doors: CoolerDoor[];
  skuCatalog: Record<string, SkuItem>;
  carriedSkuIds: string[];
  settings: StoreSettings;
  onPullSkuToFloor: (skuId: string) => void;
  onOrderBackroomCase: (skuId: string) => void;
  onToggleCarriedSku: (skuId: string) => void;
  onOpenAddSkuModal: () => void;
  onOpenScanner: () => void;
  onOpenCsvHub: () => void;
  onOpenImageLibrary: () => void;
  onBatchRestockOos: () => void;
}

type StockFilter = 'all' | 'oos' | 'low' | 'optimal';
type AssortmentFilter = 'carried' | 'catalog';

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  doors,
  skuCatalog,
  carriedSkuIds,
  settings,
  onPullSkuToFloor,
  onOrderBackroomCase,
  onToggleCarriedSku,
  onOpenAddSkuModal,
  onOpenScanner,
  onOpenCsvHub,
  onOpenImageLibrary,
  onBatchRestockOos,
}) => {
  const [search, setSearch] = useState('');
  const [distributorFilter, setDistributorFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<'all' | BrandId>('all');
  const [statusFilter, setStatusFilter] = useState<StockFilter>('all');
  const [assortmentFilter, setAssortmentFilter] = useState<AssortmentFilter>('carried');

  const carriedSet = useMemo(() => new Set(carriedSkuIds), [carriedSkuIds]);

  const inventoryRows = useMemo(() => {
    const skuAgg: Record<
      string,
      {
        sku: SkuItem;
        isCarried: boolean;
        floorQty: number;
        floorCapacity: number;
        oosSlots: number;
        lowSlots: number;
        locations: string[];
      }
    > = {};

    Object.values(skuCatalog).forEach((sku) => {
      skuAgg[sku.id] = {
        sku,
        isCarried: carriedSet.has(sku.id),
        floorQty: 0,
        floorCapacity: 0,
        oosSlots: 0,
        lowSlots: 0,
        locations: [],
      };
    });

    doors.forEach((door) => {
      door.shelves.flat().forEach((slot) => {
        const entry = skuAgg[slot.skuId];
        if (!entry) return;
        entry.isCarried = true;
        entry.floorQty += slot.currentDepth;
        entry.floorCapacity += slot.maxDepth;
        if (slot.currentDepth === 0) {
          entry.oosSlots += 1;
        } else if (slot.currentDepth / slot.maxDepth <= settings.lowStockThresholdPct / 100) {
          entry.lowSlots += 1;
        }
        entry.locations.push(`D${door.number}·${slot.coord}`);
      });
    });

    return Object.values(skuAgg).sort((a, b) => {
      if (b.oosSlots !== a.oosSlots) return b.oosSlots - a.oosSlots;
      if (b.lowSlots !== a.lowSlots) return b.lowSlots - a.lowSlots;
      if (b.locations.length !== a.locations.length) return b.locations.length - a.locations.length;
      return b.sku.weeklyVelocity - a.sku.weeklyVelocity;
    });
  }, [doors, skuCatalog, carriedSet, settings.lowStockThresholdPct]);

  const distributorOptions = useMemo(() => {
    const set = new Set<string>();
    inventoryRows.forEach((r) => {
      set.add(r.sku.distributor || 'Direct / House');
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inventoryRows]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    inventoryRows.forEach((r) => {
      if (r.sku.category) set.add(r.sku.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inventoryRows]);

  const brandOptions = useMemo(() => {
    const map = new Map<BrandId, string>();
    inventoryRows.forEach((r) => {
      if (!map.has(r.sku.brand)) {
        map.set(r.sku.brand, r.sku.brandLabel);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [inventoryRows]);

  const carriedRows = useMemo(
    () => inventoryRows.filter((r) => r.isCarried),
    [inventoryRows]
  );

  const totalOosSlots = carriedRows.reduce((sum, r) => sum + r.oosSlots, 0);
  const totalFloorUnits = carriedRows.reduce((sum, r) => sum + r.floorQty, 0);
  const totalBackroomUnits = carriedRows.reduce((sum, r) => sum + r.sku.backroomQty, 0);

  const filteredRows = useMemo(() => {
    return inventoryRows.filter((row) => {
      if (assortmentFilter === 'carried' && !row.isCarried) return false;
      const q = search.trim().toLowerCase();
      if (
        q &&
        !row.sku.name.toLowerCase().includes(q) &&
        !row.sku.skuCode.toLowerCase().includes(q) &&
        !row.sku.brandLabel.toLowerCase().includes(q) &&
        !(row.sku.upc && row.sku.upc.toLowerCase().includes(q)) &&
        !(row.sku.materialSku && row.sku.materialSku.toLowerCase().includes(q)) &&
        !(row.sku.distributor && row.sku.distributor.toLowerCase().includes(q)) &&
        !(row.sku.category && row.sku.category.toLowerCase().includes(q))
      ) {
        return false;
      }
      const distLabel = row.sku.distributor || 'Direct / House';
      if (distributorFilter !== 'all' && distLabel !== distributorFilter) return false;
      if (categoryFilter !== 'all' && (row.sku.category || '') !== categoryFilter) return false;
      if (brandFilter !== 'all' && row.sku.brand !== brandFilter) return false;
      if (statusFilter === 'oos' && row.oosSlots === 0) return false;
      if (statusFilter === 'low' && row.lowSlots === 0 && row.oosSlots === 0) return false;
      if (statusFilter === 'optimal' && (row.oosSlots > 0 || row.lowSlots > 0)) return false;
      return true;
    });
  }, [
    inventoryRows,
    assortmentFilter,
    search,
    distributorFilter,
    categoryFilter,
    brandFilter,
    statusFilter,
  ]);

  return (
    <div className="space-y-5">
      {/* Top Summary & Batch Picklist Action */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <div className="glacier-card rounded-lg p-3.5">
            <div className="text-xs text-[var(--kq-text-secondary)]">Floor Units Stocked</div>
            <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-text)] mt-1">
              {totalFloorUnits}
            </div>
            <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5 font-mono-tabular">
              {doors.length} cooler doors · {carriedRows.length} SKUs carried
            </div>
          </div>

          <div className="glacier-card rounded-lg p-3.5">
            <div className="text-xs text-[var(--kq-text-secondary)]">Walk-In Backstock</div>
            <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-accent)] mt-1">
              {totalBackroomUnits}
            </div>
            <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5 font-mono-tabular">
              {inventoryRows.length} master UPCs synced
            </div>
          </div>

          <div className="glacier-card rounded-lg p-3.5">
            <div className="text-xs text-[var(--kq-text-secondary)]">Critical OOS Gaps</div>
            <div
              className={`text-2xl font-mono-tabular font-bold mt-1 ${
                totalOosSlots > 0 ? 'text-[var(--kq-crimson)]' : 'text-[var(--kq-emerald)]'
              }`}
            >
              {totalOosSlots}
            </div>
            <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5">Facings at 0 depth</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenCsvHub}
            className="min-h-[48px] px-4 py-2.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:border-[var(--kq-accent)] font-medium text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-[var(--kq-accent)]" />
            CSV Import / Export
          </button>

          <button
            type="button"
            onClick={onOpenImageLibrary}
            className="min-h-[48px] px-4 py-2.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:border-[var(--kq-accent)] font-medium text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Images className="w-4 h-4 text-[var(--kq-accent)]" />
            Image Library
          </button>

          <button
            type="button"
            onClick={onOpenScanner}
            className="min-h-[48px] px-4 py-2.5 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] font-semibold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ScanBarcode className="w-4 h-4" />
            Scan Barcode / QR
          </button>

          <button
            type="button"
            onClick={onOpenAddSkuModal}
            className="min-h-[48px] px-4 py-2.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] font-semibold text-xs hover:bg-[var(--kq-accent-soft)] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Drink SKU
          </button>

          <button
            type="button"
            onClick={onBatchRestockOos}
            disabled={totalOosSlots === 0}
            className="min-h-[48px] px-5 py-3 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold text-sm hover:bg-[var(--kq-accent-hover)] disabled:opacity-45 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <PackageCheck className="w-4 h-4" />
            {totalOosSlots > 0
              ? `Pull & Restock ${totalOosSlots} OOS`
              : 'All Facings Stocked'}
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glacier-card rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--kq-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search beverage, UPC barcode, SKU #, or distributor..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] placeholder:text-[var(--kq-text-muted)] focus:outline-none focus:border-[var(--kq-accent)] transition-all"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] overflow-x-auto">
            <button
              type="button"
              onClick={() => setAssortmentFilter('carried')}
              className={`min-h-[36px] px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                assortmentFilter === 'carried'
                  ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] font-semibold shadow-sm'
                  : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
              }`}
            >
              Carried Here ({carriedRows.length})
            </button>
            <button
              type="button"
              onClick={() => setAssortmentFilter('catalog')}
              className={`min-h-[36px] px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                assortmentFilter === 'catalog'
                  ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] font-semibold shadow-sm'
                  : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
              }`}
            >
              Master Catalog ({inventoryRows.length})
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All Status' },
                { id: 'oos', label: 'OOS' },
                { id: 'low', label: 'Low Stock' },
                { id: 'optimal', label: 'Optimal' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                className={`min-h-[36px] px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === s.id
                    ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                    : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Distributor, Category & Brand Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="sr-only" htmlFor="inv-dist-filter">
              Distributor Filter
            </label>
            <select
              id="inv-dist-filter"
              value={distributorFilter}
              onChange={(e) => setDistributorFilter(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
            >
              <option value="all">All Distributors ({distributorOptions.length})</option>
              {distributorOptions.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="sr-only" htmlFor="inv-cat-filter">
              Category Filter
            </label>
            <select
              id="inv-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
            >
              <option value="all">All Beverage Categories ({categoryOptions.length})</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="sr-only" htmlFor="inv-brand-filter">
              Brand Filter
            </label>
            <select
              id="inv-brand-filter"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value as 'all' | BrandId)}
              className="w-full min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
            >
              <option value="all">All Brands ({brandOptions.length})</option>
              {brandOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Catalog Grid / Table */}
      <div className="glacier-card rounded-xl overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--kq-text-secondary)]">
            No SKUs match your current search or filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-[var(--kq-border)]">
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 bg-[var(--kq-surface-muted)] text-[11px] font-semibold text-[var(--kq-text-muted)]">
              <div className="col-span-4">SKU, UPC &amp; Distributor</div>
              <div className="col-span-2">Category &amp; Locations</div>
              <div className="col-span-2 text-right">Wholesale &amp; Margin</div>
              <div className="col-span-1 text-right">Stock</div>
              <div className="col-span-3 text-right">Store Assortment &amp; Pull</div>
            </div>

            {filteredRows.map((row) => {
              const needsFloorPull = row.floorQty < row.floorCapacity;
              const isCritical = row.oosSlots > 0;
              const isLow = !isCritical && row.lowSlots > 0;
              const onFloor = row.locations.length > 0;
              const caseUnits = row.sku.unitsPerCase ?? 12;

              return (
                <div
                  key={row.sku.id}
                  className="p-4 lg:px-5 lg:py-3.5 hover:bg-[var(--kq-surface-muted)]/50 transition-colors grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center"
                >
                  {/* SKU Info + UPC */}
                  <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-14 rounded bg-[var(--kq-cabinet)] border border-[var(--kq-border)] flex items-center justify-center shrink-0">
                      <BeverageVisual sku={row.sku} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.sku.brandColor }}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-semibold text-[var(--kq-text)] truncate">
                          {row.sku.name}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--kq-text-muted)] font-mono-tabular mt-0.5 truncate">
                        {row.sku.upc ? `UPC ${row.sku.upc}` : row.sku.skuCode} ·{' '}
                        {row.sku.distributor || 'Direct'}
                      </div>
                    </div>
                  </div>

                  {/* Category & Locations */}
                  <div className="lg:col-span-2 min-w-0">
                    <div className="text-xs font-medium text-[var(--kq-text)] truncate">
                      {row.sku.category || row.sku.brandLabel}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] truncate mt-0.5">
                      {onFloor
                        ? row.locations.slice(0, 3).join(', ') +
                          (row.locations.length > 3 ? ` +${row.locations.length - 3}` : '')
                        : row.isCarried
                          ? 'Carried (Unassigned)'
                          : 'Not Carried Here'}
                    </div>
                  </div>

                  {/* Wholesale & Margin */}
                  <div className="lg:col-span-2 lg:text-right font-mono-tabular text-xs">
                    <div className="text-[var(--kq-text)] font-semibold">
                      {typeof row.sku.netUnitCost === 'number'
                        ? `$${row.sku.netUnitCost.toFixed(2)} → $${row.sku.price.toFixed(2)}`
                        : `$${row.sku.price.toFixed(2)} retail`}
                      {row.sku.marginPct > 0 && (
                        <span className="text-[var(--kq-emerald)] ml-1.5">
                          ({row.sku.marginPct.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5">
                      {typeof row.sku.netCaseCost === 'number'
                        ? `$${row.sku.netCaseCost.toFixed(2)} / ${caseUnits}u cs`
                        : `${caseUnits}u case`}
                    </div>
                  </div>

                  {/* Floor & Backroom Stock */}
                  <div className="lg:col-span-1 lg:text-right font-mono-tabular text-xs">
                    {onFloor ? (
                      <div
                        className={
                          isCritical
                            ? 'text-[var(--kq-crimson)] font-semibold'
                            : isLow
                              ? 'text-[var(--kq-amber)] font-semibold'
                              : 'text-[var(--kq-emerald)] font-semibold'
                        }
                      >
                        {row.floorQty}/{row.floorCapacity}
                      </div>
                    ) : (
                      <div className="text-[var(--kq-text-muted)]">—</div>
                    )}
                    <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5">
                      {row.sku.backroomQty}u back
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-3 flex items-center lg:justify-end gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onToggleCarriedSku(row.sku.id)}
                      disabled={onFloor}
                      title={
                        onFloor
                          ? 'Assigned to active cooler facing'
                          : 'Toggle whether this store carries this drink'
                      }
                      className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                        row.isCarried
                          ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                          : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border-strong)] text-[var(--kq-text-muted)] hover:text-[var(--kq-text)]'
                      } disabled:opacity-80`}
                    >
                      {row.isCarried ? 'Carried' : '+ Carry Here'}
                    </button>

                    {onFloor && (
                      <button
                        type="button"
                        onClick={() => onPullSkuToFloor(row.sku.id)}
                        disabled={!needsFloorPull || row.sku.backroomQty === 0}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 disabled:opacity-35 transition-opacity flex items-center gap-1 whitespace-nowrap"
                      >
                        {needsFloorPull ? (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Fill Floor
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Full
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOrderBackroomCase(row.sku.id)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium font-mono-tabular hover:border-[var(--kq-accent)] transition-colors whitespace-nowrap"
                    >
                      +1 Case ({caseUnits}u)
                    </button>
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
