import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import QRCode from 'qrcode';
import {
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  Flashlight,
  Keyboard,
  PackagePlus,
  Plus,
  QrCode,
  RefreshCw,
  ScanBarcode,
  ScanLine,
  Upload,
  X,
} from 'lucide-react';
import { CoolerDoor, SkuItem, StoreSettings } from '../types/kooleriq';
import { formatTemp, getDoorMetrics } from '../utils/formatters';
import { BeverageVisual } from './BeverageVisual';

export type ScanModePreference = 'auto' | 'barcode' | 'qr';

interface ScannedEntry {
  id: string;
  rawText: string;
  formatLabel: string;
  timestamp: string;
  matchedType: 'sku' | 'door' | 'slot' | 'url' | 'text';
  label: string;
}

interface BarcodeQrScannerModalProps {
  open: boolean;
  onClose: () => void;
  doors: CoolerDoor[];
  selectedDoorId: string;
  skuCatalog: Record<string, SkuItem>;
  carriedSkuIds: string[];
  settings: StoreSettings;
  targetSlotContext?: { doorId: string; doorNumber: string; slotId: string; slotCoord: string } | null;
  initialMode?: 'camera' | 'upload' | 'manual' | 'labels';
  initialPreference?: ScanModePreference;
  onSelectDoorAndNavigate: (doorId: string, tab: 'dashboard' | 'scan') => void;
  onAssignSkuToTargetSlot?: (doorId: string, slotId: string, skuId: string) => void;
  onOrderBackroomCase: (skuId: string) => void;
  onPullSkuToFloor: (skuId: string) => void;
  onToggleCarriedSku: (skuId: string) => void;
  onCreateSkuFromBarcode: (scannedCode: string) => void;
}

function normalizeDigits(val: string): string {
  return val.replace(/\D/g, '');
}

function findMatchingSku(rawCode: string, catalog: Record<string, SkuItem>): SkuItem | null {
  const trimmed = rawCode.trim();
  if (!trimmed) return null;

  // 1. Check KoolerIQ QR URI payload: kooleriq://sku/<skuId> or ?upc=...
  if (trimmed.toLowerCase().startsWith('kooleriq://sku/')) {
    const rest = trimmed.slice('kooleriq://sku/'.length);
    const [idPart, queryPart] = rest.split('?');
    if (idPart && catalog[idPart]) return catalog[idPart];
    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      const upcParam = params.get('upc');
      if (upcParam) return findMatchingSku(upcParam, catalog);
    }
  }

  const lower = trimmed.toLowerCase();
  const digits = normalizeDigits(trimmed);
  const items = Object.values(catalog);

  // 2. Exact match on id, skuCode, materialSku, or upc
  for (const sku of items) {
    if (
      sku.id.toLowerCase() === lower ||
      sku.skuCode.toLowerCase() === lower ||
      (sku.materialSku && sku.materialSku.toLowerCase() === lower) ||
      (sku.upc && sku.upc.toLowerCase() === lower)
    ) {
      return sku;
    }
  }

  // 3. Normalized UPC-A / EAN-13 digit comparison (handles leading zero in EAN-13 vs 12-digit UPC-A)
  if (digits.length >= 8) {
    const strippedInput = digits.replace(/^0+/, '');
    for (const sku of items) {
      if (!sku.upc) continue;
      const skuRawUpc = sku.upc.trim();
      const skuDigits = normalizeDigits(skuRawUpc);
      if (!skuDigits) continue;

      if (skuDigits === digits || skuDigits.replace(/^0+/, '') === strippedInput) {
        return sku;
      }

      // Handle invoice rows with trailing wildcard asterisks (e.g., 01200024060*)
      if (skuRawUpc.includes('*')) {
        const prefix = normalizeDigits(skuRawUpc.split('*')[0]);
        if (prefix.length >= 8 && digits.startsWith(prefix)) {
          return sku;
        }
      }
    }
  }

  return null;
}

function findMatchingDoorOrSlot(
  rawCode: string,
  doors: CoolerDoor[]
): { door: CoolerDoor; slotCoord?: string; slotId?: string } | null {
  const trimmed = rawCode.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('kooleriq://door/')) {
    const doorId = trimmed.slice('kooleriq://door/'.length).split('?')[0];
    const door = doors.find((d) => d.id.toLowerCase() === doorId.toLowerCase() || d.number === doorId);
    if (door) return { door };
  }

  if (lower.startsWith('kooleriq://slot/')) {
    const parts = trimmed.slice('kooleriq://slot/'.length).split('/');
    if (parts.length >= 2) {
      const door = doors.find((d) => d.id.toLowerCase() === parts[0].toLowerCase() || d.number === parts[0]);
      if (door) {
        const coordOrId = parts[1].toUpperCase();
        const foundSlot = door.shelves
          .flat()
          .find((s) => s.id.toUpperCase() === coordOrId || s.coord.toUpperCase() === coordOrId);
        return { door, slotCoord: foundSlot?.coord, slotId: foundSlot?.id };
      }
    }
  }

  // JSON QR payload support
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as { doorId?: string; doorNumber?: string; slotCoord?: string };
      if (parsed.doorId || parsed.doorNumber) {
        const door = doors.find(
          (d) => d.id === parsed.doorId || d.number === parsed.doorNumber
        );
        if (door) {
          return { door, slotCoord: parsed.slotCoord };
        }
      }
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

function safeExternalUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export const BarcodeQrScannerModal: React.FC<BarcodeQrScannerModalProps> = ({
  open,
  onClose,
  doors,
  selectedDoorId,
  skuCatalog,
  carriedSkuIds,
  settings,
  targetSlotContext,
  initialMode,
  initialPreference,
  onSelectDoorAndNavigate,
  onAssignSkuToTargetSlot,
  onOrderBackroomCase,
  onPullSkuToFloor,
  onToggleCarriedSku,
  onCreateSkuFromBarcode,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'manual' | 'labels'>(
    initialMode || 'camera'
  );
  const [scanPreference, setScanPreference] = useState<ScanModePreference>(
    initialPreference || 'auto'
  );
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [manualInput, setManualInput] = useState('');
  const [lastResult, setLastResult] = useState<{
    rawText: string;
    formatLabel: string;
    matchedSku: SkuItem | null;
    matchedDoorInfo: { door: CoolerDoor; slotCoord?: string; slotId?: string } | null;
    externalUrl: string | null;
  } | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedEntry[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Label / QR generator state
  const [labelType, setLabelType] = useState<'door' | 'sku'>('door');
  const [labelDoorId, setLabelDoorId] = useState<string>(selectedDoorId || doors[0]?.id || '');
  const [labelSkuId, setLabelSkuId] = useState<string>('sku-coke-orig');
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const carriedSet = useMemo(() => new Set(carriedSkuIds), [carriedSkuIds]);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // Ignore reader stop error
      }
      controlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const buildHints = useCallback((pref: ScanModePreference) => {
    const hints = new Map();
    if (pref === 'barcode') {
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
      ]);
    } else if (pref === 'qr') {
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
      ]);
    } else {
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.DATA_MATRIX,
      ]);
    }
    return hints;
  }, []);

  const processDecodedValue = useCallback(
    (rawText: string, formatLabel: string) => {
      const matchedSku = findMatchingSku(rawText, skuCatalog);
      const matchedDoorInfo = matchedSku ? null : findMatchingDoorOrSlot(rawText, doors);
      const externalUrl = matchedSku || matchedDoorInfo ? null : safeExternalUrl(rawText);

      setLastResult({
        rawText,
        formatLabel,
        matchedSku,
        matchedDoorInfo,
        externalUrl,
      });

      const entry: ScannedEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rawText,
        formatLabel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        matchedType: matchedSku
          ? 'sku'
          : matchedDoorInfo?.slotCoord
            ? 'slot'
            : matchedDoorInfo
              ? 'door'
              : externalUrl
                ? 'url'
                : 'text',
        label: matchedSku
          ? matchedSku.name
          : matchedDoorInfo
            ? `Door ${matchedDoorInfo.door.number}${matchedDoorInfo.slotCoord ? ` · ${matchedDoorInfo.slotCoord}` : ''}`
            : rawText,
      };

      setScanHistory((prev) => {
        if (prev[0]?.rawText === rawText) return prev;
        return [entry, ...prev].slice(0, 8);
      });
    },
    [skuCatalog, doors]
  );

  const startCamera = useCallback(
    async (overrideDeviceId?: string) => {
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Live camera API is unavailable in this browser context. Ensure HTTPS is active or use Photo Scan / Manual UPC entry.'
        );
        return;
      }

      setCameraStarting(true);
      try {
        let stream: MediaStream;
        const primaryConstraints: MediaStreamConstraints = {
          video: overrideDeviceId
            ? { deviceId: { exact: overrideDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
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
        setCameraPermission('granted');

        // Enumerate cameras now that permission is granted so labels and IDs populate
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const cams = allDevices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(cams);
          const activeTrack = stream.getVideoTracks()[0];
          const activeDeviceId = activeTrack?.getSettings()?.deviceId;
          if (activeDeviceId) {
            setSelectedDeviceId(activeDeviceId);
          } else if (cams[0]?.deviceId) {
            setSelectedDeviceId(cams[0].deviceId);
          }
        } catch {
          // Non-fatal if device enumeration fails
        }

        if (!videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          setCameraStarting(false);
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);

        const reader = new BrowserMultiFormatReader(buildHints(scanPreference), {
          delayBetweenScanAttempts: 180,
        });

        const controls = await reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (result) {
            const fmtName = BarcodeFormat[result.getBarcodeFormat()] || 'CODE';
            processDecodedValue(result.getText(), fmtName);
          }
        });

        controlsRef.current = controls;
        setCameraActive(true);
        setTorchSupported(Boolean(controls.switchTorch));
      } catch (err) {
        stopCamera();
        const errName = err instanceof DOMException ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'SecurityError') {
          setCameraPermission('denied');
          setCameraError(
            'Camera permission was blocked or dismissed. Allow Camera in your browser site settings (lock/camera icon in address bar) and click Retry Camera.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCameraError('No camera hardware detected on this device. Use Photo Scan or Manual UPC entry.');
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          setCameraError('Camera is currently in use by another app or tab. Close other video apps and retry.');
        } else {
          setCameraError(
            'Unable to start live camera feed. Check camera permissions or use Photo Scan / Manual UPC entry.'
          );
        }
      } finally {
        setCameraStarting(false);
      }
    },
    [buildHints, processDecodedValue, scanPreference, stopCamera]
  );

  // Check browser camera permission status when modal opens
  useEffect(() => {
    if (!open) return;
    let active = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          if (!active) return;
          setCameraPermission(status.state);
          status.onchange = () => {
            if (active) setCameraPermission(status.state);
          };
        })
        .catch(() => {
          if (active) setCameraPermission('unknown');
        });
    }
    return () => {
      active = false;
    };
  }, [open]);

  // Clean up camera when modal closes or switches away from camera tab
  useEffect(() => {
    if (!open || activeMode !== 'camera') {
      stopCamera();
    }
  }, [open, activeMode, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Sync default label Door / SKU IDs and preset mode when modal opens
  useEffect(() => {
    if (open) {
      if (initialMode) setActiveMode(initialMode);
      if (initialPreference) setScanPreference(initialPreference);
      setLabelDoorId((prev) => prev || selectedDoorId || doors[0]?.id || '');
      if (!skuCatalog[labelSkuId]) {
        const firstSku = Object.values(skuCatalog)[0];
        if (firstSku) setLabelSkuId(firstSku.id);
      }
    }
  }, [open, initialMode, initialPreference, selectedDoorId, doors, skuCatalog, labelSkuId]);

  // Generate QR preview data URL when labels tab is active
  const labelPayload = useMemo(() => {
    if (labelType === 'door') {
      return `kooleriq://door/${labelDoorId || doors[0]?.id || 'door-01'}`;
    }
    const sku = skuCatalog[labelSkuId] ?? Object.values(skuCatalog)[0];
    return sku
      ? `kooleriq://sku/${sku.id}${sku.upc ? `?upc=${sku.upc}` : ''}`
      : 'kooleriq://sku/sku-coke-orig';
  }, [labelType, labelDoorId, labelSkuId, doors, skuCatalog]);

  useEffect(() => {
    if (!open || activeMode !== 'labels') return;
    QRCode.toDataURL(labelPayload, {
      width: 240,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => setQrPreviewDataUrl(url))
      .catch(() => setQrPreviewDataUrl(''));
  }, [open, activeMode, labelPayload]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);
    const objectUrl = URL.createObjectURL(file);

    try {
      const reader = new BrowserMultiFormatReader(buildHints(scanPreference));
      const result = await reader.decodeFromImageUrl(objectUrl);
      const fmtName = BarcodeFormat[result.getBarcodeFormat()] || 'IMAGE';
      processDecodedValue(result.getText(), fmtName);
    } catch {
      setCameraError(
        'No readable barcode or QR code detected in that image. Try a sharper crop or enter the digits manually.'
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
      e.target.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = manualInput.trim();
    if (!val) return;
    const isDigits = /^\d+$/.test(val);
    processDecodedValue(
      val,
      isDigits
        ? val.length === 12
          ? 'UPC_A'
          : val.length === 13
            ? 'EAN_13'
            : 'BARCODE'
        : val.startsWith('kooleriq://') || val.startsWith('http')
          ? 'QR_CODE'
          : 'MANUAL'
    );
  };

  const handleToggleTorch = async () => {
    if (!controlsRef.current?.switchTorch) return;
    const next = !torchOn;
    try {
      await controlsRef.current.switchTorch(next);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const handleCopyCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const skuLocationsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    doors.forEach((door) => {
      door.shelves.flat().forEach((slot) => {
        if (!map[slot.skuId]) map[slot.skuId] = [];
        map[slot.skuId].push(`D${door.number}·${slot.coord}`);
      });
    });
    return map;
  }, [doors]);

  const sortedCatalogForLabels = useMemo(
    () => Object.values(skuCatalog).sort((a, b) => a.name.localeCompare(b.name)),
    [skuCatalog]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto glacier-hud rounded-xl p-4 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--kq-border)] pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] flex items-center justify-center shrink-0">
              <ScanBarcode className="w-5 h-5 text-[var(--kq-accent)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-display font-bold text-[var(--kq-text)] truncate">
                Barcode &amp; QR Code Scanner
              </h2>
              <p className="text-xs text-[var(--kq-text-secondary)] truncate">
                {targetSlotContext
                  ? `Target facing: Door ${targetSlotContext.doorNumber} · ${targetSlotContext.slotCoord}`
                  : `${settings.storeName} · UPC-A, EAN-13, Code-128 & KoolerIQ QR`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:bg-[var(--kq-surface-muted)]"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Input Mode Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] overflow-x-auto">
            {(
              [
                { id: 'camera', label: 'Live Camera', icon: Camera },
                { id: 'upload', label: 'Photo Scan', icon: Upload },
                { id: 'manual', label: 'Wedge / Manual', icon: Keyboard },
                { id: 'labels', label: 'QR Labels', icon: QrCode },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setActiveMode(tab.id);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[var(--kq-surface)] text-[var(--kq-accent)] font-semibold shadow-sm'
                      : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeMode !== 'labels' && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] self-start">
              {(
                [
                  { id: 'auto', label: 'Auto' },
                  { id: 'barcode', label: '1D UPC' },
                  { id: 'qr', label: '2D QR' },
                ] as const
              ).map((pref) => (
                <button
                  key={pref.id}
                  type="button"
                  onClick={() => setScanPreference(pref.id)}
                  className={`min-h-[34px] px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                    scanPreference === pref.id
                      ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                      : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                  }`}
                >
                  {pref.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Scanner Workspace */}
        {activeMode === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-[var(--kq-cabinet)] border border-slate-700/80 h-[280px] sm:h-[320px] flex flex-col items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
                  cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              />

              {/* Optical Target Reticle */}
              {cameraActive && (
                <div className="relative z-10 pointer-events-none flex items-center justify-center p-6">
                  <div
                    className={`relative border border-sky-400/50 rounded-lg transition-all ${
                      scanPreference === 'qr'
                        ? 'w-48 h-48'
                        : scanPreference === 'barcode'
                          ? 'w-72 h-28'
                          : 'w-64 h-44'
                    }`}
                  >
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-sky-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-sky-400" />
                    <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-sky-400" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-sky-400" />
                    <div className="absolute inset-x-3 top-1/2 h-0.5 bg-sky-400/75" />
                  </div>
                </div>
              )}

              {!cameraActive && (
                <div className="relative z-10 p-6 text-center space-y-3 max-w-md">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-sky-400/35 flex items-center justify-center mx-auto">
                    <ScanLine className="w-6 h-6 text-sky-400" />
                  </div>
                  <div className="text-sm font-semibold text-slate-100">
                    {cameraPermission === 'denied'
                      ? 'Camera Access Blocked in Browser'
                      : 'Allow Camera to Scan UPCs & Door QR Codes'}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {cameraPermission === 'denied'
                      ? 'Enable Camera permission in your browser site settings, then click Retry Camera below.'
                      : 'Grant camera permission to scan bottle/can UPC-A, EAN-13, and KoolerIQ QR codes directly.'}
                  </p>
                  <button
                    type="button"
                    disabled={cameraStarting}
                    onClick={() => startCamera()}
                    className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-60 transition-colors inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {cameraStarting
                      ? 'Requesting Camera...'
                      : cameraPermission === 'denied'
                        ? 'Retry Camera'
                        : cameraPermission === 'granted'
                          ? 'Start Camera Scanner'
                          : 'Allow Camera & Scan'}
                  </button>
                </div>
              )}
            </div>

            {cameraActive && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {videoDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                        startCamera(e.target.value);
                      }}
                      className="min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
                      aria-label="Select camera lens"
                    >
                      {videoDevices.map((dev, idx) => (
                        <option key={dev.deviceId} value={dev.deviceId}>
                          {dev.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}

                  {torchSupported && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`min-h-[40px] px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                        torchOn
                          ? 'bg-[var(--kq-amber-soft)] border-[var(--kq-amber)] text-[var(--kq-amber-text)]'
                          : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)]'
                      }`}
                    >
                      <Flashlight className="w-3.5 h-3.5" />
                      {torchOn ? 'Flash On' : 'Flash'}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="min-h-[40px] px-4 rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] text-[var(--kq-crimson-text)] text-xs font-semibold hover:opacity-90"
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>
        )}

        {activeMode === 'upload' && (
          <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-6 text-center space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5 text-[var(--kq-accent)]" />
            </div>
            <div className="text-sm font-semibold text-[var(--kq-text)]">
              Decode Barcode or QR Code from Image
            </div>
            <p className="text-xs text-[var(--kq-text-secondary)] max-w-md mx-auto">
              Upload a photo of a beverage package UPC, distributor invoice label, or QR code sticker.
              Decoding runs locally in your browser.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] transition-colors inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Choose Barcode / QR Image
            </button>
          </div>
        )}

        {activeMode === 'manual' && (
          <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 space-y-3">
            <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                autoFocus
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Scan with USB/Bluetooth scanner or type UPC / QR code (e.g. 049000000443)"
                className="flex-1 min-h-[44px] px-3.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-sm font-mono-tabular text-[var(--kq-text)] placeholder:text-[var(--kq-text-muted)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] transition-colors whitespace-nowrap shrink-0"
              >
                Lookup Code
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--kq-text-muted)]">
              <span>Quick test codes:</span>
              {[
                { label: 'Coke 20oz UPC', code: '049000000443' },
                { label: 'Pepsi 20oz UPC', code: '012000001291' },
                { label: 'Monster Ultra UPC', code: '070847012474' },
                { label: `Door ${doors[0]?.number || '01'} QR`, code: `kooleriq://door/${doors[0]?.id || 'door-01'}` },
              ].map((sample) => (
                <button
                  key={sample.code}
                  type="button"
                  onClick={() => {
                    setManualInput(sample.code);
                    processDecodedValue(
                      sample.code,
                      sample.code.startsWith('kooleriq://') ? 'QR_CODE' : 'UPC_A'
                    );
                  }}
                  className="min-h-[32px] px-2.5 py-1 rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:border-[var(--kq-accent)] font-mono-tabular transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeMode === 'labels' && (
          <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-7 space-y-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border)] w-fit">
                <button
                  type="button"
                  onClick={() => setLabelType('door')}
                  className={`min-h-[34px] px-3 py-1 rounded text-xs font-medium ${
                    labelType === 'door'
                      ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                      : 'text-[var(--kq-text-secondary)]'
                  }`}
                >
                  Cooler Door QR
                </button>
                <button
                  type="button"
                  onClick={() => setLabelType('sku')}
                  className={`min-h-[34px] px-3 py-1 rounded text-xs font-medium ${
                    labelType === 'sku'
                      ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                      : 'text-[var(--kq-text-secondary)]'
                  }`}
                >
                  Beverage SKU QR
                </button>
              </div>

              {labelType === 'door' ? (
                <div>
                  <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                    Select Cooler Door
                  </label>
                  <select
                    value={labelDoorId}
                    onChange={(e) => setLabelDoorId(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
                  >
                    {doors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Door {d.number} · {d.label} ({d.shelves.length}×{d.facingsPerShelf})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[var(--kq-text-secondary)] mb-1">
                    Select Beverage SKU
                  </label>
                  <select
                    value={labelSkuId}
                    onChange={(e) => setLabelSkuId(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
                  >
                    {sortedCatalogForLabels.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.upc ? `(${s.upc})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] break-all bg-[var(--kq-surface)] rounded p-2 border border-[var(--kq-border)]">
                {labelPayload}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {qrPreviewDataUrl && (
                  <a
                    href={qrPreviewDataUrl}
                    download={`kooleriq-qr-${labelType}-${labelType === 'door' ? labelDoorId : labelSkuId}.png`}
                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download QR PNG
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => processDecodedValue(labelPayload, 'QR_CODE')}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] hover:border-[var(--kq-accent)] inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
                  Test Decode
                </button>
              </div>
            </div>

            <div className="sm:col-span-5 flex flex-col items-center justify-center bg-white rounded-xl p-4 border border-[var(--kq-border)]">
              {qrPreviewDataUrl ? (
                <img
                  src={qrPreviewDataUrl}
                  alt={`QR Code for ${labelPayload}`}
                  referrerPolicy="no-referrer"
                  className="w-40 h-40 object-contain"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-500">
                  Generating QR...
                </div>
              )}
              <span className="text-[11px] font-mono-tabular text-slate-700 font-semibold mt-1">
                KOOLERIQ · {labelType === 'door' ? 'DOOR TAG' : 'SKU TAG'}
              </span>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="rounded-lg bg-[var(--kq-amber-soft)] border border-[var(--kq-amber)] px-4 py-2.5 text-xs text-[var(--kq-amber-text)]">
            {cameraError}
          </div>
        )}

        {/* Decoded Scan Result Panel */}
        {lastResult && (
          <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-accent-border)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-mono-tabular">
                <span className="text-[var(--kq-emerald)] font-semibold">DECODED</span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--kq-text-secondary)]">{lastResult.formatLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--kq-text)] font-semibold break-all">
                  {lastResult.rawText}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(lastResult.rawText)}
                className="min-h-[32px] px-2.5 rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[11px] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] flex items-center gap-1 shrink-0"
              >
                {copiedCode ? <Check className="w-3 h-3 text-[var(--kq-emerald)]" /> : <Copy className="w-3 h-3" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>

            {lastResult.matchedSku ? (
              (() => {
                const sku = lastResult.matchedSku;
                const isCarried = carriedSet.has(sku.id);
                const locations = skuLocationsMap[sku.id] || [];
                const caseUnits = sku.unitsPerCase ?? 12;

                return (
                  <div className="rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border)] p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-16 rounded bg-[var(--kq-cabinet)] border border-[var(--kq-border)] flex items-center justify-center shrink-0">
                          <BeverageVisual sku={sku} size="md" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[var(--kq-text)] truncate">
                            {sku.name}
                          </div>
                          <div className="text-xs font-mono-tabular text-[var(--kq-text-muted)] mt-0.5">
                            {sku.upc ? `UPC ${sku.upc}` : sku.skuCode} · {sku.distributor || 'Direct'} ·{' '}
                            {sku.category || sku.brandLabel}
                          </div>
                          <div className="text-xs font-mono-tabular text-[var(--kq-text-secondary)] mt-1">
                            {typeof sku.netUnitCost === 'number'
                              ? `Cost $${sku.netUnitCost.toFixed(2)}/u · `
                              : ''}
                            Retail ${sku.price.toFixed(2)} ·{' '}
                            <span className="text-[var(--kq-emerald)] font-semibold">
                              {sku.marginPct.toFixed(1)}% margin
                            </span>
                            {' · '}
                            Walk-in: {sku.backroomQty}u
                          </div>
                          <div className="text-[11px] font-mono-tabular text-[var(--kq-accent)] mt-0.5">
                            {locations.length > 0
                              ? `Cooler Facings: ${locations.join(', ')}`
                              : isCarried
                                ? 'Carried at store (not yet placed on shelf)'
                                : 'In Master Catalog (not yet carried at this store)'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--kq-border)]">
                      {targetSlotContext && onAssignSkuToTargetSlot && (
                        <button
                          type="button"
                          onClick={() => {
                            onAssignSkuToTargetSlot(
                              targetSlotContext.doorId,
                              targetSlotContext.slotId,
                              sku.id
                            );
                            onClose();
                          }}
                          className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] whitespace-nowrap"
                        >
                          Assign to {targetSlotContext.slotCoord}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onOrderBackroomCase(sku.id)}
                        className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 whitespace-nowrap"
                      >
                        +1 Case ({caseUnits}u)
                      </button>

                      {locations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onPullSkuToFloor(sku.id)}
                          className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] whitespace-nowrap"
                        >
                          Pull to Floor
                        </button>
                      )}

                      {locations.length === 0 && (
                        <button
                          type="button"
                          onClick={() => onToggleCarriedSku(sku.id)}
                          className={`min-h-[40px] px-3.5 py-2 rounded-lg border text-xs font-medium whitespace-nowrap ${
                            isCarried
                              ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                              : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border-strong)] text-[var(--kq-text)]'
                          }`}
                        >
                          {isCarried ? 'Carried at Store' : '+ Carry at Store'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : lastResult.matchedDoorInfo ? (
              (() => {
                const { door, slotCoord } = lastResult.matchedDoorInfo;
                const m = getDoorMetrics(door);
                return (
                  <div className="rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border)] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--kq-text)]">
                        {door.label} {slotCoord ? `· Slot ${slotCoord}` : ''}
                      </div>
                      <div className="text-xs font-mono-tabular text-[var(--kq-text-secondary)] mt-0.5">
                        {formatTemp(door.tempF, settings.tempUnit)} · {m.compliancePct.toFixed(1)}%
                        compliance · {m.oosCount} OOS gaps
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDoorAndNavigate(door.id, 'dashboard');
                          onClose();
                        }}
                        className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] whitespace-nowrap"
                      >
                        Open Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDoorAndNavigate(door.id, 'scan');
                          onClose();
                        }}
                        className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-medium hover:border-[var(--kq-accent)] whitespace-nowrap"
                      >
                        Shelf Audit
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border)] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--kq-text)]">
                    Unregistered Barcode / QR Payload
                  </div>
                  <p className="text-xs text-[var(--kq-text-secondary)] mt-0.5">
                    Not yet matched to a Swire Coca-Cola, PepsiCo, or store SKU.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {lastResult.externalUrl && (
                    <a
                      href={lastResult.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] hover:border-[var(--kq-accent)] inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open URL
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onCreateSkuFromBarcode(lastResult.rawText);
                      onClose();
                    }}
                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <Plus className="w-3 h-3 -ml-1" />
                    Add as New Beverage SKU
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Session Scans */}
        {scanHistory.length > 0 && (
          <div className="border-t border-[var(--kq-border)] pt-3">
            <div className="text-xs font-semibold text-[var(--kq-text-secondary)] mb-2">
              Recent Scans ({scanHistory.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scanHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => processDecodedValue(item.rawText, item.formatLabel)}
                  className="text-left rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] hover:border-[var(--kq-accent)] px-3 py-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular text-[var(--kq-text-muted)]">
                    <span>{item.formatLabel}</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <div className="text-xs font-medium text-[var(--kq-text)] truncate mt-0.5">
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
