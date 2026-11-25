import React, { useState } from 'react';
import {
  Check,
  CreditCard,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
} from 'lucide-react';
import { BillingCycle, PlanTier, SubscriptionState } from '../types/kooleriq';
import { KoolerIQLogo } from './KoolerIQLogo';

interface PricingScreenProps {
  subscription: SubscriptionState;
  isAuthenticated: boolean;
  isSaving: boolean;
  onSelectPlan: (
    planTier: PlanTier,
    billingCycle: BillingCycle,
    doorQuota: number,
    storeCount: number
  ) => void;
  onSignInPrompt: () => void;
}

interface TierSpec {
  id: PlanTier;
  name: string;
  audience: string;
  monthlyUnitPrice: number;
  annualUnitPrice: number;
  unitLabel: string;
  defaultDoors: number;
  playChannel: string;
  summary: string;
  highlights: string[];
  featured?: boolean;
}

const TIERS: TierSpec[] = [
  {
    id: 'starter',
    name: 'Starter',
    audience: 'For single-door trials & independent operators',
    monthlyUnitPrice: 0,
    annualUnitPrice: 0,
    unitLabel: 'per store / mo',
    defaultDoors: 2,
    playChannel: 'Free on Google Play Store',
    summary: 'Core cooler planogram mapping and manual restock tracking on Android and web.',
    highlights: [
      'Up to 2 refrigerated cooler doors',
      '20 AI optical shelf audits per month',
      'Live temperature probe alerts (°F / °C)',
      'Walk-in backstock & CSV export',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Operator',
    audience: 'For high-volume c-stores & route merchandisers',
    monthlyUnitPrice: 49,
    annualUnitPrice: 39,
    unitLabel: 'per door / mo',
    defaultDoors: 4,
    playChannel: 'Google Play Billing or Direct Invoice',
    summary: 'Unlimited AI camera audits, revenue swap recommendations, and live market grounding.',
    highlights: [
      'Up to 25 cooler doors per store',
      'Unlimited AI optical shelf audits',
      'Gemini Search market trend grounding',
      'Offline Android walk-in vault sync',
    ],
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Fleet',
    audience: 'For multi-site chains & beverage distributors',
    monthlyUnitPrice: 119,
    annualUnitPrice: 95,
    unitLabel: 'per store / mo',
    defaultDoors: 20,
    playChannel: 'Managed Google Play Enterprise APK',
    summary: 'Fleet-wide planogram governance, POS velocity sync, and private Android deployment.',
    highlights: [
      'Unlimited stores & cooler doors',
      'Managed Google Play private distribution',
      'POS & route ERP velocity integration',
      'Custom compliance SLAs & role access',
    ],
  },
];

const COMPARISON_MATRIX: Array<{
  capability: string;
  starter: string;
  pro: string;
  enterprise: string;
}> = [
  {
    capability: 'Cooler Doors Included',
    starter: '2 doors max',
    pro: 'Up to 25 doors / store',
    enterprise: 'Unlimited doors',
  },
  {
    capability: 'AI Optical Shelf Audits',
    starter: '20 scans / month',
    pro: 'Unlimited scans',
    enterprise: 'Unlimited + batch fleet',
  },
  {
    capability: 'Gemini Search Grounding',
    starter: '5 queries / day',
    pro: 'Unlimited web grounding',
    enterprise: 'Unlimited + custom feeds',
  },
  {
    capability: 'Google Play Distribution',
    starter: 'Public Play Store app',
    pro: 'Play Store + Play Billing',
    enterprise: 'Managed Google Play MDM',
  },
  {
    capability: 'Offline Cooler Vault Mode',
    starter: 'Online only',
    pro: '48-hour offline queue',
    enterprise: '7-day multi-route cache',
  },
  {
    capability: 'Database & Telemetry Retention',
    starter: '14-day audit history',
    pro: '12-month Cloud SQL log',
    enterprise: '36-month fleet archive',
  },
];

export const PricingScreen: React.FC<PricingScreenProps> = ({
  subscription,
  isAuthenticated,
  isSaving,
  onSelectPlan,
  onSignInPrompt,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription.billingCycle);
  const [doorCount, setDoorCount] = useState<number>(Math.max(4, subscription.doorQuota || 4));
  const [storeCount, setStoreCount] = useState<number>(Math.max(1, subscription.storeCount || 1));
  const [logoImgFailed, setLogoImgFailed] = useState(false);

  const getCalculatedPrice = (tier: TierSpec): number => {
    const unit =
      billingCycle === 'annual' ? tier.annualUnitPrice : tier.monthlyUnitPrice;
    if (tier.id === 'starter') return 0;
    if (tier.id === 'pro') return unit * doorCount * storeCount;
    return unit * storeCount;
  };

  return (
    <div className="space-y-6">
      {/* Google Play Availability & Distribution Banner */}
      <div className="glacier-glass rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--kq-emerald)] font-semibold">
            <Smartphone className="w-4 h-4" />
            <span>GOOGLE PLAY RELEASE · ANDROID 10+ &amp; RETAIL HANDHELDS</span>
          </div>
          <h2 className="text-xl font-display font-bold text-[var(--kq-text)]">
            Available on Google Play &amp; Web Telemetry Console
          </h2>
          <p className="text-sm text-[var(--kq-text-secondary)] leading-relaxed">
            Deploy KoolerIQ directly to store managers and route merchandisers through the{' '}
            <span className="text-[var(--kq-text)] font-medium">Google Play Store</span> or{' '}
            <span className="text-[var(--kq-text)] font-medium">Managed Google Play</span> for Zebra
            and rugged Android scanners. Subscriptions sync seamlessly between Android Play
            Billing and{' '}
            <span className="font-mono-tabular text-[var(--kq-accent)] font-medium">
              www.kooleriq.com
            </span>
            .
          </p>
        </div>

        {/* Google Play Store Badge Card with KoolerIQ Logo Icon */}
        <div className="rounded-xl bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] p-4 flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--kq-surface)] border border-[var(--kq-accent-border)] flex items-center justify-center shrink-0">
            {!logoImgFailed ? (
              <img
                src="/src/assets/images/kooleriq_brand_logo_1795456908836.jpg"
                alt="KoolerIQ Android Google Play app icon"
                referrerPolicy="no-referrer"
                onError={() => setLogoImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <KoolerIQLogo size={42} showWordmark={false} />
            )}
          </div>
          <div>
            <div className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)]">GET IT ON</div>
            <div className="text-base font-display font-bold text-[var(--kq-text)]">Google Play</div>
            <div className="text-[11px] font-mono-tabular text-[var(--kq-accent)] font-medium mt-0.5">
              com.kooleriq.telemetry · v2.4 Android
            </div>
          </div>
        </div>
      </div>

      {/* Billing Cadence & Fleet Estimator Controls */}
      <div className="glacier-card rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-[var(--kq-text-secondary)]">Billing Cadence</span>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border)]">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                billingCycle === 'monthly'
                  ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                  : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                billingCycle === 'annual'
                  ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                  : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
              }`}
            >
              Annual · Save 20%
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          {/* Cooler Doors Stepper */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-[var(--kq-text-secondary)]">Doors / Store</span>
            <button
              type="button"
              onClick={() => setDoorCount((d) => Math.max(1, d - 1))}
              className="min-h-[40px] min-w-[40px] rounded bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
              aria-label="Decrease doors per store"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono-tabular text-sm font-bold text-[var(--kq-text)] w-8 text-center">
              {doorCount}
            </span>
            <button
              type="button"
              onClick={() => setDoorCount((d) => Math.min(25, d + 1))}
              className="min-h-[40px] min-w-[40px] rounded bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
              aria-label="Increase doors per store"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Store Count Stepper */}
          <div className="flex items-center gap-2.5">
            <Store className="w-4 h-4 text-[var(--kq-accent)]" />
            <span className="text-xs text-[var(--kq-text-secondary)]">Stores</span>
            <button
              type="button"
              onClick={() => setStoreCount((s) => Math.max(1, s - 1))}
              className="min-h-[40px] min-w-[40px] rounded bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
              aria-label="Decrease store count"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono-tabular text-sm font-bold text-[var(--kq-text)] w-8 text-center">
              {storeCount}
            </span>
            <button
              type="button"
              onClick={() => setStoreCount((s) => Math.min(100, s + 1))}
              className="min-h-[40px] min-w-[40px] rounded bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] flex items-center justify-center text-[var(--kq-text)] hover:border-[var(--kq-accent)]"
              aria-label="Increase store count"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Pricing Tier Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {TIERS.map((tier) => {
          const unitPrice =
            billingCycle === 'annual' ? tier.annualUnitPrice : tier.monthlyUnitPrice;
          const totalMonthly = getCalculatedPrice(tier);
          const isCurrentPlan = subscription.planTier === tier.id;

          return (
            <div
              key={tier.id}
              className={`rounded-xl p-5 flex flex-col justify-between transition-colors ${
                tier.featured
                  ? 'glacier-glass ring-1 ring-[var(--kq-accent-border)]'
                  : 'glacier-card'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-display font-bold text-[var(--kq-text)]">{tier.name}</h3>
                  {tier.featured ? (
                    <span className="text-[11px] font-mono-tabular font-semibold text-[var(--kq-accent)]">
                      RECOMMENDED
                    </span>
                  ) : isCurrentPlan ? (
                    <span className="text-[11px] font-mono-tabular font-semibold text-[var(--kq-emerald)]">
                      ACTIVE PLAN
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--kq-text-secondary)] mt-1">{tier.audience}</p>

                <div className="mt-5 pb-4 border-b border-[var(--kq-border)]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono-tabular font-bold text-[var(--kq-text)]">
                      ${unitPrice}
                    </span>
                    <span className="text-xs text-[var(--kq-text-muted)]">{tier.unitLabel}</span>
                  </div>
                  <div className="text-xs font-mono-tabular text-[var(--kq-accent)] font-medium mt-1.5">
                    {tier.id === 'starter'
                      ? 'Free forever on Google Play'
                      : `Estimated total: $${totalMonthly.toLocaleString()}/mo (${storeCount} ${
                          storeCount === 1 ? 'store' : 'stores'
                        })`}
                  </div>
                  <div className="text-[11px] text-[var(--kq-text-muted)] mt-1">{tier.playChannel}</div>
                </div>

                <p className="text-xs text-[var(--kq-text-secondary)] mt-4 leading-relaxed">
                  {tier.summary}
                </p>

                <ul className="mt-4 space-y-2.5">
                  {tier.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs text-[var(--kq-text)]">
                      <Check className="w-4 h-4 text-[var(--kq-emerald)] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--kq-border)] space-y-2">
                {isAuthenticated ? (
                  <button
                    type="button"
                    disabled={isSaving || (isCurrentPlan && subscription.billingCycle === billingCycle)}
                    onClick={() =>
                      onSelectPlan(
                        tier.id,
                        billingCycle,
                        tier.id === 'starter' ? 2 : doorCount,
                        storeCount
                      )
                    }
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                      isCurrentPlan && subscription.billingCycle === billingCycle
                        ? 'bg-[var(--kq-emerald-soft)] border border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                        : tier.featured
                          ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] hover:bg-[var(--kq-accent-hover)]'
                          : 'bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] hover:opacity-90'
                    }`}
                  >
                    {isCurrentPlan && subscription.billingCycle === billingCycle ? (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Active ({billingCycle})
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Activate {tier.name} via Google Play
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignInPrompt}
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                      tier.featured
                        ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] hover:bg-[var(--kq-accent-hover)]'
                        : 'bg-[var(--kq-accent-soft)] border border-[var(--kq-accent-border)] text-[var(--kq-accent)] hover:opacity-90'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Sign in with Google to Activate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Concrete Capability & Limit Comparison Matrix */}
      <div className="glacier-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--kq-border)]">
          <h3 className="text-base font-semibold text-[var(--kq-text)]">
            Plan Limits &amp; Google Play Capability Matrix
          </h3>
          <p className="text-xs text-[var(--kq-text-muted)] mt-0.5">
            Exact operational quotas across web telemetry and Google Play Android handhelds
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--kq-surface-muted)] text-[11px] font-semibold text-[var(--kq-text-muted)] border-b border-[var(--kq-border)]">
                <th className="py-3 px-5">Capability</th>
                <th className="py-3 px-5">Starter ($0)</th>
                <th className="py-3 px-5 text-[var(--kq-accent)]">Pro Operator</th>
                <th className="py-3 px-5">Enterprise Fleet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--kq-border)] text-xs">
              {COMPARISON_MATRIX.map((row) => (
                <tr key={row.capability} className="hover:bg-[var(--kq-surface-muted)]/60">
                  <td className="py-3.5 px-5 font-medium text-[var(--kq-text)]">{row.capability}</td>
                  <td className="py-3.5 px-5 font-mono-tabular text-[var(--kq-text-secondary)]">
                    {row.starter}
                  </td>
                  <td className="py-3.5 px-5 font-mono-tabular text-[var(--kq-accent)] font-semibold">
                    {row.pro}
                  </td>
                  <td className="py-3.5 px-5 font-mono-tabular text-[var(--kq-text-secondary)]">
                    {row.enterprise}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
