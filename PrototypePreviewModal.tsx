import React from 'react';
import { Download, Play, X } from 'lucide-react';

interface PrototypePreviewModalProps {
  open: boolean;
  onClose: () => void;
}

export const PrototypePreviewModal: React.FC<PrototypePreviewModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="KoolerIQ Animated Single-File Prototype"
    >
      <div className="glacier-card w-full max-w-6xl h-[88vh] rounded-2xl overflow-hidden flex flex-col border border-[var(--kq-border-strong)]">
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--kq-border)] bg-[var(--kq-surface)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Play className="w-4 h-4 text-[var(--kq-accent)] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--kq-text)] truncate">
                KoolerIQ Interactive Animated Prototype
              </h3>
              <p className="text-[11px] text-[var(--kq-text-muted)] truncate">
                Standalone single-file HTML prototype · Auto-tour &amp; live interactive cooler controls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/kooleriq-prototype.html"
              download="kooleriq-prototype.html"
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download Single File (.html)
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] flex items-center justify-center"
              aria-label="Close prototype preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <iframe
          src="/kooleriq-prototype.html"
          title="KoolerIQ Interactive Animated Prototype"
          className="w-full flex-1 border-0 bg-[var(--kq-canvas)]"
        />
      </div>
    </div>
  );
};
