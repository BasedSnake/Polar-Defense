// Shared vessel thumbnail selection logic
// Keeps deterministic mapping from MMSI + dark flag to one of a finite image set.

export const vesselThumbnails: string[] = [
  "/image.png.webp",
  "/image-1.png.webp",
  "/image-2.png.webp",
  "/image-3.png.webp",
  "/image-4.png.webp",
  "/image-5.png.webp",
  "/image-6.png.webp",
  "/image-7.png.webp",
  "/image-8.png.webp",
];

export function thumbnailForVessel(mmsi: string, isDark: boolean): string {
  let hash = 0;
  for (let i = 0; i < mmsi.length; i++) {
    hash = (hash + mmsi.charCodeAt(i)) % 2147483647;
  }
  if (isDark) hash = (hash * 31 + 7) % 2147483647;
  const idx = hash % vesselThumbnails.length;
  return vesselThumbnails[idx];
}
