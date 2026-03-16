// ============================================
// RecordFlow — PII Detection & Redaction Types
// ============================================

export type PIIType = "email" | "phone" | "credit_card" | "ssn";

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PIIDetection {
  type: PIIType;
  text: string;
  bbox: BoundingBox;
}

export interface RedactionResult {
  buffer: Buffer;
  redactionCount: number;
  detections: PIIDetection[];
}
