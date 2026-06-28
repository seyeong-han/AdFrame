"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ImagePlus, Link as LinkIcon, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppChrome";
import { SAMSUNG_DEMO_URL, type ProductAsset, type ProductExtraction } from "@/lib/types";
import { appendUploadedAssets, writeExtraction } from "@/lib/client-store";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState(SAMSUNG_DEMO_URL);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState(
    "Ready to parse the Samsung product page, collect image candidates, and prepare cutouts.",
  );

  async function generate() {
    setStatus("loading");
    setMessage("Reading product modules, gallery images, alt text, and feature claims...");

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const extraction = (await response.json()) as ProductExtraction;
      writeExtraction(extraction);
      setMessage(
        extraction.extractionMode === "fixture"
          ? "Loaded the cached Samsung fixture. The demo is ready even if live scraping is blocked."
          : "Live product extraction complete. Review the facts before generating the canvas.",
      );
      router.push("/analysis");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Extraction failed.");
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    const assets = await Promise.all(
      Array.from(files).map(async (file, index): Promise<ProductAsset> => ({
        id: `landing-upload-${Date.now()}-${index}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        src: await fileToDataUrl(file),
        alt: file.name,
        provenance: "verified",
        kind: "upload",
        bgRemoved: false,
        caption: file.name.replace(/\.[^.]+$/, ""),
        semanticGroup: `upload-${file.name.replace(/\.[^.]+$/, "").toLowerCase()}`,
      })),
    );
    appendUploadedAssets(assets);
    setMessage(`${assets.length} uploaded image${assets.length > 1 ? "s" : ""} staged for the editor.`);
  }

  return (
    <AppShell>
      <section className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div className="panel liquid-glass p-8 md:p-12">
          <div className="relative z-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full p-1 liquid-glass">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                New
              </span>
              <span className="pr-3 text-sm text-white/75">
                Product-link infographics with editable glass tiles.
              </span>
            </div>
            <h1 className="display-title">Extract. Cut out. Compose.</h1>
            <p className="lead mt-8">
              Paste a premium product page, verify the facts, remove product backgrounds locally,
              and compose an Apple-style social infographic on a Figma-like tldraw canvas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="btn liquid-glass-strong"
                disabled={status === "loading"}
                onClick={generate}
                type="button"
              >
                {status === "loading" ? "Extracting..." : "Generate infographic"}
                <ArrowUpRight size={15} />
              </button>
              <button
                className="btn ghost"
                onClick={() => setUrl(SAMSUNG_DEMO_URL)}
                type="button"
              >
                <Sparkles size={15} />
                Try Samsung demo
              </button>
            </div>
          </div>
        </div>

        <aside className="panel liquid-glass">
          <div className="panel-inner">
            <p className="section-label">Product source</p>
            <h2 className="font-heading text-5xl leading-[.9] tracking-[-.045em]">
              Start from a URL.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/60">
              The Samsung S90F page is prepared with live Playwright extraction and a cached
              fixture fallback so the demo stays reliable.
            </p>

            <div className="field mt-8">
              <label htmlFor="productUrl">Product URL</label>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" size={16} />
                  <input
                    id="productUrl"
                    className="pl-11"
                    onChange={(event) => setUrl(event.target.value)}
                    type="url"
                    value={url}
                  />
                </div>
                <button
                  className="btn white"
                  disabled={status === "loading"}
                  onClick={generate}
                  type="button"
                >
                  Extract
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[.045] p-4 text-sm leading-6 text-white/62">
              <span
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                  status === "error" ? "bg-red-300" : status === "loading" ? "bg-white" : "bg-white/55"
                }`}
              />
              <span>{message}</span>
            </div>

            <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-dashed border-white/18 bg-white/[.035] p-5 text-sm text-white/70">
              <span className="flex items-center gap-3">
                <ImagePlus size={18} />
                Upload images as a fallback
              </span>
              <input
                className="hidden"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleUpload(event.target.files)}
              />
            </label>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
