import type { Provenance } from "@/lib/types";

const labels: Record<Provenance, string> = {
  verified: "Verified",
  inferred: "Inferred",
  generated: "Generated",
};

const descriptions: Record<Provenance, string> = {
  verified: "Directly sourced from the product page or user-provided asset.",
  inferred: "Derived from verified source facts.",
  generated: "Created by AdFrame or an AI generation step.",
};

export function ProvenanceChip({ provenance }: { provenance: Provenance }) {
  return (
    <span className={`chip ${provenance}`} title={descriptions[provenance]}>
      {labels[provenance]}
    </span>
  );
}
