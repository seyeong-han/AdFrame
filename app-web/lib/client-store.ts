"use client";

import { useSyncExternalStore } from "react";
import fixture from "@/fixtures/samsung-s90f.json";
import type { ProductExtraction } from "@/lib/types";

const KEY = "adframe:last-extraction";
const APPROVED_KEY = "adframe:facts-approved";
const APPROVED_EXTRACTION_KEY = "adframe:approved-extraction";
const EXTRACTION_CHANGED_EVENT = "adframe:extraction-changed";
const FIXTURE_EXTRACTION = fixture as ProductExtraction;
let cachedRaw: string | null = null;
let cachedExtraction = FIXTURE_EXTRACTION;
let cachedApprovedRaw: string | null = null;
let cachedApprovedExtraction = FIXTURE_EXTRACTION;

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
  window.localStorage.removeItem(APPROVED_EXTRACTION_KEY);
  notifyExtractionChanged();
}

export function approveExtraction(extraction = readExtraction()) {
  const serialized = JSON.stringify(extraction);
  window.localStorage.setItem(KEY, serialized);
  window.localStorage.setItem(APPROVED_EXTRACTION_KEY, serialized);
  window.localStorage.setItem(APPROVED_KEY, "true");
  cachedRaw = serialized;
  cachedExtraction = extraction;
  cachedApprovedRaw = serialized;
  cachedApprovedExtraction = extraction;
  notifyExtractionChanged();
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

export function readApprovedExtraction(): ProductExtraction {
  if (typeof window === "undefined") return FIXTURE_EXTRACTION;

  const raw = window.localStorage.getItem(APPROVED_EXTRACTION_KEY);
  if (!raw) return readExtraction();
  if (raw === cachedApprovedRaw) return cachedApprovedExtraction;

  try {
    cachedApprovedRaw = raw;
    cachedApprovedExtraction = JSON.parse(raw) as ProductExtraction;
    return cachedApprovedExtraction;
  } catch {
    cachedApprovedRaw = raw;
    cachedApprovedExtraction = readExtraction();
    return cachedApprovedExtraction;
  }
}

export function useApprovedExtractionSnapshot(): ProductExtraction {
  return useSyncExternalStore(subscribeToExtraction, readApprovedExtraction, () => FIXTURE_EXTRACTION);
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
