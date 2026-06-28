"use client";

import { useSyncExternalStore } from "react";
import fixture from "@/fixtures/samsung-s90f.json";
import type { ProductExtraction } from "@/lib/types";

const KEY = "adframe:last-extraction";
const APPROVED_KEY = "adframe:facts-approved";
const EXTRACTION_CHANGED_EVENT = "adframe:extraction-changed";
const FIXTURE_EXTRACTION = fixture as ProductExtraction;
let cachedRaw: string | null = null;
let cachedExtraction = FIXTURE_EXTRACTION;

export function readExtraction(): ProductExtraction {
  if (typeof window === "undefined") return FIXTURE_EXTRACTION;

  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    cachedRaw = null;
    cachedExtraction = FIXTURE_EXTRACTION;
    return cachedExtraction;
  }
  if (raw === cachedRaw) return cachedExtraction;

  try {
    cachedRaw = raw;
    cachedExtraction = JSON.parse(raw) as ProductExtraction;
    return cachedExtraction;
  } catch {
    cachedRaw = raw;
    cachedExtraction = FIXTURE_EXTRACTION;
    return FIXTURE_EXTRACTION;
  }
}

export function writeExtraction(extraction: ProductExtraction) {
  window.localStorage.setItem(KEY, JSON.stringify(extraction));
  window.localStorage.removeItem(APPROVED_KEY);
  notifyExtractionChanged();
}

export function approveExtraction() {
  window.localStorage.setItem(APPROVED_KEY, "true");
}

export function isExtractionApproved() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(APPROVED_KEY) === "true";
}

export function appendUploadedAssets(assets: ProductExtraction["assets"]) {
  const extraction = readExtraction();
  const next = {
    ...extraction,
    assets: [...assets, ...extraction.assets],
  };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notifyExtractionChanged();
  return next;
}

export function useExtractionSnapshot(): ProductExtraction {
  return useSyncExternalStore(subscribeToExtraction, readExtraction, () => FIXTURE_EXTRACTION);
}

function subscribeToExtraction(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(EXTRACTION_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EXTRACTION_CHANGED_EVENT, callback);
  };
}

function notifyExtractionChanged() {
  window.dispatchEvent(new Event(EXTRACTION_CHANGED_EVENT));
}
