// app/policy-packs/page.tsx
// ============================================================
// POLICY PACKS — INDEX
// Solace Core policy packs (declarative governance constraints)
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Policy Packs | Solace Core",
  description:
    "Declarative governance packs for Solace Core: HIPAA, Financial Controls, and Internal Enterprise constraints.",
  robots: { index: true, follow: true },
};

type PackCard = {
  title: string;
  slug: string;
  summary: string;
  bullets: string[];
  tags: string[];
};

const PACKS: PackCard[] = [
  {
    title: "HIPAA Pack",
    slug: "/policy-packs/hipaa",
    summary:
      "Execution constraints for PHI/clinical contexts: prevent ungoverned side effects, require explicit authority, and enforce conservative defaults under uncertainty.",
    bullets: [
      "Scope: PHI handling, clinical workflows, EHR-touching actions",
      "Primary stance: fail-closed on PHI-impacting execution",
      "Oversight: human approval for sensitive/irreversible operations",
      "Audit posture: strict evidence + time-bounded permits",
    ],
    tags: ["healthcare", "PHI", "human oversight", "fail-closed"],
  },
  {
    title: "Financial Controls Pack",
    slug: "/policy-packs/financial-controls",
    summary:
      "Execution constraints for money-moving or legally consequential actions: dual-control, strong idempotency discipline, and explicit authority binding for irreversible effects.",
    bullets: [
      "Scope: payments, entitlements, account changes, trading-like effects",
      "Primary stance: no autonomous transfer/commit without authority",
      "Oversight: dual-control for irreversible and high-impact actions",
      "Resilience: replay protection + downstream idempotency requirements",
    ],
    tags: ["finance", "dual-control", "audit", "replay protection"],
  },
  {
    title: "Internal Enterprise Pack",
    slug: "/policy-packs/internal-enterprise",
    summary:
      "Execution constraints for internal automation: least privilege, separation of duties, and explicit control of admin/HR/IT side effects to prevent authority creep.",
    bullets: [
      "Scope: internal tools, IT automation, HR workflows, permissions",
      "Primary stance: prevent silent escalation and privilege creep",
      "Oversight: approvals for admin actions and cross-system writes",
      "Controls: least privilege + separation of duties enforcement",
    ],
    tags: ["enterprise", "least privilege", "SoD", "admin controls"],
  },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700">
      {children}
    </span>
  );
}

function Card({
  title,
  slug,
  summary,
  bullets,
  tags,
}: PackCard): React.ReactElement {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
          <p className="mt-2 text-neutral-700">{summary}</p>
        </div>
        <Link
          href={slug}
          className="shrink-0 rounded-xl border border-neutral-200 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          View
        </Link>
      </div>

      <ul className="mt-4 list-disc space-y-2 pl-5 text-neutral-700">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((t) => (
          <Pill key={t}>{t}</Pill>
        ))}
      </div>
    </div>
  );
}

export default function PolicyPacksIndexPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Policy Packs
        </h1>
        <p className="max-w-3xl text-neutral-700">
          Policy packs are <span className="font-medium">declarative</span>{" "}
          governance constraints applied during intent evaluation. They do not
          execute tools, and they do not perform inference. They exist to make
          side effects auditable, bounded, and authority-gated.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill>Declarative constraints</Pill>
          <Pill>Versioned</Pill>
          <Pill>Auditable</Pill>
          <Pill>Fail-closed integration</Pill>
        </div>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {PACKS.map((p) => (
          <Card key={p.slug} {...p} />
        ))}
      </section>

      <section className="mt-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-neutral-900">
          Mechanical contract
        </h3>
        <p className="mt-2 text-neutral-700">
          Packs inform <span className="font-medium">governance outcomes</span>{" "}
          (e.g., PERMIT/DENY/ESCALATE + obligations). Execution still requires
          runtime authority enforcement. Integrations must treat any failure as
          DENY (fail-closed) and must not execute side effects without explicit
          permit.
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
          <Link
            href="/policy-packs/internal-enterprise"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            Internal Enterprise Pack →
          </Link>
        </div>
      </section>
    </main>
  );
}
