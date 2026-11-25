import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Download,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  AuditLogCategory,
  AuditLogEntry,
  AuditLogSeverity,
} from '../types/kooleriq';

interface AuditLogDrawerProps {
  open: boolean;
  onClose: () => void;
  entries: AuditLogEntry[];
  onExportCsv: () => void;
  onClearEntries?: () => void;
}

const CATEGORY_LABELS: Record<'all' | AuditLogCategory, string> = {
  all: 'All Events',
  'shelf-audit': 'Shelf Audits',
  inventory: 'Inventory',
  planogram: 'Planogram',
  layout: 'Cooler Layout',
  'cold-chain': 'Cold-Chain',
  csv: 'CSV Sync',
  media: 'Image Library',
  system: 'System',
};

const SEVERITY_TEXT_CLASS: Record<AuditLogSeverity, string> = {
  info: 'text-[var(--kq-accent)]',
  success: 'text-[var(--kq-emerald-text)]',
  warning: 'text-[var(--kq-amber-text)]',
  critical: 'text-[var(--kq-crimson-text)]',
};

function formatIsoTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  open,
  onClose,
  entries,
  onExportCsv,
  onClearEntries,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditLogCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditLogSeverity>('all');

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      if (severityFilter !== 'all' && entry.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.storeName.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q) ||
        (entry.doorLabel || '').toLowerCase().includes(q)
      );
    });
  }, [entries, search, categoryFilter, severityFilter]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        aria-label="Activity and Compliance Audit Log"
        className="w-full max-w-2xl h-full bg-[var(--kq-surface)] border-l border-[var(--kq-border-strong)] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--kq-border)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--kq-accent)] font-semibold">
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>Audit Log · {entries.length} Events Recorded</span>
            </div>
            <h2 className="text-base font-display font-bold text-[var(--kq-text)] mt-0.5 truncate">
              Store Compliance &amp; Operator Ledger
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExportCsv}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            {onClearEntries && entries.length > 0 && (
              <button
                type="button"
                onClick={onClearEntries}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-crimson)] text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                title="Clear recorded audit events"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] rounded-lg text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:bg-[var(--kq-surface-muted)] flex items-center justify-center"
              aria-label="Close audit log"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-5 py-3.5 border-b border-[var(--kq-border)] space-y-3 bg-[var(--kq-surface-muted)]/40">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--kq-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action, SKU, door, or operator..."
                className="w-full min-h-[40px] pl-9 pr-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)] placeholder:text-[var(--kq-text-muted)] focus:outline-none focus:border-[var(--kq-accent)]"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'all' | AuditLogSeverity)}
              aria-label="Filter by severity"
              className="min-h-[40px] px-3 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border-strong)] text-xs text-[var(--kq-text)]"
            >
              <option value="all">All Severities</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {(Object.keys(CATEGORY_LABELS) as Array<'all' | AuditLogCategory>).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold'
                    : 'bg-[var(--kq-surface)] border border-[var(--kq-border)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Event Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--kq-border)]">
          {filteredEntries.length === 0 ? (
            <div className="p-10 text-center space-y-1.5">
              <div className="text-sm font-semibold text-[var(--kq-text)]">
                No matching audit events
              </div>
              <p className="text-xs text-[var(--kq-text-muted)]">
                Adjust filters or perform a cooler audit, restock, layout edit, or CSV import to log activity.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="px-5 py-3.5 hover:bg-[var(--kq-surface-muted)]/40 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-mono-tabular font-semibold uppercase ${
                        SEVERITY_TEXT_CLASS[entry.severity]
                      }`}
                    >
                      {entry.severity}
                    </span>
                    <span className="text-[var(--kq-text-muted)] text-xs" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-sm font-semibold text-[var(--kq-text)] truncate">
                      {entry.action}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] whitespace-nowrap shrink-0">
                    {formatIsoTime(entry.timestampIso)}
                  </span>
                </div>

                <p className="text-xs text-[var(--kq-text-secondary)] leading-relaxed">
                  {entry.details}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--kq-text-muted)] font-mono-tabular">
                  <span>{CATEGORY_LABELS[entry.category]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.storeName}</span>
                  {entry.doorLabel && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{entry.doorLabel}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>By {entry.actor}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
