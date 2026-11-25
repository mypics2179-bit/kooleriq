import React, { useEffect, useState } from 'react';
import { Camera, ClipboardList, Compass, FileSpreadsheet, Globe, Images, Minus, Play, Plus, RotateCcw, ShieldCheck, Thermometer } from 'lucide-react';
import { CoolerDoor, StoreSettings } from '../types/kooleriq';
import { formatTemp } from '../utils/formatters';
import { KoolerIQLogo } from './KoolerIQLogo';

interface SettingsScreenProps {
  settings: StoreSettings;
  doors: CoolerDoor[];
  onUpdateSettings: (patch: Partial<StoreSettings>) => void;
  onUpdateDoorTargetTemp: (doorId: string, deltaF: number) => void;
  onExportCsv: () => void;
  onResetDemo: () => void;
  onOpenOnboarding: () => void;
  onOpenCsvHub: () => void;
  onOpenImageLibrary: () => void;
  onOpenAuditLog: () => void;
  onOpenPrototype: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  doors,
  onUpdateSettings,
  onUpdateDoorTargetTemp,
  onExportCsv,
  onResetDemo,
  onOpenOnboarding,
  onOpenCsvHub,
  onOpenImageLibrary,
  onOpenAuditLog,
  onOpenPrototype,
}) => {
  const [brandLogoFailed, setBrandLogoFailed] = useState(false);
  const [cameraPerm, setCameraPerm] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');
  const [cameraChecking, setCameraChecking] = useState(false);

  useEffect(() => {
    let active = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          if (!active) return;
          setCameraPerm(status.state);
          status.onchange = () => {
            if (active) setCameraPerm(status.state);
          };
        })
        .catch(() => {
          if (active) setCameraPerm('unknown');
        });
    }
    return () => {
      active = false;
    };
  }, []);

  const handleRequestCameraPermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPerm('denied');
      return;
    }
    setCameraChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPerm('granted');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraPerm('denied');
      }
    } finally {
      setCameraChecking(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Store & Fleet Endpoint */}
      <div className="glacier-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--kq-surface-muted)] border border-[var(--kq-accent-border)] flex items-center justify-center shrink-0">
            {!brandLogoFailed ? (
              <img
                src="/src/assets/images/kooleriq_brand_logo_1795456908836.jpg"
                alt="KoolerIQ brand emblem"
                referrerPolicy="no-referrer"
                onError={() => setBrandLogoFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <KoolerIQLogo size={40} showWordmark={false} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--kq-accent)] font-medium">
              <Globe className="w-4 h-4 shrink-0" />
              <span>www.kooleriq.com</span>
              <span aria-hidden="true">·</span>
              <span>{settings.storeCode}</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--kq-text)] mt-1 truncate">
              {settings.storeName}
            </h2>
            <p className="text-xs text-[var(--kq-text-secondary)] mt-0.5 truncate">
              {settings.address} · Route {settings.routeId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onOpenPrototype}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Play className="w-4 h-4 text-[var(--kq-accent)]" />
            Animated Prototype
          </button>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Compass className="w-4 h-4 text-[var(--kq-accent)]" />
            Setup Guide
          </button>
          <button
            type="button"
            onClick={onOpenAuditLog}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <ClipboardList className="w-4 h-4 text-[var(--kq-accent)]" />
            Audit Log
          </button>
          <button
            type="button"
            onClick={onOpenImageLibrary}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Images className="w-4 h-4 text-[var(--kq-accent)]" />
            Image Library
          </button>
          <button
            type="button"
            onClick={onOpenCsvHub}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV Import / Export
          </button>
          <button
            type="button"
            onClick={onResetDemo}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] text-xs font-medium hover:text-[var(--kq-text)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Telemetry
          </button>
        </div>
      </div>

      {/* Telemetry Units & Alert Thresholds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glacier-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-[var(--kq-accent)]" />
            <h3 className="text-base font-semibold text-[var(--kq-text)]">
              Cold-Chain &amp; Stock Thresholds
            </h3>
          </div>

          {/* Temperature Unit */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--kq-border)]">
            <div>
              <div className="text-sm font-medium text-[var(--kq-text)]">Temperature Scale</div>
              <div className="text-xs text-[var(--kq-text-muted)]">
                Applies live across all cooler doors
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)]">
              {(['F', 'C'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => onUpdateSettings({ tempUnit: unit })}
                  className={`min-h-[36px] px-3.5 py-1 rounded text-xs font-mono-tabular font-semibold transition-colors ${
                    settings.tempUnit === unit
                      ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                      : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                  }`}
                >
                  °{unit}
                </button>
              ))}
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--kq-border)]">
            <div>
              <div className="text-sm font-medium text-[var(--kq-text)]">Low-Stock Alert Level</div>
              <div className="text-xs text-[var(--kq-text-muted)]">
                Flags shelf facings in Amber below this capacity
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)]">
              {[20, 25, 33].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onUpdateSettings({ lowStockThresholdPct: pct })}
                  className={`min-h-[36px] px-3 py-1 rounded text-xs font-mono-tabular font-semibold transition-colors ${
                    settings.lowStockThresholdPct === pct
                      ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                      : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Max Temperature Fault */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--kq-border)]">
            <div>
              <div className="text-sm font-medium text-[var(--kq-text)]">High-Temp Fault Alert</div>
              <div className="text-xs text-[var(--kq-text-muted)]">
                Triggers Crimson alert when cooler warms past threshold
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    maxTempAlertF: Math.max(35, Number((settings.maxTempAlertF - 0.5).toFixed(1))),
                  })
                }
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
                aria-label="Decrease max temp threshold"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono-tabular text-sm font-semibold text-[var(--kq-text)] w-16 text-center">
                {formatTemp(settings.maxTempAlertF, settings.tempUnit)}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    maxTempAlertF: Math.min(44, Number((settings.maxTempAlertF + 0.5).toFixed(1))),
                  })
                }
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
                aria-label="Increase max temp threshold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--kq-border)]">
            <div>
              <div className="text-sm font-medium text-[var(--kq-text)]">Auto-Sync Restock Queue</div>
              <div className="text-xs text-[var(--kq-text-muted)]">
                Push verified AI camera OOS gaps directly to route picklist
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ autoRestockSync: !settings.autoRestockSync })}
              className={`min-h-[36px] px-3.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
                settings.autoRestockSync
                  ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                  : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border-strong)] text-[var(--kq-text-muted)]'
              }`}
            >
              {settings.autoRestockSync ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Camera Access Permission */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium text-[var(--kq-text)]">Camera &amp; Scanner Access</div>
              <div className="text-xs text-[var(--kq-text-muted)]">
                {cameraPerm === 'granted'
                  ? 'Camera permission allowed for shelf audits and UPC/QR scanning'
                  : cameraPerm === 'denied'
                    ? 'Blocked in browser settings — allow Camera in address bar then retry'
                    : 'Pre-authorize rear camera for live cooler scans and UPC decoding'}
              </div>
            </div>
            <button
              type="button"
              disabled={cameraChecking}
              onClick={handleRequestCameraPermission}
              className={`min-h-[36px] px-3.5 py-1.5 rounded text-xs font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                cameraPerm === 'granted'
                  ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                  : cameraPerm === 'denied'
                    ? 'bg-[var(--kq-crimson-soft)] border-[var(--kq-crimson)] text-[var(--kq-crimson-text)]'
                    : 'bg-[var(--kq-accent-soft)] border-[var(--kq-accent-border)] text-[var(--kq-accent)]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              {cameraChecking
                ? 'Checking...'
                : cameraPerm === 'granted'
                  ? 'Allowed'
                  : cameraPerm === 'denied'
                    ? 'Retry Access'
                    : 'Allow Camera'}
            </button>
          </div>
        </div>

        {/* Individual Door Setpoints */}
        <div className="glacier-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--kq-emerald)]" />
            <h3 className="text-base font-semibold text-[var(--kq-text)]">
              Cooler Door Setpoints ({doors.length} {doors.length === 1 ? 'Door' : 'Doors'})
            </h3>
          </div>

          <div className="space-y-3">
            {doors.map((door) => {
              const isWarm = door.tempF > settings.maxTempAlertF;
              return (
                <div
                  key={door.id}
                  className="rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)] p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--kq-text)] truncate">
                      {door.label}
                    </div>
                    <div className="text-xs font-mono-tabular text-[var(--kq-text-muted)] mt-0.5">
                      Live:{' '}
                      <span
                        className={
                          isWarm
                            ? 'text-[var(--kq-crimson)] font-semibold'
                            : 'text-[var(--kq-accent)] font-semibold'
                        }
                      >
                        {formatTemp(door.tempF, settings.tempUnit)}
                      </span>{' '}
                      · Humidity {door.humidityPct}%
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateDoorTargetTemp(door.id, -0.5)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
                      aria-label={`Decrease target temp for ${door.label}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--kq-text)] w-14 text-center">
                      {formatTemp(door.targetTempF, settings.tempUnit)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateDoorTargetTemp(door.id, 0.5)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
                      aria-label={`Increase target temp for ${door.label}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
