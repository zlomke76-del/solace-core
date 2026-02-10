// app/policy-packs/financial-controls/page.tsx
// ============================================================
// POLICY PACK — FINANCIAL CONTROLS
// Execution constraints for money-moving / legally consequential actions
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Financial Controls Pack | Solace Core Policy Packs",
  description:
    "Declarative execution governance constraints for financial side effects: dual control, authority binding, replay resistance, and fail-closed behavior.",
  robots: { index: true, follow: true },
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700">
      {children}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 text-neutral-700">{children}</div>
    </section>
  );
}

export default function FinancialControlsPackPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Financial Controls Pack
          </h1>
          <p className="mt-3 max-w-3xl text-neutral-700">
            The Financial Controls Pack is a{" "}
            <span className="font-medium">declarative</span> constraint set for
            financially consequential execution paths. It does not price assets,
            assess credit, or predict risk. It exists to ensure that
            irreversible or legally meaningful side effects cannot occur without
            explicit, auditable authority.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>Dual control</Pill>
            <Pill>Irreversible actions</Pill>
            <Pill>Replay resistance</Pill>
            <Pill>Auditability</Pill>
          </div>
        </div>

        <Link
          href="/policy-packs"
          className="mt-1 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          ← All packs
        </Link>
      </div>

      <Section title="Applies to">
        <ul className="list-disc space-y-2 pl-5">
          <li>Payments and transfers</li>
          <li>Account changes and entitlements</li>
          <li>Trading-like execution and order placement</li>
          <li>Financial notifications with legal or contractual effect</li>
        </ul>
      </Section>

      <Section title="Core constraints">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            No autonomous money-moving execution without explicit authority.
          </li>
          <li>
            Dual control required for irreversible or high-impact actions.
          </li>
          <li>
            Strong idempotency expectations: downstream execution must prevent
            double effects.
          </li>
          <li>
            Permit scope is exact: material parameter changes require new
            authorization.
          </li>
        </ul>
      </Section>

      <Section title="Typical obligations (examples)">
        <p className="mb-3">
          This pack commonly drives obligations such as:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium">DUAL_CONTROL</span> for transfers,
            writes, or irreversible commits
          </li>
          <li>
            <span className="font-medium">SECONDARY_APPROVAL</span> for threshold
            amounts or abnormal patterns
          </li>
          <li>
            <span className="font-medium">RATE_LIMIT_BACKOFF</span> on risk quota
            exceedance or anomaly conditions
          </li>
          <li>
            <span className="font-medium">LOG_PERSISTENCE</span> for audit-grade
            reconstruction
          </li>
        </ul>
      </Section>

      <Section title="What this pack is not">
        <ul className="list-disc space-y-2 pl-5">
          <li>Not a fraud model</li>
          <li>Not a credit or underwriting system</li>
          <li>Not a trading strategy engine</li>
          <li>Not a replacement for financial regulatory obligations</li>
        </ul>
      </Section>

      <Section title="Integration note">
        <p>
          This pack constrains governance outcomes; runtime execution still
          requires explicit authorization enforcement. If an executor can
          transfer value without permit, the system is not governed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/policy-packs/hipaa"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            HIPAA Pack →
          </Link>
          <Link
            href="/policy-packs/internal-enterprise"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            Internal Enterprise Pack →
          </Link>
        </div>
      </Section>
    </main>
  );
}
