// ============================================
// RecordFlow — PII Processing Pipeline
// ============================================
// Orchestrates: detect PII → redact image → return result
// Designed to be non-blocking: if detection or redaction fails,
// the original image is returned with a warning logged.

import { detectPII } from "./detector";
import { redactImage } from "./redactor";
import type { RedactionResult } from "./types";

export async function processFrameForPII(
  imageBuffer: Buffer
): Promise<RedactionResult> {
  try {
    const detections = await detectPII(imageBuffer);

    if (detections.length === 0) {
      return {
        buffer: imageBuffer,
        redactionCount: 0,
        detections: [],
      };
    }

    const redactedBuffer = await redactImage(imageBuffer, detections);

    console.log(
      `PII redaction: ${detections.length} item(s) redacted [${detections.map((d) => d.type).join(", ")}]`
    );

    return {
      buffer: redactedBuffer,
      redactionCount: detections.length,
      detections,
    };
  } catch (err) {
    // Never block frame upload due to PII processing failure
    console.warn(
      "PII processing failed, uploading original frame:",
      err instanceof Error ? err.message : err
    );
    return {
      buffer: imageBuffer,
      redactionCount: 0,
      detections: [],
    };
  }
}

export { detectPII } from "./detector";
export { redactImage } from "./redactor";
export type { PIIDetection, PIIType, BoundingBox, RedactionResult } from "./types";
