import React, { useMemo } from 'react';
import {
  Camera,
  Keyboard,
  QrCode,
  ScanBarcode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AuditRecord, CoolerDoor, SkuItem, StoreSettings } from '../types/kooleriq';
import { getDoorMetrics } from '../utils/formatters';
import { AuditScreen } from './AuditScreen';

interface ScanHubScreenProps {
  doors: CoolerDoor[];
  selectedDoorId: string;
  onSelectDoor: (doorId: string) => void;
  skuCatalog: Record<string, SkuItem>;
  settings: StoreSettings;
  audits: AuditRecord[];
  cameraGranted: boolean;
  onRunAudit: (doorId: string) => void;
  onSyncDoorGaps: (doorId: string) => void;
  onOpenScannerPreset: (
    mode: 'camera' | 'upload' | 'manual' | 'labels',
    pref: 'auto' | 'barcode' | 'qr'
  ) => void;
  onOpenAuditLog: () => void;
  onOpenImageLibrary: () => void;
  onSaveAuditFrameToLibrary: (door: CoolerDoor, dataUrl: string) => void;
}

export const ScanHubScreen: React.FC<ScanHubScreenProps> = ({
  doors,
  selectedDoorId,
  onSelectDoor,
  skuCatalog,
  settings,
  audits,
  cameraGranted,
  onRunAudit,
  onSyncDoorGaps,
  onOpenScannerPreset,
  onOpenAuditLog,
  onOpenImageLibrary,
  onSaveAuditFrameToLibrary,
}) => {
  const storeScanSummary = useMemo(() => {
    let totalFacings = 0;
    let totalOos = 0;
    doors.forEach((d) => {
      const m = getDoorMetrics(d);
      totalFacings += m.totalFacings;
      totalOos += m.oosCount;
    });
    const upcIndexedCount = Object.values(skuCatalog).filter((s) => Boolean(s.upc)).length;
    return {
      totalFacings,
      totalOos,
      upcIndexedCount,
    };
  }, [doors, skuCatalog]);

  return (
    <div className="space-y-5">
      {/* Scan Centerpiece Command Deck */}
      <section
        aria-label="Scan command hub"
        className="glacier-card rounded-xl p-4 sm:p-5 border border-[var(--kq-accent-border)]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
              <span className="font-semibold text-[var(--kq-accent)] inline-flex items-center gap-1.5">
                <ScanBarcode className="w-4 h-4" />
                KoolerIQ Scan Centerpiece
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--kq-text-secondary)]">
                {storeScanSummary.upcIndexedCount} UPCs indexed
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  cameraGranted
                    ? 'text-[var(--kq-emerald)] font-semibold inline-flex items-center gap-1'
                    : 'text-[var(--kq-text-muted)]'
                }
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {cameraGranted ? 'Camera Permitted' : 'Camera Ready on Prompt'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold text-[var(--kq-text)]">
              Scan Drink Barcodes, Cooler Door QRs &amp; Optical Shelf Facings
            </h2>
            <p className="text-xs text-[var(--kq-text-secondary)] max-w-2xl">
              Use your device rear camera, Bluetooth/USB wedge scanner, or uploaded shelf photo to
              verify facings, look up Swire/PepsiCo wholesale margins, and capture snapshots directly
              into your Image Library.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenScannerPreset('camera', 'barcode')}
              className="min-h-[48px] px-3.5 py-2.5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ScanBarcode className="w-4 h-4 shrink-0" />
              <span>Scan Drink UPC</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenScannerPreset('camera', 'qr')}
              className="min-h-[48px] px-3.5 py-2.5 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 transition-opacity flex flex-col sm:flex-row items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>Scan Door QR</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenScannerPreset('manual', 'auto')}
              className="min-h-[48px] px-3.5 py-2.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Keyboard className="w-4 h-4 text-[var(--kq-accent)] shrink-0" />
              <span>Wedge / Type UPC</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenScannerPreset('labels', 'qr')}
              className="min-h-[48px] px-3.5 py-2.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[var(--kq-accent)] shrink-0" />
              <span>Print QR Tags</span>
            </button>
          </div>
        </div>

        {/* Compact Telemetry Footnote */}
        <div className="mt-3.5 pt-3 border-t border-[var(--kq-border)] grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[var(--kq-text-muted)]">Cooler Bay Scope</span>
            <div className="font-mono-tabular font-semibold text-[var(--kq-text)] mt-0.5">
              {doors.length} Doors · {storeScanSummary.totalFacings} Facings
            </div>
          </div>
          <div>
            <span className="text-[var(--kq-text-muted)]">Flagged Empty Facings</span>
            <div
              className={`font-mono-tabular font-semibold mt-0.5 ${
                storeScanSummary.totalOos > 0
                  ? 'text-[var(--kq-crimson)]'
                  : 'text-[var(--kq-emerald)]'
              }`}
            >
              {storeScanSummary.totalOos} OOS Gaps
            </div>
          </div>
          <div>
            <span className="text-[var(--kq-text-muted)]">Logged Shelf Audits</span>
            <div className="font-mono-tabular font-semibold text-[var(--kq-text)] mt-0.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
              {audits.length} Verified
            </div>
          </div>
        </div>
      </section>

      {/* Optical Cooler Shelf Audit HUD */}
      <AuditScreen
        doors={doors}
        selectedDoorId={selectedDoorId}
        onSelectDoor={onSelectDoor}
        skuCatalog={skuCatalog}
        settings={settings}
        audits={audits}
        onRunAudit={onRunAudit}
        onSyncDoorGaps={onSyncDoorGaps}
        onOpenScanner={() => onOpenScannerPreset('camera', 'auto')}
        onOpenAuditLog={onOpenAuditLog}
        onOpenImageLibrary={onOpenImageLibrary}
        onSaveAuditFrameToLibrary={onSaveAuditFrameToLibrary}
      />
    </div>
  );
};
