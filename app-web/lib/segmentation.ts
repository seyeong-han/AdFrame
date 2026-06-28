"use client";

export async function removeBackgroundLocally(src: string): Promise<{ src: string; changed: boolean }> {
  try {
    const { removeBackground } = await import("@imgly/background-removal");
    const blob = await removeBackground(src, {
      publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
    });

    return { src: await blobToDataUrl(blob), changed: true };
  } catch {
    return { src, changed: false };
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}
