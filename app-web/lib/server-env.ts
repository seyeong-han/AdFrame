import { readFile } from "node:fs/promises";
import path from "node:path";

const REMOVE_BG_KEYS = ["REMOVE_BG_API_KEY", "REMOVEBG_API_KEY", "REMOVEBG_KEY", "REMOVE_BG_KEY"];

export async function getRemoveBgApiKey() {
  for (const key of REMOVE_BG_KEYS) {
    if (process.env[key]) return process.env[key];
  }

  const envFiles = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), ".env.local"),
    path.join(/*turbopackIgnore: true*/ process.cwd(), ".env"),
    path.join(/*turbopackIgnore: true*/ process.cwd(), "..", ".env"),
  ];

  for (const filePath of envFiles) {
    const parsed = parseEnv(await readFile(filePath, "utf8").catch(() => ""));
    for (const key of REMOVE_BG_KEYS) {
      if (parsed[key]) return parsed[key];
    }
  }

  return null;
}

function parseEnv(raw: string) {
  const values: Record<string, string> = {};

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const index = trimmed.indexOf("=");
    if (index === -1) return;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    values[key] = value;
  });

  return values;
}
