"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppChrome";
import { ProvenanceChip } from "@/components/ProvenanceChip";
import { approveExtraction, useExtractionSnapshot, writeExtraction } from "@/lib/client-store";
import type { ProductExtraction } from "@/lib/types";

export default function AnalysisPage() {
  const router = useRouter();
  const extraction = useExtractionSnapshot();
  const [loading, setLoading] = useState(false);

  async function regenerate() {
    if (!extraction) return;
    setLoading(true);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: extraction.url }),
      });
      const next = (await response.json()) as ProductExtraction;
      writeExtraction(next);
    } finally {
      setLoading(false);
    }
  }

  function continueToCanvas() {
    approveExtraction(extraction);
    router.push("/editor");
  }

  return (
    <AppShell>
      <section className="analysis-grid">
        <div className="panel liquid-glass">
          <div className="panel-inner">
            <p className="section-label">Parse preview</p>
            <h1 className="font-heading text-6xl leading-[.84] tracking-[-.055em]">
              Approve the source facts.
            </h1>
            <p className="mt-5 text-sm leading-6 text-white/62">
              AdFrame separates source facts from marketing language before generating the
              infographic, reducing hallucinated product claims.
            </p>

            <div className="mt-7 grid gap-3">
              {extraction.facts.map((fact) => (
                <article className="fact-row" key={fact.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <strong className="text-sm font-medium text-white">{fact.label}</strong>
                    <ProvenanceChip provenance={fact.provenance} />
                  </div>
                  <p className="text-lg text-white/85">{fact.value}</p>
                  {fact.source ? <p className="mt-2 text-xs text-white/42">{fact.source}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="panel liquid-glass">
            <div className="panel-inner">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-label">Suggested angle</p>
                  <h2 className="font-heading text-5xl leading-[.9] tracking-[-.05em]">
                    {extraction.headline}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                    {extraction.subtitle}
                  </p>
                </div>
                <span className="chip">{extraction.extractionMode}</span>
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-2">
                {extraction.features.map((feature) => (
                  <article className="feature-row" key={feature.id}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-heading text-3xl leading-none tracking-[-.035em]">
                        {feature.title}
                      </h3>
                      <ProvenanceChip provenance={feature.provenance} />
                    </div>
                    <p className="text-sm leading-6 text-white/62">{feature.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          {extraction.designSystem ? (
            <div className="panel liquid-glass">
              <div className="panel-inner">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="section-label">Design system extraction</p>
                    <h2 className="font-heading text-5xl leading-[.9] tracking-[-.05em]">
                      Source style locked.
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-white/62">
                      Saved to <code>{extraction.designSystem.designMdPath}</code> with token evidence at{" "}
                      <code>{extraction.designSystem.tokensSourcePath}</code>.
                    </p>
                  </div>
                  <span className="chip">{extraction.designSystem.confidence}</span>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="fact-row">
                    <strong className="block text-sm font-medium text-white">Typography</strong>
                    <p className="mt-2 text-xs leading-5 text-white/58">
                      Display: {extraction.designSystem.tokens.fontDisplay}
                      <br />
                      Body: {extraction.designSystem.tokens.fontBody}
                    </p>
                  </div>
                  <div className="fact-row">
                    <strong className="block text-sm font-medium text-white">Palette</strong>
                    <div className="mt-3 flex gap-2">
                      {[
                        ["paper", extraction.designSystem.tokens.paper],
                        ["ink", extraction.designSystem.tokens.ink],
                        ["accent", extraction.designSystem.tokens.accent],
                        ["rule", extraction.designSystem.tokens.rule],
                      ].map(([name, color]) => (
                        <span
                          className="h-8 w-8 rounded-full border border-white/20"
                          key={`${name}-${color}`}
                          style={{ background: color }}
                          title={`${name}: ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="fact-row">
                    <strong className="block text-sm font-medium text-white">Shape language</strong>
                    <p className="mt-2 text-xs leading-5 text-white/58">
                      Card: {extraction.designSystem.tokens.radiusCard}
                      <br />
                      Pill: {extraction.designSystem.tokens.radiusPill}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="panel liquid-glass">
            <div className="panel-inner">
              <p className="section-label">Source images ({extraction.assets.length})</p>
              <div className="grid gap-3 md:grid-cols-3">
                {extraction.assets.map((asset) => (
                  <article className="asset-card" key={asset.id}>
                    <div className="asset-thumb">
                      {asset.mediaType === "video" ? (
                        <video src={asset.src} muted playsInline controls preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.src} alt={asset.alt} />
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-sm text-white/75">{asset.name}</span>
                      <ProvenanceChip provenance={asset.provenance} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn ghost" disabled={loading} onClick={regenerate} type="button">
              <RefreshCw size={15} />
              {loading ? "Regenerating..." : "Regenerate summary"}
            </button>
            <button className="btn liquid-glass-strong" onClick={continueToCanvas} type="button">
              Approve facts and continue
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
