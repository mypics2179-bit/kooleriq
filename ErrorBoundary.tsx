import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaError: boolean;
  isFreeReadQuota: boolean;
}

export class FirestoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isQuotaError: false,
      isFreeReadQuota: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(message) as { error?: string; operationType?: string; path?: string };
      if (parsed && typeof parsed.error === 'string') {
        message = parsed.path
          ? `${parsed.error} (${parsed.operationType || 'operation'} on ${parsed.path})`
          : parsed.error;
      }
    } catch {
      // Standard non-JSON Error message
    }

    const isQuotaError = message.includes('Quota exceeded.');
    const isFreeReadQuota = message.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );

    return {
      hasError: true,
      errorMessage: message,
      isQuotaError,
      isFreeReadQuota,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('KoolerIQ ErrorBoundary caught error:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen bg-[var(--kq-canvas)] text-[var(--kq-text)] flex items-center justify-center p-4">
        <div className="max-w-lg w-full glacier-card rounded-2xl p-6 space-y-4 border border-[var(--kq-border-strong)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[var(--kq-crimson)]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-display font-bold text-[var(--kq-text)]">
                {this.state.isQuotaError || this.state.isFreeReadQuota
                  ? 'Daily Firestore Quota Reached'
                  : 'Database Synchronization Interrupted'}
              </h1>
              <p className="text-xs text-[var(--kq-text-secondary)] leading-relaxed">
                {this.state.isFreeReadQuota
                  ? 'Your Firebase Spark free-tier daily read allowance has been reached. Quota resets tomorrow, or you can upgrade in the Firebase Console.'
                  : this.state.isQuotaError
                    ? 'Firestore usage quota was exceeded for today. Quota resets the next day under the Spark plan Enterprise edition.'
                    : this.state.errorMessage}
              </p>
            </div>
          </div>

          {this.state.isFreeReadQuota && (
            <a
              href={upgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] text-xs font-semibold hover:bg-[var(--kq-accent-hover)] transition-colors"
            >
              Open Firebase Console Upgrade Dialog
            </a>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-xs font-semibold text-[var(--kq-text)] hover:border-[var(--kq-accent)] transition-colors inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload KoolerIQ
          </button>
        </div>
      </div>
    );
  }
}
