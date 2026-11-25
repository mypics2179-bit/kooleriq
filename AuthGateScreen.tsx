import React from 'react';
import {
  BarChart3,
  Database,
  LayoutGrid,
  Lock,
  LogIn,
  Package,
  Play,
  ScanBarcode,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import { NavTab } from '../types/kooleriq';
import { KoolerIQLogo } from './KoolerIQLogo';

interface AuthGateScreenProps {
  lockedTab: NavTab;
  isSigningIn: boolean;
  authError: string | null;
  onSignIn: () => void;
  onOpenPrototype: () => void;
}

const LOCKED_MODULES: {
  id: Exclude<NavTab, 'settings'>;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard & AI Platform',
    desc: 'Cooler door grids, cold-chain telemetry, and Gemini merchandising swaps',
    icon: LayoutGrid,
  },
  {
    id: 'inventory',
    label: 'Inventory & UPC Catalog',
    desc: '157+ Swire & PepsiCo SKUs, walk-in backstock, and wholesale margins',
    icon: Package,
  },
  {
    id: 'scan',
    label: 'Optical & Barcode Scan Hub',
    desc: 'Live camera barcode/QR scanner and AI cooler shelf auditing',
    icon: ScanBarcode,
  },
  {
    id: 'orders',
    label: 'Distributor Orders',
    desc: 'Auto-calculated case replenishment POs and Google Play plan quotas',
    icon: ShoppingCart,
  },
  {
    id: 'reports',
    label: 'Reports & Search Trends',
    desc: 'Search-grounded beverage trends, audit ledgers, and CSV exports',
    icon: BarChart3,
  },
];

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  lockedTab,
  isSigningIn,
  authError,
  onSignIn,
  onOpenPrototype,
}) => {
  const activeModule = LOCKED_MODULES.find((m) => m.id === lockedTab) ?? LOCKED_MODULES[0];

  return (
    <section
      aria-label="Protected Workspace Sign-In Gate"
      className="py-6 sm:py-10 flex items-center justify-center"
    >
      <div className="max-w-3xl w-full glacier-card rounded-2xl p-6 sm:p-8 border border-[var(--kq-border-strong)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--kq-border)]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tabular font-semibold text-[var(--kq-accent)]">
              <Lock className="w-3.5 h-3.5" />
              <span>PROTECTED STORE WORKSPACE · {activeModule.label.toUpperCase()} LOCKED</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-[var(--kq-text)]">
              Sign in with Google to Unlock KoolerIQ
            </h2>
            <p className="text-xs sm:text-sm text-[var(--kq-text-secondary)] max-w-xl leading-relaxed">
              Dashboard, Inventory, Scan Hub, Orders, and Reports are secured by Firebase
              Authentication and synced in real time to your private Cloud Firestore database.
            </p>
          </div>
          <div className="shrink-0 hidden sm:block">
            <KoolerIQLogo size={42} showWordmark={false} />
          </div>
        </div>

        {/* Locked Module Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOCKED_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isSelected = mod.id === activeModule.id;
            return (
              <div
                key={mod.id}
                className={`rounded-xl p-3.5 border transition-colors space-y-1.5 ${
                  isSelected
                    ? 'bg-[var(--kq-accent-soft)] border-[var(--kq-accent-border)]'
                    : 'bg-[var(--kq-surface-muted)] border-[var(--kq-border)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--kq-text)]">
                    <Icon className="w-4 h-4 text-[var(--kq-accent)] shrink-0" />
                    <span className="truncate">{mod.label}</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-[var(--kq-text-muted)] shrink-0" />
                </div>
                <p className="text-[11px] text-[var(--kq-text-secondary)] leading-snug">
                  {mod.desc}
                </p>
              </div>
            );
          })}
        </div>

        {authError && (
          <div className="rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-4 py-3 text-xs text-[var(--kq-crimson-text)]">
            {authError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[var(--kq-border)]">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--kq-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--kq-emerald)]" />
              Verified Google Identity
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[var(--kq-accent)]" />
              Owner-Isolated Firestore Persistence
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenPrototype}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text)] text-xs font-semibold hover:border-[var(--kq-accent)] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 text-[var(--kq-accent)]" />
              Preview Animated Prototype
            </button>

            <button
              type="button"
              disabled={isSigningIn}
              onClick={onSignIn}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-sm font-semibold hover:bg-[var(--kq-accent-hover)] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              {isSigningIn ? 'Signing in...' : 'Sign in with Google to Unlock'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
