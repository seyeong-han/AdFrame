import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

const RequestSchema = z.object({
  prompt: z.string().min(3).default("Premium OLED television floating in a dark liquid glass studio"),
});

export async function POST(request: Request) {
  const body = RequestSchema.safeParse(await request.json().catch(() => ({})));
  const prompt = body.success ? body.data.prompt : RequestSchema.parse({}).prompt;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      id: `generated-placeholder-${Date.now()}`,
      name: "Generated visual placeholder",
      src: placeholderSvg(prompt),
      alt: prompt,
      provenance: "generated",
      kind: "generated",
      bgRemoved: true,
      caption: prompt,
      semanticGroup: semanticGroupFromPrompt(prompt),
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const image = await client.images.generate({
      model: "gpt-image-1",
      prompt: `${prompt}. Dark Apple-style studio lighting, transparent-friendly product asset, no text.`,
      size: "1024x1024",
    });
    const b64 = image.data?.[0]?.b64_json;

    return NextResponse.json({
      id: `generated-${Date.now()}`,
      name: "AI generated visual",
      src: b64 ? `data:image/png;base64,${b64}` : placeholderSvg(prompt),
      alt: prompt,
      provenance: "generated",
      kind: "generated",
      bgRemoved: true,
      caption: prompt,
      semanticGroup: semanticGroupFromPrompt(prompt),
    });
  } catch {
    return NextResponse.json({
      id: `generated-placeholder-${Date.now()}`,
      name: "Generated visual placeholder",
      src: placeholderSvg(prompt),
      alt: prompt,
      provenance: "generated",
      kind: "generated",
      bgRemoved: true,
      caption: prompt,
      semanticGroup: semanticGroupFromPrompt(prompt),
    });
  }
}

function semanticGroupFromPrompt(prompt: string) {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function placeholderSvg(prompt: string) {
  const safePrompt = prompt.slice(0, 90).replace(/[<&>]/g, "");

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 520">
      <defs>
        <radialGradient id="g" cx="50%" cy="42%" r="55%">
          <stop stop-color="#fff" stop-opacity=".34"/>
          <stop offset=".55" stop-color="#91acca" stop-opacity=".16"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="260" cy="250" r="210" fill="url(#g)"/>
      <rect x="118" y="134" width="284" height="184" rx="32" fill="rgba(255,255,255,.11)" stroke="rgba(255,255,255,.46)" stroke-width="4"/>
      <path d="M178 376h164M260 320v56" stroke="rgba(255,255,255,.7)" stroke-width="18" stroke-linecap="round"/>
      <text x="260" y="444" fill="rgba(255,255,255,.72)" font-family="Barlow, sans-serif" font-size="22" text-anchor="middle">${safePrompt}</text>
    </svg>
  `)}`;
}
