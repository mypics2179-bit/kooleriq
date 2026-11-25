import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  Minus,
  Plus,
  RefreshCw,
  ScanBarcode,
  SlidersHorizontal,
  Sparkles,
  ThermometerSnowflake,
  X,
} from 'lucide-react';
import { CoolerDoor, FacingSlot, SkuItem, StoreSettings } from '../types/kooleriq';
import { formatTemp, getDoorMetrics, HARDWARE_LABELS } from '../utils/formatters';
import { BeverageVisual } from './BeverageVisual';

interface PlanogramScreenProps {
  doors: CoolerDoor[];
  selectedDoorId: string;
  onSelectDoor: (doorId: string) => void;
  skuCatalog: Record<string, SkuItem>;
  carriedSkuIds: string[];
  settings: StoreSettings;
  onAdjustDepth: (doorId: string, slotId: string, delta: number) => void;
  onRestockFull: (doorId: string, slotId: string) => void;
  onAssignSlotSku: (doorId: string, slotId: string, newSkuId: string) => void;
  onApplySlotAi: (doorId: string, slotId: string) => void;
  onFixViolation: (doorId: string, slotId: string) => void;
  onOptimizeDoor: (doorId: string) => void;
  onRestockAllDoorOos: (doorId: string) => void;
  onOpenDoorEditor: () => void;
  onOpenAddSkuModal: () => void;
  onOpenScannerForSlot: (target: {
    doorId: string;
    doorNumber: string;
    slotId: string;
    slotCoord: string;
  }) => void;
  onGoToAudit: () => void;
}

type PlanogramFilter = 'all' | 'oos' | 'ai' | 'low';

function getShelfGridClass(count: number): string {
  if (count <= 3) return 'grid-cols-3';
  if (count === 4) return 'grid-cols-2 sm:grid-cols-4';
  if (count === 5) return 'grid-cols-2 sm:grid-cols-5';
  if (count === 6) return 'grid-cols-3 sm:grid-cols-6';
  if (count === 7) return 'grid-cols-3 sm:grid-cols-7';
  return 'grid-cols-4 sm:grid-cols-8';
}

export const PlanogramScreen: React.FC<PlanogramScreenProps> = ({
  doors,
  selectedDoorId,
  onSelectDoor,
  skuCatalog,
  carriedSkuIds,
  settings,
  onAdjustDepth,
  onRestockFull,
  onAssignSlotSku,
  onApplySlotAi,
  onFixViolation,
  onOptimizeDoor,
  onRestockAllDoorOos,
  onOpenDoorEditor,
  onOpenAddSkuModal,
  onOpenScannerForSlot,
  onGoToAudit,
}) => {
  const [filter, setFilter] = useState<PlanogramFilter>('all');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const activeDoor = useMemo(
    () => doors.find((d) => d.id === selectedDoorId) ?? doors[0],
    [doors, selectedDoorId]
  );

  const metrics = useMemo(() => getDoorMetrics(activeDoor), [activeDoor]);

  const selectedSlot: FacingSlot | undefined = useMemo(() => {
    const flat = activeDoor.shelves.flat();
    return flat.find((s) => s.id === selectedSlotId) ?? flat[0];
  }, [activeDoor, selectedSlotId]);

  const { carriedOptions, catalogOptions } = useMemo(() => {
    const carriedSet = new Set(carriedSkuIds);
    const carried: SkuItem[] = [];
    const catalog: SkuItem[] = [];
    Object.values(skuCatalog).forEach((sku) => {
      if (carriedSet.has(sku.id) || sku.id === selectedSlot?.skuId) {
        carried.push(sku);
      } else {
        catalog.push(sku);
      }
    });
    carried.sort((a, b) => a.name.localeCompare(b.name));
    catalog.sort((a, b) => a.name.localeCompare(b.name));
    return { carriedOptions: carried, catalogOptions: catalog };
  }, [skuCatalog, carriedSkuIds, selectedSlot?.skuId]);

  const handleDoorSwitch = (doorId: string) => {
    onSelectDoor(doorId);
    const door = doors.find((d) => d.id === doorId);
    if (door && door.shelves[0]?.[0]) {
      setSelectedSlotId(door.shelves[0][0].id);
    }
  };

  const handleSlotClick = (slot: FacingSlot) => {
    setSelectedSlotId(slot.id);
    if (window.innerWidth < 1024) {
      setMobileSheetOpen(true);
    }
  };

  const matchesFilter = (slot: FacingSlot): boolean => {
    if (filter === 'all') return true;
    if (filter === 'oos') return slot.currentDepth === 0 || slot.status === 'oos';
    if (filter === 'ai') return Boolean(slot.aiRecommendation && !slot.aiRecommendation.applied);
    if (filter === 'low') {
      return (
        slot.currentDepth > 0 &&
        (slot.status === 'low' ||
          slot.status === 'violation' ||
          slot.currentDepth / slot.maxDepth <= settings.lowStockThresholdPct / 100)
      );
    }
    return true;
  };

  const isTempWarning =
    activeDoor.tempF > settings.maxTempAlertF || activeDoor.tempF < settings.minTempAlertF;

  const renderInspectorContent = (slot: FacingSlot) => {
    const sku = skuCatalog[slot.skuId] ?? Object.values(skuCatalog)[0];
    const plannedSku = skuCatalog[slot.plannedSkuId] ?? sku;
    const recSku = slot.aiRecommendation ? skuCatalog[slot.aiRecommendation.targetSkuId] : null;
    const isOos = slot.currentDepth === 0;
    const isViolation = slot.skuId !== slot.plannedSkuId;

    return (
      <div className="space-y-4">
        {/* Coordinate Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--kq-border)] pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-20 rounded-lg bg-[var(--kq-cabinet)] border border-[var(--kq-border)] flex items-center justify-center shrink-0">
              <BeverageVisual sku={sku} size="md" dimmed={isOos} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
                <span>DOOR {activeDoor.number}</span>
                <span aria-hidden="true">·</span>
                <span>{slot.coord}</span>
                <span aria-hidden="true">·</span>
                <span>{sku.skuCode}</span>
              </div>
              <h3 className="text-base font-semibold text-[var(--kq-text)] mt-1 truncate">
                {sku.name}
              </h3>
              <p className="text-xs text-[var(--kq-text-secondary)] mt-0.5">
                {sku.brandLabel} · {sku.size} · ${sku.price.toFixed(2)} retail ·{' '}
                <span className="font-mono-tabular text-[var(--kq-text)] font-medium">
                  {sku.weeklyVelocity}/wk
                </span>
              </p>
              {(sku.upc || sku.distributor) && (
                <p className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] mt-1 truncate">
                  {sku.upc ? `UPC ${sku.upc}` : ''}
                  {sku.upc && sku.distributor ? ' · ' : ''}
                  {sku.distributor || ''}
                </p>
              )}
            </div>
          </div>
          {mobileSheetOpen && (
            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:bg-[var(--kq-surface-muted)]"
              aria-label="Close slot inspector"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Wholesale Cost & Gross Margin Strip */}
        {(typeof sku.netUnitCost === 'number' || sku.marginPct > 0) && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-2.5 text-xs font-mono-tabular">
            <div>
              <div className="text-[10px] text-[var(--kq-text-muted)]">Net Cost/u</div>
              <div className="font-semibold text-[var(--kq-text)] mt-0.5">
                {typeof sku.netUnitCost === 'number' ? `$${sku.netUnitCost.toFixed(2)}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--kq-text-muted)]">
                Case ({sku.unitsPerCase ?? 12}u)
              </div>
              <div className="font-semibold text-[var(--kq-text)] mt-0.5">
                {typeof sku.netCaseCost === 'number' ? `$${sku.netCaseCost.toFixed(2)}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--kq-text-muted)]">Est. Margin</div>
              <div className="font-semibold text-[var(--kq-emerald)] mt-0.5">
                {sku.marginPct.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Assign Drink to Slot (Per-Store Custom Assortment) */}
        <div className="bg-[var(--kq-surface-muted)] rounded-lg p-3.5 border border-[var(--kq-border)] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`slot-sku-select-${slot.id}`}
              className="text-xs font-medium text-[var(--kq-text-secondary)]"
            >
              Assigned Drink for {slot.coord}
            </label>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onOpenScannerForSlot({
                    doorId: activeDoor.id,
                    doorNumber: activeDoor.number,
                    slotId: slot.id,
                    slotCoord: slot.coord,
                  })
                }
                className="text-[11px] font-semibold text-[var(--kq-accent)] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                Scan UPC
              </button>
              <button
                type="button"
                onClick={onOpenAddSkuModal}
                className="text-[11px] font-semibold text-[var(--kq-accent)] hover:underline whitespace-nowrap"
              >
                + New Drink
              </button>
            </div>
          </div>
          <select
            id={`slot-sku-select-${slot.id}`}
            value={slot.skuId}
            onChange={(e) => onAssignSlotSku(activeDoor.id, slot.id, e.target.value)}
            className="w-full min-h-[42px] px-3 rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)] focus:outline-none focus:border-[var(--kq-accent)]"
          >
            <optgroup label={`Carried at Store (${carriedOptions.length})`}>
              {carriedOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · ${item.price.toFixed(2)}
                </option>
              ))}
            </optgroup>
            {catalogOptions.length > 0 && (
              <optgroup label={`Swire Coca-Cola & PepsiCo Catalog (${catalogOptions.length})`}>
                {catalogOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.distributor || 'Distributor'} · ${item.price.toFixed(2)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Facing Depth Control */}
        <div className="bg-[var(--kq-surface-muted)] rounded-lg p-3.5 border border-[var(--kq-border)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-[var(--kq-text-secondary)]">
              Shelf Facing Depth
            </span>
            <span
              className={`text-sm font-mono-tabular font-semibold ${
                isOos
                  ? 'text-[var(--kq-crimson)]'
                  : slot.currentDepth <= 1
                    ? 'text-[var(--kq-amber)]'
                    : 'text-[var(--kq-emerald)]'
              }`}
            >
              {slot.currentDepth} / {slot.maxDepth} units
            </span>
          </div>

          <div
            className="grid gap-1.5 mb-3.5"
            style={{ gridTemplateColumns: `repeat(${slot.maxDepth}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {Array.from({ length: slot.maxDepth }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-sm transition-colors ${
                  idx < slot.currentDepth
                    ? isOos
                      ? 'bg-[var(--kq-crimson)]'
                      : slot.currentDepth <= 1
                        ? 'bg-[var(--kq-amber)]'
                        : 'bg-[var(--kq-accent)]'
                    : 'bg-[var(--kq-border-strong)]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAdjustDepth(activeDoor.id, slot.id, -1)}
              disabled={slot.currentDepth <= 0}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] hover:border-[var(--kq-accent)] disabled:opacity-40 transition-colors"
              aria-label="Decrease facing depth by 1"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onAdjustDepth(activeDoor.id, slot.id, 1)}
              disabled={slot.currentDepth >= slot.maxDepth}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] hover:border-[var(--kq-accent)] disabled:opacity-40 transition-colors"
              aria-label="Increase facing depth by 1"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onRestockFull(activeDoor.id, slot.id)}
              disabled={slot.currentDepth >= slot.maxDepth}
              className="flex-1 min-h-[44px] px-4 rounded bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold text-sm hover:bg-[var(--kq-accent-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              Restock to {slot.maxDepth}/{slot.maxDepth}
            </button>
          </div>
          <p className="text-xs text-[var(--kq-text-muted)] mt-2.5 font-mono-tabular">
            Walk-in backroom stock: {sku.backroomQty} units
          </p>
        </div>

        {/* Planogram Violation Resolution */}
        {isViolation && (
          <div className="rounded-lg p-3.5 bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--kq-crimson-text)]">
              <AlertTriangle className="w-4 h-4 text-[var(--kq-crimson)] shrink-0" />
              <span>Planogram Misplacement Detected</span>
            </div>
            <p className="text-xs text-[var(--kq-text)] mt-1.5 leading-relaxed">
              Expected <span className="font-semibold">{plannedSku.name}</span> in {slot.coord},
              currently stocked with {sku.shortName}.
            </p>
            <button
              type="button"
              onClick={() => onFixViolation(activeDoor.id, slot.id)}
              className="mt-3 w-full min-h-[44px] px-3 rounded bg-[var(--kq-crimson)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Restore {plannedSku.shortName} to Slot
            </button>
          </div>
        )}

        {/* AI Recommendation Card */}
        {slot.aiRecommendation && !slot.aiRecommendation.applied && recSku && (
          <div className="rounded-lg p-3.5 bg-[var(--kq-emerald-soft)] border border-[var(--kq-emerald)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--kq-emerald-text)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--kq-emerald)]" />
                AI Facing Optimization
              </span>
              <span className="font-mono-tabular text-xs font-bold text-[var(--kq-emerald)]">
                +{slot.aiRecommendation.projectedLiftPct}% REV · +$
                {slot.aiRecommendation.weeklyDollarGain}/wk
              </span>
            </div>

            <div className="flex items-center gap-2.5 mt-3 bg-[var(--kq-surface)] rounded p-2.5 border border-[var(--kq-border)]">
              <span className="text-xs text-[var(--kq-text-secondary)] truncate">{sku.shortName}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--kq-emerald)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--kq-text)] truncate">
                {recSku.name}
              </span>
            </div>

            <p className="text-xs text-[var(--kq-text-secondary)] mt-2.5 leading-relaxed">
              {slot.aiRecommendation.reason}
            </p>

            <button
              type="button"
              onClick={() => onApplySlotAi(activeDoor.id, slot.id)}
              className="mt-3 w-full min-h-[44px] px-4 rounded bg-[var(--kq-emerald)] text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply AI Swap (+${slot.aiRecommendation.weeklyDollarGain}/wk)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Door Selector Tabs & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {doors.map((door) => {
            const isSelected = door.id === activeDoor.id;
            const doorStats = getDoorMetrics(door);
            const warnTemp =
              door.tempF > settings.maxTempAlertF || door.tempF < settings.minTempAlertF;

            return (
              <button
                key={door.id}
                type="button"
                onClick={() => handleDoorSwitch(door.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg border text-left transition-colors shrink-0 flex items-center gap-3 ${
                  isSelected
                    ? 'bg-[var(--kq-surface-elevated)] border-[var(--kq-accent)] text-[var(--kq-text)]'
                    : 'bg-[var(--kq-surface)] border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:border-[var(--kq-accent-border)] hover:text-[var(--kq-text)]'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold whitespace-nowrap">
                    Door {door.number} · {door.shelves.length}×{door.facingsPerShelf}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] flex items-center gap-1.5 mt-0.5">
                    <span
                      className={
                        warnTemp
                          ? 'text-[var(--kq-crimson)] font-semibold'
                          : 'text-[var(--kq-accent)] font-medium'
                      }
                    >
                      {formatTemp(door.tempF, settings.tempUnit)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{doorStats.compliancePct.toFixed(0)}%</span>
                    {doorStats.oosCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[var(--kq-crimson)] font-medium">
                          {doorStats.oosCount} OOS
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenDoorEditor}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
            Edit Cooler Layout
          </button>
          <button
            type="button"
            onClick={onGoToAudit}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4" />
            Scan Shelves
          </button>
          {metrics.oosCount > 0 && (
            <button
              type="button"
              onClick={() => onRestockAllDoorOos(activeDoor.id)}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-amber-soft)] border border-[var(--kq-amber)] text-[var(--kq-amber-text)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Fill {metrics.oosCount} OOS
            </button>
          )}
          <button
            type="button"
            onClick={() => onOptimizeDoor(activeDoor.id)}
            disabled={metrics.aiOpportunityCount === 0}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-45 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {metrics.aiOpportunityCount > 0
              ? `AI Optimize (+$${metrics.projectedWeeklyLift}/wk)`
              : 'AI Optimized'}
          </button>
        </div>
      </div>

      {/* 4-Column Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glacier-card rounded-lg p-3.5">
          <div className="flex items-center justify-between text-xs text-[var(--kq-text-secondary)]">
            <span>Cooler Temp</span>
            <ThermometerSnowflake
              className={`w-4 h-4 ${
                isTempWarning ? 'text-[var(--kq-crimson)]' : 'text-[var(--kq-accent)]'
              }`}
            />
          </div>
          <div
            className={`text-2xl font-mono-tabular font-bold mt-1 ${
              isTempWarning ? 'text-[var(--kq-crimson)]' : 'text-[var(--kq-text)]'
            }`}
          >
            {formatTemp(activeDoor.tempF, settings.tempUnit)}
          </div>
          <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5 font-mono-tabular">
            {HARDWARE_LABELS[activeDoor.hardwareType]} · {activeDoor.doorOpensToday} opens
          </div>
        </div>

        <div className="glacier-card rounded-lg p-3.5">
          <div className="text-xs text-[var(--kq-text-secondary)]">Planogram Compliance</div>
          <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-text)] mt-1">
            {metrics.compliancePct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5 font-mono-tabular">
            {metrics.compliantCount}/{metrics.totalFacings} facings ({activeDoor.shelves.length} shelves ×{' '}
            {activeDoor.facingsPerShelf})
          </div>
        </div>

        <div className="glacier-card rounded-lg p-3.5">
          <div className="text-xs text-[var(--kq-text-secondary)]">Stock Alerts</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-mono-tabular font-bold ${
                metrics.oosCount > 0 ? 'text-[var(--kq-crimson)]' : 'text-[var(--kq-emerald)]'
              }`}
            >
              {metrics.oosCount} OOS
            </span>
            <span className="text-xs font-mono-tabular text-[var(--kq-amber)] font-semibold">
              · {metrics.lowCount} Low
            </span>
          </div>
          <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5">
            {metrics.violationCount > 0
              ? `${metrics.violationCount} misplaced SKU`
              : 'Zero placement violations'}
          </div>
        </div>

        <div className="glacier-card rounded-lg p-3.5">
          <div className="text-xs text-[var(--kq-text-secondary)]">AI Projected Lift</div>
          <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-emerald)] mt-1">
            +${metrics.projectedWeeklyLift}/wk
          </div>
          <div className="text-[11px] text-[var(--kq-text-muted)] mt-0.5 font-mono-tabular">
            {metrics.aiOpportunityCount} pending facing swaps
          </div>
        </div>
      </div>

      {/* Main Split: Cooler Schematic (8 cols) + Inspector (4 cols on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 glacier-card rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[var(--kq-text)]">
                {activeDoor.label}
              </h2>
              <p className="text-xs text-[var(--kq-text-muted)] mt-0.5">
                {HARDWARE_LABELS[activeDoor.hardwareType]} · {activeDoor.shelves.length} shelves ×{' '}
                {activeDoor.facingsPerShelf} facings ({activeDoor.defaultMaxDepth} deep) · Verified{' '}
                {activeDoor.lastAuditAt}
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] self-start">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'oos', label: 'OOS' },
                  { id: 'ai', label: 'AI Moves' },
                  { id: 'low', label: 'Low' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[36px] px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    filter === tab.id
                      ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                      : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Physical Refrigerated Cooler Cabinet Interior (always dark steel casing for realistic beverage contrast) */}
          <div className="rounded-xl bg-[var(--kq-cabinet)] border border-slate-700/70 p-3 sm:p-4 space-y-4">
            {activeDoor.shelves.map((shelf, shelfIdx) => (
              <div key={shelfIdx} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 px-1">
                  <span>
                    SHELF S{shelfIdx + 1}{' '}
                    {shelfIdx === 0 ? '· EYE LEVEL' : shelfIdx === 1 ? '· PRIME REACH' : ''}
                  </span>
                  <span>
                    {shelf.filter((f) => f.currentDepth > 0).length}/{shelf.length} stocked
                  </span>
                </div>

                {/* Dynamic Facing Columns Matching Door Width */}
                <div className={`grid gap-2 ${getShelfGridClass(shelf.length)}`}>
                  {shelf.map((slot) => {
                    const sku = skuCatalog[slot.skuId] ?? Object.values(skuCatalog)[0];
                    const isSelected = slot.id === selectedSlot?.id;
                    const isOos = slot.currentDepth === 0;
                    const isLow =
                      !isOos &&
                      slot.currentDepth / slot.maxDepth <= settings.lowStockThresholdPct / 100;
                    const isViolation = slot.skuId !== slot.plannedSkuId;
                    const hasAi = Boolean(slot.aiRecommendation && !slot.aiRecommendation.applied);
                    const dimmedByFilter = !matchesFilter(slot);

                    let slotStyle =
                      'bg-[var(--kq-cabinet-slot)] border-white/10 hover:border-sky-400/60';
                    if (isOos) {
                      slotStyle =
                        'bg-rose-500/15 border-dashed border-rose-400/80 hover:border-rose-400';
                    } else if (hasAi) {
                      slotStyle =
                        'bg-emerald-500/15 border-emerald-400/70 hover:border-emerald-400';
                    } else if (isViolation) {
                      slotStyle =
                        'bg-rose-500/15 border-rose-400/70 hover:border-rose-400';
                    } else if (isLow) {
                      slotStyle =
                        'bg-amber-500/15 border-amber-400/70 hover:border-amber-400';
                    }

                    if (isSelected) {
                      slotStyle += ' ring-2 ring-sky-400 ring-offset-1 ring-offset-[#0F172A]';
                    }

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleSlotClick(slot)}
                        className={`relative min-h-[112px] rounded-md border p-2 flex flex-col items-center justify-between text-center transition-all ${slotStyle} ${
                          dimmedByFilter ? 'opacity-25' : 'opacity-100'
                        }`}
                      >
                        <div className="w-full flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono-tabular text-slate-400">
                            {slot.coord}
                          </span>
                          {hasAi && slot.aiRecommendation ? (
                            <span className="text-[9px] font-mono-tabular font-bold px-1 py-0.5 rounded bg-emerald-500 text-slate-950 leading-none">
                              +{slot.aiRecommendation.projectedLiftPct}%
                            </span>
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: sku.brandColor }}
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        {isOos ? (
                          <div className="my-auto flex flex-col items-center justify-center py-1">
                            <span className="text-[10px] font-mono-tabular font-bold text-rose-400 tracking-tight">
                              +RESTOCK
                            </span>
                            <span className="text-[10px] text-slate-300 truncate max-w-[78px] mt-0.5">
                              {sku.shortName}
                            </span>
                          </div>
                        ) : (
                          <div className="my-1 flex flex-col items-center">
                            <BeverageVisual sku={sku} size="sm" />
                            <span className="text-[10px] font-medium text-slate-100 truncate max-w-[78px] mt-1">
                              {sku.shortName}
                            </span>
                          </div>
                        )}

                        <div className="w-full flex items-center justify-between text-[10px] font-mono-tabular pt-1 border-t border-white/10">
                          <span
                            className={
                              isOos
                                ? 'text-rose-400 font-semibold'
                                : isLow
                                  ? 'text-amber-300 font-semibold'
                                  : isViolation
                                    ? 'text-rose-300 font-semibold'
                                    : 'text-slate-300'
                            }
                          >
                            {isViolation ? 'MISPLACED' : `${slot.currentDepth}/${slot.maxDepth}`}
                          </span>
                          <span className="text-slate-400">${sku.price.toFixed(2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="cooler-shelf-ledge h-2 rounded-sm" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Right Inspector Panel */}
        <aside className="hidden lg:block lg:col-span-4 glacier-glass rounded-xl p-5 sticky top-20">
          {selectedSlot ? renderInspectorContent(selectedSlot) : null}
        </aside>
      </div>

      {/* Mobile Bottom Sheet Inspector */}
      {mobileSheetOpen && selectedSlot && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="w-full max-h-[84vh] overflow-y-auto glacier-hud rounded-t-2xl border-t border-[var(--kq-accent-border)] p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full bg-[var(--kq-border-strong)] mx-auto mb-4"
              aria-hidden="true"
            />
            {renderInspectorContent(selectedSlot)}
          </div>
        </div>
      )}
    </div>
  );
};
