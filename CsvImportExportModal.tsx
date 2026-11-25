import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Package,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import {
  AuditLogEntry,
  AuditRecord,
  CoolerDoor,
  SkuItem,
  StoreSettings,
} from '../types/kooleriq';
import {
  BEVERAGE_CSV_URL,
  CsvImportPreviewResult,
  generateAuditLogCsv,
  generateAuditsCsv,
  generateImportTemplateCsv,
  generateInventoryCsv,
  generatePlanogramCsv,
  previewCsvImport,
} from '../utils/beverageCsvParser';

interface CsvImportExportModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'import' | 'export';
  doors: CoolerDoor[];
  skuCatalog: Record<string, SkuItem>;
  carriedSkuIds: string[];
  audits: AuditRecord[];
  auditLogEntries: AuditLogEntry[];
  settings: StoreSettings;
  onApplyImportedCatalog: (payload: {
    nextCatalog: Record<string, SkuItem>;
    newSkuIds: string[];
    carryImportedInStore: boolean;
    sourceLabel: string;
    totalRows: number;
  }) => void;
  onExportEventLogged: (reportName: string) => void;
}

function triggerCsvDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const CsvImportExportModal: React.FC<CsvImportExportModalProps> = ({
  open,
  onClose,
  initialTab = 'import',
  doors,
  skuCatalog,
  carriedSkuIds,
  audits,
  auditLogEntries,
  settings,
  onApplyImportedCatalog,
  onExportEventLogged,
}) => {
  const [activeMode, setActiveMode] = useState<'import' | 'export'>(initialTab);
  const [sourceName, setSourceName] = useState<string>('');
  const [preview, setPreview] = useState<CsvImportPreviewResult | null>(null);
  const [carryImported, setCarryImported] = useState(true);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setActiveMode(initialTab);
      setImportError(null);
    }
  }, [open, initialTab]);

  const stats = useMemo(() => {
    const totalItems = Object.keys(skuCatalog).length;
    const totalFacings = doors.reduce(
      (sum, d) => sum + d.shelves.reduce((s, row) => s + row.length, 0),
      0
    );
    return {
      totalItems,
      carried: carriedSkuIds.length,
      totalFacings,
      audits: audits.length,
      logEntries: auditLogEntries.length,
    };
  }, [skuCatalog, carriedSkuIds, doors, audits, auditLogEntries]);

  if (!open) return null;

  const handleFileSelected = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const result = previewCsvImport(text, skuCatalog);
      setSourceName(file.name);
      setPreview(result);
    } catch {
      setImportError('Unable to read the selected CSV file. Please verify UTF-8 encoding.');
    }
  };

  const handleLoadMasterDistributorCsv = async () => {
    setIsLoadingMaster(true);
    setImportError(null);
    try {
      const res = await fetch(BEVERAGE_CSV_URL);
      if (!res.ok) throw new Error('Distributor sheet unavailable.');
      const text = await res.text();
      const result = previewCsvImport(text, skuCatalog);
      setSourceName('Beverage_UPC_and_Wholesale_Costs.csv');
      setPreview(result);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Failed to load Swire & PepsiCo sheet.'
      );
    } finally {
      setIsLoadingMaster(false);
    }
  };

  const handleConfirmImport = () => {
    if (!preview || preview.totalRows === 0) return;
    onApplyImportedCatalog({
      nextCatalog: preview.parsedCatalog,
      newSkuIds: preview.newSkuIds,
      carryImportedInStore: carryImported,
      sourceLabel: sourceName || 'Uploaded CSV',
      totalRows: preview.totalRows,
    });
    setPreview(null);
    setSourceName('');
    onClose();
  };

  const codeSlug = settings.storeCode.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto glacier-hud rounded-xl p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--kq-border)] pb-3.5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV Import &amp; Export Hub · {settings.storeName}</span>
            </div>
            <h2 className="text-lg font-display font-bold text-[var(--kq-text)] mt-0.5">
              Distributor UPC Sheets, Inventory &amp; Audit Exports
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-lg text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:bg-[var(--kq-surface-muted)] flex items-center justify-center"
            aria-label="Close CSV manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)]">
          <button
            type="button"
            onClick={() => setActiveMode('import')}
            className={`flex-1 min-h-[38px] rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeMode === 'import'
                ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import Distributor / SKU CSV
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('export')}
            className={`flex-1 min-h-[38px] rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeMode === 'export'
                ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export Store Reports CSV
          </button>
        </div>

        {/* IMPORT PANEL */}
        {activeMode === 'import' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-dashed border-[var(--kq-border-strong)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[var(--kq-text)]">
                  Upload Beverage UPC &amp; Wholesale Cost CSV
                </div>
                <p className="text-xs text-[var(--kq-text-secondary)]">
                  Supports Swire Coca-Cola / PepsiCo 14-column invoice CSVs or custom headers
                  (Product Name, UPC, Distributor, Category, Size, Retail, Case/Unit Cost, Backroom Qty).
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Choose CSV File
                </button>
                <button
                  type="button"
                  disabled={isLoadingMaster}
                  onClick={handleLoadMasterDistributorCsv}
                  className="min-h-[42px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] hover:border-[var(--kq-accent)] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  {isLoadingMaster ? 'Loading...' : 'Re-sync Swire / Pepsi Sheet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerCsvDownload(
                      generateImportTemplateCsv(),
                      'kooleriq-beverage-import-template.csv'
                    );
                    onExportEventLogged('CSV Import Template');
                  }}
                  className="min-h-[42px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </button>
              </div>
            </div>

            {importError && (
              <div className="rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-4 py-3 text-xs text-[var(--kq-crimson-text)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] px-4 py-3">
                  <div className="text-xs font-mono-tabular text-[var(--kq-text)]">
                    <span className="font-semibold">{sourceName}</span>
                    <span className="mx-2 text-[var(--kq-text-muted)]">·</span>
                    <span>{preview.totalRows} rows parsed</span>
                    <span className="mx-2 text-[var(--kq-text-muted)]">·</span>
                    <span className="text-[var(--kq-emerald-text)] font-semibold">
                      {preview.newSkuCount} new SKUs
                    </span>
                    <span className="mx-2 text-[var(--kq-text-muted)]">·</span>
                    <span className="text-[var(--kq-accent)] font-semibold">
                      {preview.matchedExistingCount} updated
                    </span>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-[var(--kq-text)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={carryImported}
                      onChange={(e) => setCarryImported(e.target.checked)}
                      className="rounded border-[var(--kq-border-strong)] accent-[var(--kq-accent)]"
                    />
                    Carry imported SKUs in {settings.storeName}
                  </label>
                </div>

                {preview.warnings.length > 0 && (
                  <div className="rounded-lg bg-[var(--kq-amber-soft)] border border-[var(--kq-amber)] px-4 py-2.5 text-xs text-[var(--kq-amber-text)]">
                    {preview.warnings.join(' ')}
                  </div>
                )}

                <div className="rounded-xl border border-[var(--kq-border)] overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--kq-surface-muted)] text-[11px] text-[var(--kq-text-muted)] sticky top-0">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Status</th>
                          <th className="py-2 px-3 font-semibold">Product</th>
                          <th className="py-2 px-3 font-semibold">UPC</th>
                          <th className="py-2 px-3 font-semibold">Distributor</th>
                          <th className="py-2 px-3 font-semibold text-right">Unit Cost</th>
                          <th className="py-2 px-3 font-semibold text-right">Retail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--kq-border)] font-mono-tabular">
                        {preview.previewRows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="py-2 px-3">
                              <span
                                className={
                                  row.status === 'new'
                                    ? 'text-[var(--kq-emerald-text)] font-semibold'
                                    : 'text-[var(--kq-accent)] font-semibold'
                                }
                              >
                                {row.status === 'new' ? 'NEW' : 'UPD'}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans font-medium text-[var(--kq-text)]">
                              {row.name} <span className="text-[var(--kq-text-muted)]">({row.size})</span>
                            </td>
                            <td className="py-2 px-3 text-[var(--kq-text-secondary)]">
                              {row.upc}
                            </td>
                            <td className="py-2 px-3 font-sans text-[var(--kq-text-secondary)]">
                              {row.distributor}
                            </td>
                            <td className="py-2 px-3 text-right text-[var(--kq-text-secondary)]">
                              {row.netUnitCost !== null ? `$${row.netUnitCost.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-[var(--kq-text)]">
                              ${row.retailPrice.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setSourceName('');
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text-secondary)]"
                  >
                    Discard Preview
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={preview.totalRows === 0}
                    className="min-h-[42px] px-5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Commit {preview.totalRows} Rows to Catalog
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXPORT PANEL */}
        {activeMode === 'export' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--kq-text)] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[var(--kq-accent)]" />
                  Active Cooler Planogram CSV
                </div>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-1">
                  All {stats.totalFacings} shelf facings across {doors.length} doors with SKU
                  depth, OOS status, wholesale cost, and margin %.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerCsvDownload(
                    generatePlanogramCsv(doors, skuCatalog, settings),
                    `kooleriq-planogram-${codeSlug}.csv`
                  );
                  onExportEventLogged('Active Cooler Planogram CSV');
                }}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Planogram CSV
              </button>
            </div>

            <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--kq-text)] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--kq-accent)]" />
                  Store Carried Inventory CSV
                </div>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-1">
                  Exports the {stats.carried} beverages carried in {settings.storeName} with UPCs,
                  floor capacity, backroom units, and case pricing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerCsvDownload(
                    generateInventoryCsv(doors, skuCatalog, carriedSkuIds, settings, true),
                    `kooleriq-store-inventory-${codeSlug}.csv`
                  );
                  onExportEventLogged('Store Carried Inventory CSV');
                }}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                Download Carried Inventory
              </button>
            </div>

            <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--kq-text)] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[var(--kq-accent)]" />
                  Master Beverage Catalog CSV
                </div>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-1">
                  Full {stats.totalItems}-SKU distributor and custom beverage catalog including
                  Swire Coca-Cola, PepsiCo, and house drinks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerCsvDownload(
                    generateInventoryCsv(doors, skuCatalog, carriedSkuIds, settings, false),
                    `kooleriq-master-catalog-${codeSlug}.csv`
                  );
                  onExportEventLogged('Master Beverage Catalog CSV');
                }}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                Download Master Catalog ({stats.totalItems})
              </button>
            </div>

            <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--kq-text)] flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[var(--kq-accent)]" />
                  Shelf Audits &amp; Activity Log CSV
                </div>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-1">
                  Download {stats.audits} optical shelf audit records or {stats.logEntries}{' '}
                  timestamped compliance ledger events.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerCsvDownload(
                      generateAuditsCsv(audits, settings),
                      `kooleriq-shelf-audits-${codeSlug}.csv`
                    );
                    onExportEventLogged('Shelf Audits CSV');
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Audits
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerCsvDownload(
                      generateAuditLogCsv(auditLogEntries),
                      `kooleriq-audit-log-${codeSlug}.csv`
                    );
                    onExportEventLogged('Full Activity Audit Log CSV');
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Audit Log
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
