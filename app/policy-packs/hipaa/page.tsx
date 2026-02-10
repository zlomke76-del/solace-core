// app/policy-packs/hipaa/page.tsx
// ============================================================
// POLICY PACK — HIPAA
// Execution constraints for PHI / clinical contexts
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HIPAA Pack | Solace Core Policy Packs",
  description:
    "Declarative execution governance constraints for PHI and clinical workflows: authority gating, human oversight, and fail-closed behavior.",
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

export default function HipaaPackPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            HIPAA Pack
          </h1>
          <p className="mt-3 max-w-3xl text-neutral-700">
            The HIPAA Pack is a <span className="font-medium">declarative</span>{" "}
            governance constraint set designed to prevent ungoverned execution in
            PHI-bearing or clinically consequential contexts. It does not
            diagnose, recommend treatment, or validate medical correctness. It
            exists to ensure side effects remain authority-gated and auditable.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>PHI</Pill>
            <Pill>Clinical workflows</Pill>
            <Pill>Human oversight</Pill>
            <Pill>Fail-closed</Pill>
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
          <li>Healthcare automation where PHI may be present or affected</li>
          <li>Clinical decision support pipelines (execution-gated)</li>
          <li>EHR-touching workflows (reads/writes, messaging, scheduling)</li>
          <li>Patient communications with medical or PHI-bearing content</li>
        </ul>
      </Section>

      <Section title="Core constraints">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            No execution with PHI side effects without explicit authority
            (fail-closed).
          </li>
          <li>
            Human oversight required for clinically meaningful or irreversible
            actions.
          </li>
          <li>
            Strict separation of capability (models/tools) from authority
            (permits).
          </li>
          <li>
            Short time windows for sensitive permits; no implied carry-forward
            authority.
          </li>
        </ul>
      </Section>

      <Section title="Typical obligations (examples)">
        <p className="mb-3">
          Exact obligation names depend on your governance API, but the HIPAA
          pack typically drives:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium">HUMAN_APPROVAL</span> for EHR writes or
            clinically consequential actions
          </li>
          <li>
            <span className="font-medium">LOG_PERSISTENCE</span> with longer
            retention horizons
          </li>
          <li>
            <span className="font-medium">USER_CONSENT</span> where patient
            consent is required for specific disclosures
          </li>
          <li>
            <span className="font-medium">DATA_MINIMIZATION</span> to force
            redaction/parameter minimization in intents
          </li>
        </ul>
      </Section>

      <Section title="What this pack is not">
        <ul className="list-disc space-y-2 pl-5">
          <li>Not a medical device</li>
          <li>Not a diagnosis engine</li>
          <li>Not a content-safety filter</li>
          <li>Not a replacement for provider obligations or clinical review</li>
        </ul>
      </Section>

      <Section title="Integration note">
        <p>
          Packs influence governance outcomes; execution still requires runtime
          authorization enforcement. If a customer executor can act without
          permit, the system is not governed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/policy-packs/financial-controls"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            Financial Controls Pack →
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
