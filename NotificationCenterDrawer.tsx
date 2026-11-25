import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCheck,
  Info,
  Thermometer,
  Trash2,
  X,
} from 'lucide-react';
import { NavTab, NotificationCategory, NotificationItem } from '../types/kooleriq';

interface NotificationCenterDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearRead: () => void;
  onNavigate: (tab: NavTab, doorId?: string) => void;
}

const FILTER_LABELS: Record<'all' | 'unread' | NotificationCategory, string> = {
  all: 'All',
  unread: 'Unread',
  'cold-chain': 'Cold-Chain',
  stock: 'OOS & Stock',
  audit: 'Audits',
  system: 'System',
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Now';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString();
}

export const NotificationCenterDrawer: React.FC<NotificationCenterDrawerProps> = ({
  open,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearRead,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationCategory>('all');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.read;
      if (filter !== 'all') return n.category === filter;
      return true;
    });
  }, [notifications, filter]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        aria-label="Notification Center"
        className="w-full max-w-lg h-full bg-[var(--kq-surface)] border-l border-[var(--kq-border-strong)] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--kq-border)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
              <Bell className="w-4 h-4 shrink-0" />
              <span>
                Notification Center · {unreadCount} unread
              </span>
            </div>
            <h2 className="text-base font-display font-bold text-[var(--kq-text)] mt-0.5">
              Cooler Alerts &amp; Route Updates
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text)] disabled:opacity-40 flex items-center gap-1 whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[var(--kq-accent)]" />
              Mark All Read
            </button>
            <button
              type="button"
              onClick={onClearRead}
              className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-medium text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] flex items-center gap-1 whitespace-nowrap"
              title="Dismiss read notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Read
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] min-w-[36px] rounded-lg text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:bg-[var(--kq-surface-muted)] flex items-center justify-center"
              aria-label="Close notification center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="px-5 py-3 border-b border-[var(--kq-border)] bg-[var(--kq-surface-muted)]/40 flex items-center gap-1 overflow-x-auto">
          {(Object.keys(FILTER_LABELS) as Array<'all' | 'unread' | NotificationCategory>).map(
            (key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filter === key
                    ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                    : 'bg-[var(--kq-surface)] border border-[var(--kq-border)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                }`}
              >
                {FILTER_LABELS[key]}
              </button>
            )
          )}
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--kq-border)]">
          {filtered.length === 0 ? (
            <div className="p-10 text-center space-y-1.5">
              <div className="text-sm font-semibold text-[var(--kq-text)]">
                All caught up
              </div>
              <p className="text-xs text-[var(--kq-text-muted)]">
                No notifications match this filter. Live temperature faults, OOS triggers, and sync events appear here.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const Icon =
                item.category === 'cold-chain'
                  ? Thermometer
                  : item.severity === 'critical' || item.severity === 'warning'
                    ? AlertTriangle
                    : Info;

              const sevColor =
                item.severity === 'critical'
                  ? 'text-[var(--kq-crimson)]'
                  : item.severity === 'warning'
                    ? 'text-[var(--kq-amber)]'
                    : item.severity === 'success'
                      ? 'text-[var(--kq-emerald)]'
                      : 'text-[var(--kq-accent)]';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.read) onMarkRead(item.id);
                  }}
                  className={`px-5 py-3.5 transition-colors cursor-pointer ${
                    item.read
                      ? 'opacity-75 hover:bg-[var(--kq-surface-muted)]/35'
                      : 'bg-[var(--kq-accent-soft)]/35 hover:bg-[var(--kq-accent-soft)]/55'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${sevColor}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--kq-text)]">
                            {item.title}
                          </span>
                          {!item.read && (
                            <span className="text-[11px] font-mono-tabular font-semibold text-[var(--kq-accent)]">
                              · Unread
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--kq-text-secondary)] mt-1 leading-relaxed">
                          {item.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] font-mono-tabular text-[var(--kq-text-muted)]">
                          <span>{FILTER_LABELS[item.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(item.timestampIso)}</span>
                          {item.targetTab && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkRead(item.id);
                                onNavigate(item.targetTab!, item.doorId);
                                onClose();
                              }}
                              className="ml-auto inline-flex items-center gap-1 text-xs font-sans font-semibold text-[var(--kq-accent)] hover:underline whitespace-nowrap"
                            >
                              Open View
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
