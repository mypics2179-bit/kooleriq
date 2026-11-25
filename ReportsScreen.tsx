import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Images,
  Sparkles,
} from 'lucide-react';
import {
  AuditLogEntry,
  AuditRecord,
  CoolerDoor,
  ImageAsset,
  InsightItem,
  SkuItem,
  StoreSettings,
} from '../types/kooleriq';
import { getDoorMetrics } from '../utils/formatters';
import { InsightsScreen } from './InsightsScreen';

interface ReportsScreenProps {
  doors: CoolerDoor[];
  insights: InsightItem[];
  audits: AuditRecord[];
  auditLog: AuditLogEntry[];
  imageAssets: ImageAsset[];
  skuCatalog: Record<string, SkuItem>;
  settings: StoreSettings;
  authToken: string | null;
  onApplyInsight: (insightId: string) => void;
  onDismissInsight: (insightId: string) => void;
  onPreviewDoor: (doorId: string) => void;
  onOpenAuditLog: () => void;
  onOpenCsvHub: (tab: 'import' | 'export') => void;
  onOpenImageLibrary: () => void;
  onExportPlanogramCsv: () => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  doors,
  insights,
  audits,
  auditLog,
  imageAssets,
  skuCatalog,
  settings,
  authToken,
  onApplyInsight,
  onDismissInsight,
  onPreviewDoor,
  onOpenAuditLog,
  onOpenCsvHub,
  onOpenImageLibrary,
  onExportPlanogramCsv,
}) => {
  const [subTab, setSubTab] = useState<'insights' | 'compliance' | 'exports'>('insights');

  const fleetCompliance = useMemo(() => {
    let totalFacings = 0;
    let totalCompliant = 0;
    let totalOos = 0;
    doors.forEach((d) => {
      const m = getDoorMetrics(d);
      totalFacings += m.totalFacings;
      totalCompliant += m.compliantCount;
      totalOos += m.oosCount;
    });
    const avgPct = totalFacings > 0 ? (totalCompliant / totalFacings) * 100 : 100;
    return { totalFacings, totalCompliant, totalOos, avgPct };
  }, [doors]);

  return (
    <div className="space-y-5">
      {/* Sub-navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('insights')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'insights'
                ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] shadow-sm'
                : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Revenue &amp; Trends
          </button>
          <button
            type="button"
            onClick={() => setSubTab('compliance')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'compliance'
                ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] shadow-sm'
                : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Shelf Audits &amp; Log
          </button>
          <button
            type="button"
            onClick={() => setSubTab('exports')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'exports'
                ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] shadow-sm'
                : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV &amp; Media Archive
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenAuditLog}
            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] hover:border-[var(--kq-accent)] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <ClipboardList className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
            Audit Log ({auditLog.length})
          </button>
          <button
            type="button"
            onClick={() => onOpenCsvHub('export')}
            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-xs font-semibold text-[var(--kq-accent)] hover:opacity-90 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Hub
          </button>
        </div>
      </div>

      {subTab === 'insights' && (
        <InsightsScreen
          insights={insights}
          skuCatalog={skuCatalog}
          settings={settings}
          authToken={authToken}
          onApplyInsight={onApplyInsight}
          onDismissInsight={onDismissInsight}
          onPreviewDoor={onPreviewDoor}
        />
      )}

      {subTab === 'compliance' && (
        <div className="space-y-5">
          {/* Fleet Compliance Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glacier-card rounded-xl p-4">
              <div className="text-xs text-[var(--kq-text-secondary)]">
                Store Planogram Compliance
              </div>
              <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-text)] mt-1">
                {fleetCompliance.avgPct.toFixed(1)}%
              </div>
              <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] mt-0.5">
                {fleetCompliance.totalCompliant}/{fleetCompliance.totalFacings} facings compliant
              </div>
            </div>

            <div className="glacier-card rounded-xl p-4">
              <div className="text-xs text-[var(--kq-text-secondary)]">Verified Optical Audits</div>
              <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-accent)] mt-1">
                {audits.length}
              </div>
              <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] mt-0.5">
                Across {doors.length} cooler doors
              </div>
            </div>

            <div className="glacier-card rounded-xl p-4">
              <div className="text-xs text-[var(--kq-text-secondary)]">Compliance Ledger Events</div>
              <div className="text-2xl font-mono-tabular font-bold text-[var(--kq-text)] mt-1">
                {auditLog.length}
              </div>
              <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] mt-0.5">
                Audits, restocks, cold-chain &amp; CSV sync
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Shelf Audits Table */}
            <div className="lg:col-span-7 glacier-card rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-[var(--kq-border)] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--kq-text)]">
                  Cooler Shelf Audit History
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenCsvHub('export')}
                  className="text-xs font-semibold text-[var(--kq-accent)] hover:underline"
                >
                  Export Audits CSV
                </button>
              </div>
              <div className="divide-y divide-[var(--kq-border)] max-h-[380px] overflow-y-auto">
                {audits.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--kq-text-muted)]">
                    No shelf audits recorded yet. Run an optical scan from the Scan tab.
                  </div>
                ) : (
                  audits.map((aud) => (
                    <div key={aud.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[var(--kq-text)]">
                          {aud.doorLabel}
                        </span>
                        <span className="font-mono-tabular font-semibold text-[var(--kq-emerald)]">
                          {aud.compliancePct.toFixed(1)}% · {aud.aiConfidence}% conf
                        </span>
                      </div>
                      <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)]">
                        {aud.timestamp} · {aud.facingsDetected}/{aud.totalFacings} active ·{' '}
                        {aud.oosCount} OOS
                      </div>
                      <p className="text-xs text-[var(--kq-text-secondary)]">{aud.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Operator Audit Log Preview */}
            <div className="lg:col-span-5 glacier-card rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-[var(--kq-border)] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--kq-text)]">
                  Operator Activity Ledger
                </h3>
                <button
                  type="button"
                  onClick={onOpenAuditLog}
                  className="text-xs font-semibold text-[var(--kq-accent)] hover:underline"
                >
                  Filter &amp; Export
                </button>
              </div>
              <div className="divide-y divide-[var(--kq-border)] max-h-[380px] overflow-y-auto">
                {auditLog.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[var(--kq-text)] truncate">
                        {entry.action}
                      </span>
                      <span className="text-[10px] font-mono-tabular text-[var(--kq-text-muted)] shrink-0">
                        {new Date(entry.timestampIso).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--kq-text-secondary)] leading-snug">
                      {entry.details}
                    </p>
                    <div className="text-[10px] font-mono-tabular text-[var(--kq-text-muted)]">
                      {entry.actor} · {entry.category}
                      {entry.doorLabel ? ` · ${entry.doorLabel}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'exports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glacier-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--kq-text)]">
              <FileSpreadsheet className="w-4 h-4 text-[var(--kq-accent)]" />
              CSV Reports &amp; Catalog Import
            </div>
            <p className="text-xs text-[var(--kq-text-secondary)]">
              Download planogram snapshots, walk-in inventory levels, wholesale Swire/PepsiCo case
              costs, shelf audits, or import updated distributor price sheets.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onExportPlanogramCsv}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Planogram CSV
              </button>
              <button
                type="button"
                onClick={() => onOpenCsvHub('export')}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
              >
                Open Full Export Hub
              </button>
              <button
                type="button"
                onClick={() => onOpenCsvHub('import')}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
              >
                Import CSV Sheet
              </button>
            </div>
          </div>

          <div className="glacier-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--kq-text)]">
                <Images className="w-4 h-4 text-[var(--kq-accent)]" />
                Cooler &amp; Product Image Library
              </div>
              <span className="text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
                {imageAssets.length} assets
              </span>
            </div>
            <p className="text-xs text-[var(--kq-text-secondary)]">
              Inspect saved cooler audit snapshots, brand signage, and custom drink product photos
              stored for {settings.storeName}.
            </p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {imageAssets.slice(0, 4).map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={onOpenImageLibrary}
                  className="aspect-square rounded-lg overflow-hidden bg-[var(--kq-cabinet)] border border-[var(--kq-border)] hover:border-[var(--kq-accent)] transition-colors"
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
            <button
              type="button"
              onClick={onOpenImageLibrary}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] inline-flex items-center gap-1.5"
            >
              <Images className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
              Open Image Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
