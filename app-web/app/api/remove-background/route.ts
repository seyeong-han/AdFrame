import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRemoveBgApiKey } from "@/lib/server-env";

export const runtime = "nodejs";

const RequestSchema = z.object({
  src: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing image src." }, { status: 400 });
  }

  const apiKey = await getRemoveBgApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing REMOVE_BG_API_KEY, REMOVEBG_API_KEY, or REMOVE_BG_KEY." },
      { status: 500 },
    );
  }

  const form = new FormData();
  form.set("size", "auto");

  let image: Awaited<ReturnType<typeof buildRemoveBgImageInput>>;
  try {
    image = await buildRemoveBgImageInput(parsed.data.src);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unsupported image source." },
      { status: 415 },
    );
  }
  if (image.kind === "url") {
    form.set("image_url", image.value);
  } else {
    form.set("image_file", image.value, image.filename);
  }

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      { error: "remove.bg failed to process the image.", detail: detail.slice(0, 500) },
      { status: response.status },
    );
  }

  const blob = await response.blob();
  const dataUrl = `data:${blob.type || "image/png"};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
  return NextResponse.json({ src: dataUrl, changed: true });
}

async function buildRemoveBgImageInput(src: string): Promise<
  | { kind: "url"; value: string }
  | { kind: "file"; value: Blob; filename: string }
> {
  if (/^https?:\/\//.test(src)) return { kind: "url", value: src };

  if (src.startsWith("data:")) {
    const match = src.match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!match) throw new Error("Unsupported data URL.");
    const mime = match[1] || "image/png";
    const body = match[2] ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]));
    return {
      kind: "file",
      value: new Blob([body], { type: mime }),
      filename: `upload.${mimeToExtension(mime)}`,
    };
  }

  if (src.startsWith("/")) {
    if (src.endsWith(".svg")) {
      throw new Error("remove.bg does not support SVG sources; use a raster image.");
    }
    const publicPath = path.join(process.cwd(), "public", src);
    const body = await readFile(publicPath);
    const mime = src.endsWith(".jpg") || src.endsWith(".jpeg") ? "image/jpeg" : src.endsWith(".webp") ? "image/webp" : "image/png";
    return {
      kind: "file",
      value: new Blob([body], { type: mime }),
      filename: path.basename(src),
    };
  }

  throw new Error("Unsupported image source.");
}

function mimeToExtension(mime: string) {
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}
