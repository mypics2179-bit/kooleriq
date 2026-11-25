import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Eye,
  Images,
  ScanBarcode,
  ScanLine,
  Upload,
  Video,
  VideoOff,
} from 'lucide-react';
import { AuditRecord, CoolerDoor, SkuItem, StoreSettings } from '../types/kooleriq';
import { formatTemp, getDoorMetrics } from '../utils/formatters';
import { BeverageVisual } from './BeverageVisual';

interface AuditScreenProps {
  doors: CoolerDoor[];
  selectedDoorId: string;
  onSelectDoor: (doorId: string) => void;
  skuCatalog: Record<string, SkuItem>;
  settings: StoreSettings;
  audits: AuditRecord[];
  onRunAudit: (doorId: string) => void;
  onSyncDoorGaps: (doorId: string) => void;
  onOpenScanner: () => void;
  onOpenAuditLog: () => void;
  onOpenImageLibrary: () => void;
  onSaveAuditFrameToLibrary: (door: CoolerDoor, dataUrl: string) => void;
}

export const AuditScreen: React.FC<AuditScreenProps> = ({
  doors,
  selectedDoorId,
  onSelectDoor,
  skuCatalog,
  settings,
  audits,
  onRunAudit,
  onSyncDoorGaps,
  onOpenScanner,
  onOpenAuditLog,
  onOpenImageLibrary,
  onSaveAuditFrameToLibrary,
}) => {
  const activeDoor = useMemo(
    () => doors.find((d) => d.id === selectedDoorId) ?? doors[0],
    [doors, selectedDoorId]
  );
  const metrics = useMemo(() => getDoorMetrics(activeDoor), [activeDoor]);

  const [isScanning, setIsScanning] = useState(false);
  const [scanCompleteBanner, setScanCompleteBanner] = useState<string | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showOosOverlay, setShowOosOverlay] = useState(true);
  const [showDepthGrid, setShowDepthGrid] = useState(settings.cameraGridOverlay);
  const [cameraMode, setCameraMode] = useState<'simulated' | 'webcam' | 'photo'>('simulated');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraMode('simulated');
    setCameraError(null);
  };

  const startWebcam = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera access requires HTTPS or camera support in this browser. Using cooler telemetry view.');
      setCameraMode('simulated');
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (constraintErr) {
        if (
          constraintErr instanceof DOMException &&
          (constraintErr.name === 'OverconstrainedError' || constraintErr.name === 'NotFoundError')
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw constraintErr;
        }
      }

      streamRef.current = stream;
      setCameraMode('webcam');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    } catch (err) {
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'SecurityError') {
        setCameraError(
          'Camera permission blocked. Allow Camera access in your browser site settings and click Live Camera again.'
        );
      } else if (errName === 'NotFoundError') {
        setCameraError('No camera detected on this device. Showing simulated cooler Door HUD.');
      } else {
        setCameraError('Camera unavailable or busy in another app. Showing live simulated Door HUD.');
      }
      setCameraMode('simulated');
    }
  };

  const captureSnapshotDataUrl = (): string | null => {
    try {
      const canvas = document.createElement('canvas');
      if (cameraMode === 'webcam' && videoRef.current && videoRef.current.videoWidth > 0) {
        const vw = videoRef.current.videoWidth;
        const vh = videoRef.current.videoHeight;
        const scale = Math.min(1, 880 / Math.max(vw, vh));
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.84);
      }
      if (cameraMode === 'photo' && uploadedImageUrl) {
        return uploadedImageUrl;
      }
    } catch {
      return null;
    }
    return null;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setUploadedImageUrl(url);
      setCameraMode('photo');
      setCameraError(null);
      onSaveAuditFrameToLibrary(activeDoor, url);
    };
    reader.readAsDataURL(file);
  };

  const triggerScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanCompleteBanner(null);
    const snapshot = captureSnapshotDataUrl();
    setTimeout(() => {
      setIsScanning(false);
      onRunAudit(activeDoor.id);
      if (snapshot && cameraMode === 'webcam') {
        onSaveAuditFrameToLibrary(activeDoor, snapshot);
      }
      setScanCompleteBanner(
        `Verified Door ${activeDoor.number}: ${metrics.compliancePct.toFixed(1)}% compliant · ${metrics.oosCount} OOS gaps logged.`
      );
    }, 1400);
  };

  const previewShelves = activeDoor.shelves.slice(0, 3);
  const discrepancies = activeDoor.shelves
    .flat()
    .filter((s) => s.currentDepth === 0 || s.status === 'violation' || s.status === 'low');

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {doors.map((door) => (
            <button
              key={door.id}
              type="button"
              onClick={() => onSelectDoor(door.id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                door.id === activeDoor.id
                  ? 'bg-[var(--kq-surface-elevated)] border-[var(--kq-accent)] text-[var(--kq-text)]'
                  : 'bg-[var(--kq-surface)] border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
              }`}
            >
              Door {door.number} · {formatTemp(door.tempF, settings.tempUnit)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cameraMode === 'webcam' ? (
            <button
              type="button"
              onClick={stopWebcam}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <VideoOff className="w-4 h-4 text-[var(--kq-amber)]" />
              Stop Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={startWebcam}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
            >
              <Video className="w-4 h-4" />
              Live Camera
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-[var(--kq-text-secondary)]" />
            Upload Photo
          </button>

          <button
            type="button"
            onClick={onOpenScanner}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:bg-[var(--kq-accent-soft)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <ScanBarcode className="w-4 h-4" />
            Barcode / QR
          </button>

          <button
            type="button"
            onClick={onOpenImageLibrary}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Images className="w-4 h-4 text-[var(--kq-accent)]" />
            Image Library
          </button>

          {cameraMode !== 'simulated' && (
            <button
              type="button"
              onClick={stopWebcam}
              className="min-h-[44px] px-3 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] text-xs font-medium hover:text-[var(--kq-text)]"
            >
              Sim View
            </button>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="rounded-lg bg-[var(--kq-amber-soft)] border border-[var(--kq-amber)] px-4 py-2.5 text-xs text-[var(--kq-amber-text)]">
          {cameraError}
        </div>
      )}

      {/* Main Split: Camera HUD (8 cols) + Detected Gaps & Audit Log (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 glacier-card rounded-xl p-4 space-y-4">
          {/* HUD Layer Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[var(--kq-text-secondary)]">
              <Eye className="w-4 h-4 text-[var(--kq-accent)]" />
              <span className="font-semibold text-[var(--kq-text)]">Optical Shelf Scanner</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-[var(--kq-accent)] font-medium">
                Door {activeDoor.number}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowBoundingBoxes((v) => !v)}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  showBoundingBoxes
                    ? 'bg-[var(--kq-accent-soft)] border-[var(--kq-accent-border)] text-[var(--kq-accent)]'
                    : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-muted)]'
                }`}
              >
                SKU Boxes
              </button>
              <button
                type="button"
                onClick={() => setShowOosOverlay((v) => !v)}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  showOosOverlay
                    ? 'bg-[var(--kq-crimson-soft)] border-[var(--kq-crimson)] text-[var(--kq-crimson-text)]'
                    : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-muted)]'
                }`}
              >
                OOS Gaps
              </button>
              <button
                type="button"
                onClick={() => setShowDepthGrid((v) => !v)}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  showDepthGrid
                    ? 'bg-[var(--kq-surface-elevated)] border-[var(--kq-border-strong)] text-[var(--kq-text)]'
                    : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)] text-[var(--kq-text-muted)]'
                }`}
              >
                Grid HUD
              </button>
            </div>
          </div>

          {/* Camera Optical Viewport (dark optical instrument screen) */}
          <div className="relative rounded-xl overflow-hidden bg-[var(--kq-cabinet)] border border-slate-700/80 min-h-[380px] sm:min-h-[430px] flex flex-col justify-between p-4">
            {cameraMode === 'webcam' && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            )}
            {cameraMode === 'photo' && uploadedImageUrl && (
              <img
                src={uploadedImageUrl}
                alt="Uploaded cooler door audit frame"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            )}

            {cameraMode === 'simulated' && activeDoor.photoUrl && (
              <img
                src={activeDoor.photoUrl}
                alt={`${activeDoor.label} reference image`}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-55"
              />
            )}

            {cameraMode === 'simulated' && !activeDoor.photoUrl && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.16), rgba(8, 12, 20, 0.96) 72%)',
                }}
                aria-hidden="true"
              />
            )}

            {showDepthGrid && (
              <div
                className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3"
                aria-hidden="true"
              >
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div key={idx} className="border border-white/[0.05]" />
                ))}
              </div>
            )}

            {isScanning && (
              <div
                className="absolute inset-x-0 top-0 h-20 pointer-events-none z-20 animate-scan-sweep"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(56, 189, 248, 0) 0%, rgba(56, 189, 248, 0.35) 92%, #38BDF8 100%)',
                  borderBottom: '2px solid #38BDF8',
                }}
                aria-hidden="true"
              />
            )}

            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono-tabular text-sky-300">
              <span className="px-2 py-1 rounded bg-slate-950/80 border border-sky-400/35">
                DOOR {activeDoor.number} · {activeDoor.category}
              </span>
              <span className="px-2 py-1 rounded bg-slate-950/80 border border-white/15 text-slate-100">
                {formatTemp(activeDoor.tempF, settings.tempUnit)} · 97.8% CONF
              </span>
            </div>

            <div className="relative z-10 my-4 space-y-3">
              {previewShelves.map((shelf, sIdx) => (
                <div
                  key={sIdx}
                  className={`grid gap-2 ${
                    shelf.length <= 4
                      ? 'grid-cols-2 sm:grid-cols-4'
                      : shelf.length === 5
                        ? 'grid-cols-2 sm:grid-cols-5'
                        : shelf.length >= 7
                          ? 'grid-cols-4 sm:grid-cols-8'
                          : 'grid-cols-3 sm:grid-cols-6'
                  }`}
                >
                  {shelf.map((slot) => {
                    const sku = skuCatalog[slot.skuId] ?? Object.values(skuCatalog)[0];
                    const isOos = slot.currentDepth === 0;
                    const isViolation = slot.skuId !== slot.plannedSkuId;

                    return (
                      <div
                        key={slot.id}
                        className={`relative rounded p-2 flex flex-col items-center justify-center min-h-[92px] transition-all ${
                          cameraMode === 'simulated'
                            ? 'bg-slate-950/70'
                            : 'bg-slate-950/45 backdrop-blur-[2px]'
                        } ${
                          isOos && showOosOverlay
                            ? 'border border-dashed border-rose-400'
                            : showBoundingBoxes
                              ? isViolation
                                ? 'border border-amber-400'
                                : 'border border-sky-400/60'
                              : 'border border-transparent'
                        }`}
                      >
                        {showBoundingBoxes && !isOos && (
                          <>
                            <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-sky-400" />
                            <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-sky-400" />
                            <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-sky-400" />
                            <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-sky-400" />
                          </>
                        )}

                        {cameraMode === 'simulated' && !isOos && (
                          <BeverageVisual sku={sku} size="sm" />
                        )}

                        {isOos && showOosOverlay ? (
                          <span className="text-[10px] font-mono-tabular font-bold text-rose-400 text-center">
                            GAP · {slot.coord}
                          </span>
                        ) : (
                          showBoundingBoxes && (
                            <span className="mt-1 text-[10px] font-mono-tabular text-sky-100 truncate max-w-full">
                              {sku.skuCode} · {slot.currentDepth}/{slot.maxDepth}
                            </span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="text-xs text-slate-300 font-mono-tabular">
                {metrics.totalFacings - metrics.oosCount}/{metrics.totalFacings} facings active ·{' '}
                {metrics.oosCount} empty slots
              </div>
              <button
                type="button"
                onClick={triggerScan}
                disabled={isScanning}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold text-sm hover:bg-[var(--kq-accent-hover)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isScanning ? (
                  <>
                    <ScanLine className="w-4 h-4" />
                    Scanning Door {activeDoor.number}...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Capture &amp; Audit Door {activeDoor.number}
                  </>
                )}
              </button>
            </div>
          </div>

          {scanCompleteBanner && (
            <div className="rounded-lg bg-[var(--kq-emerald-soft)] border border-[var(--kq-emerald)] px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--kq-emerald-text)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--kq-emerald)] shrink-0" />
                <span>{scanCompleteBanner}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detected Discrepancies & Audit History */}
        <div className="lg:col-span-4 space-y-5">
          <div className="glacier-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--kq-text)]">
                Detected Shelf Discrepancies
              </h3>
              <span className="text-xs font-mono-tabular text-[var(--kq-amber)] font-semibold">
                {discrepancies.length} flagged
              </span>
            </div>

            {discrepancies.length === 0 ? (
              <div className="rounded-lg bg-[var(--kq-emerald-soft)] border border-[var(--kq-emerald)] p-4 text-xs text-[var(--kq-emerald-text)]">
                All facings on Door {activeDoor.number} match the active planogram with optimal depth.
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {discrepancies.map((slot) => {
                  const sku = skuCatalog[slot.skuId];
                  const isOos = slot.currentDepth === 0;
                  const isViolation = slot.skuId !== slot.plannedSkuId;
                  return (
                    <div
                      key={slot.id}
                      className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-mono-tabular">
                          <AlertTriangle
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isOos ? 'text-[var(--kq-crimson)]' : 'text-[var(--kq-amber)]'
                            }`}
                          />
                          <span className="text-[var(--kq-text)] font-semibold">{slot.coord}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              isOos
                                ? 'text-[var(--kq-crimson)] font-semibold'
                                : 'text-[var(--kq-amber)] font-semibold'
                            }
                          >
                            {isOos ? 'OUT OF STOCK' : isViolation ? 'MISPLACED' : 'LOW STOCK'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--kq-text-secondary)] truncate mt-1">
                          {sku.name}
                        </p>
                        {sku.upc && (
                          <p className="text-[10px] font-mono-tabular text-[var(--kq-text-muted)] truncate mt-0.5">
                            UPC {sku.upc}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-mono-tabular text-[var(--kq-text-muted)] shrink-0">
                        {slot.currentDepth}/{slot.maxDepth}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {discrepancies.length > 0 && (
              <button
                type="button"
                onClick={() => onSyncDoorGaps(activeDoor.id)}
                className="mt-3 w-full min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Restock &amp; Resolve All Door {activeDoor.number} Gaps
              </button>
            )}
          </div>

          {/* Recent Audit Log */}
          <div className="glacier-card rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-[var(--kq-text)]">
                Recent Cooler Audits
              </h3>
              <button
                type="button"
                onClick={onOpenAuditLog}
                className="text-xs font-semibold text-[var(--kq-accent)] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Full Audit Log
              </button>
            </div>
            <div className="space-y-2.5">
              {audits.slice(0, 4).map((audit) => (
                <div
                  key={audit.id}
                  className="border-b border-[var(--kq-border)] last:border-b-0 pb-2.5 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[var(--kq-text)] truncate">
                      {audit.doorLabel}
                    </span>
                    <span className="font-mono-tabular text-[var(--kq-emerald)] font-semibold shrink-0">
                      {audit.compliancePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--kq-text-muted)] font-mono-tabular mt-0.5">
                    {audit.timestamp} · {audit.oosCount} OOS · {audit.aiConfidence}% conf
                  </div>
                  <p className="text-xs text-[var(--kq-text-secondary)] mt-1 leading-snug">
                    {audit.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
