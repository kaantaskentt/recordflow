// ============================================
// RecordFlow — PII Redactor
// ============================================
// Uses sharp to overlay black rectangles over detected PII bounding boxes.

import sharp from "sharp";
import type { PIIDetection } from "./types";

export async function redactImage(
  imageBuffer: Buffer,
  detections: PIIDetection[]
): Promise<Buffer> {
  if (detections.length === 0) return imageBuffer;

  // Get image dimensions to clamp bounding boxes
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 0;
  const imgHeight = metadata.height || 0;

  if (imgWidth === 0 || imgHeight === 0) {
    console.warn("PII redactor: could not read image dimensions, returning original");
    return imageBuffer;
  }

  // Build SVG overlay with black rectangles for each detection
  // Add padding around each detection for thorough coverage
  const PADDING = 4;
  const rects = detections
    .map((d) => {
      const x = Math.max(0, d.bbox.x - PADDING);
      const y = Math.max(0, d.bbox.y - PADDING);
      const w = Math.min(d.bbox.w + PADDING * 2, imgWidth - x);
      const h = Math.min(d.bbox.h + PADDING * 2, imgHeight - y);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="black"/>`;
    })
    .join("\n    ");

  const svgOverlay = Buffer.from(
    `<svg width="${imgWidth}" height="${imgHeight}">
    ${rects}
  </svg>`
  );

  // Composite the SVG overlay onto the original image
  const redacted = await sharp(imageBuffer)
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return redacted;
}
