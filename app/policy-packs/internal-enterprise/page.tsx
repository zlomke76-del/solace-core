// app/policy-packs/internal-enterprise/page.tsx
// ============================================================
// POLICY PACK — INTERNAL ENTERPRISE
// Execution constraints for internal automation (IT/HR/admin)
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Internal Enterprise Pack | Solace Core Policy Packs",
  description:
    "Declarative execution governance constraints for enterprise automation: least privilege, separation of duties, admin gating, and prevention of silent authority creep.",
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

export default function InternalEnterprisePackPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Internal Enterprise Pack
          </h1>
          <p className="mt-3 max-w-3xl text-neutral-700">
            The Internal Enterprise Pack is a{" "}
            <span className="font-medium">declarative</span> constraint set for
            internal automation and copilots operating across IT, HR, and admin
            workflows. It exists to prevent silent authority creep, enforce
            least privilege, and keep high-impact internal side effects under
            explicit control.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>Least privilege</Pill>
            <Pill>Separation of duties</Pill>
            <Pill>Admin gating</Pill>
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
          <li>Internal copilots and workflow automation</li>
          <li>IT operations (tickets, deploy triggers, config changes)</li>
          <li>Admin actions (permissions, roles, entitlements)</li>
          <li>HR-related workflows (access, onboarding/offboarding triggers)</li>
        </ul>
      </Section>

      <Section title="Core constraints">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Admin or privilege-changing actions require explicit authorization
            (often dual control).
          </li>
          <li>
            Cross-system writes are gated to prevent silent automation expansion.
          </li>
          <li>
            Least privilege: only the minimum execution capability is permitted
            for the declared intent.
          </li>
          <li>
            Separation of duties: proposal and approval roles must remain
            distinct where required.
          </li>
        </ul>
      </Section>

      <Section title="Typical obligations (examples)">
        <p className="mb-3">
          This pack commonly drives obligations such as:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium">HUMAN_APPROVAL</span> for admin actions
            and policy-controlled side effects
          </li>
          <li>
            <span className="font-medium">DUAL_CONTROL</span> for permission or
            entitlement changes
          </li>
          <li>
            <span className="font-medium">USER_NOTIFICATION</span> for actions
            affecting users/employees where appropriate
          </li>
          <li>
            <span className="font-medium">LOG_PERSISTENCE</span> for internal
            audit and incident response
          </li>
        </ul>
      </Section>

      <Section title="What this pack is not">
        <ul className="list-disc space-y-2 pl-5">
          <li>Not an IAM system</li>
          <li>Not an HR policy interpreter</li>
          <li>Not an IT orchestration engine</li>
          <li>Not a replacement for internal governance or security teams</li>
        </ul>
      </Section>

      <Section title="Integration note">
        <p>
          This pack constrains governance outcomes; runtime execution still
          requires explicit authorization enforcement. If an internal tool can
          change permissions without permit, the system is not governed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/policy-packs/hipaa"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            HIPAA Pack →
          </Link>
          <Link
            href="/policy-packs/financial-controls"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            Financial Controls Pack →
          </Link>
        </div>
      </Section>
    </main>
  );
}
