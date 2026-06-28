import type { Provenance } from "@/lib/types";

const labels: Record<Provenance, string> = {
  verified: "Verified",
  inferred: "Inferred",
  generated: "Generated",
};

export function ProvenanceChip({ provenance }: { provenance: Provenance }) {
  return <span className={`chip ${provenance}`}>{labels[provenance]}</span>;
}
