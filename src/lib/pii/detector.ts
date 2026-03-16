// ============================================
// RecordFlow — PII Detector
// ============================================
// Uses tesseract.js OCR to extract text + bounding boxes from images,
// then matches against regex patterns for PII types.

import Tesseract from "tesseract.js";
import type { PIIDetection, PIIType, BoundingBox } from "./types";

// ---- PII Pattern Definitions ----

interface PIIPattern {
  type: PIIType;
  regex: RegExp;
}

const PII_PATTERNS: PIIPattern[] = [
  {
    type: "email",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    type: "phone",
    // Matches: +1-234-567-8901, (234) 567-8901, 234-567-8901, 234.567.8901, etc.
    regex: /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g,
  },
  {
    type: "credit_card",
    // Matches: 1234 5678 9012 3456, 1234-5678-9012-3456
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  },
  {
    type: "ssn",
    // Matches: 123-45-6789
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
];

// ---- OCR Word with position ----

interface OCRWord {
  text: string;
  bbox: BoundingBox;
}

// ---- Reconstruct lines from words for multi-word PII matching ----

interface OCRLine {
  text: string;
  words: OCRWord[];
  // Character offset of each word within the line text
  wordOffsets: number[];
}

function buildLinesFromWords(words: OCRWord[]): OCRLine[] {
  if (words.length === 0) return [];

  const lines: OCRLine[] = [];
  let currentLine: OCRWord[] = [words[0]];

  // Group words into lines by vertical proximity (within 10px y-difference)
  for (let i = 1; i < words.length; i++) {
    const prev = currentLine[currentLine.length - 1];
    const curr = words[i];
    const yDiff = Math.abs(curr.bbox.y - prev.bbox.y);
    const lineHeight = Math.max(prev.bbox.h, curr.bbox.h);

    if (yDiff < lineHeight * 0.5) {
      currentLine.push(curr);
    } else {
      lines.push(lineFromWords(currentLine));
      currentLine = [curr];
    }
  }
  if (currentLine.length > 0) {
    lines.push(lineFromWords(currentLine));
  }

  return lines;
}

function lineFromWords(words: OCRWord[]): OCRLine {
  // Sort words by x position within the line
  const sorted = [...words].sort((a, b) => a.bbox.x - b.bbox.x);
  const offsets: number[] = [];
  let text = "";

  for (const word of sorted) {
    offsets.push(text.length);
    text += (text.length > 0 ? " " : "") + word.text;
  }

  return { text, words: sorted, wordOffsets: offsets };
}

// ---- Find which words a regex match spans ----

function findBboxForMatch(
  line: OCRLine,
  matchStart: number,
  matchEnd: number
): BoundingBox {
  let startWord = 0;
  let endWord = line.words.length - 1;

  for (let i = 0; i < line.words.length; i++) {
    const wordStart = line.wordOffsets[i];
    const wordEnd = wordStart + line.words[i].text.length;

    if (wordStart <= matchStart && matchStart < wordEnd + 1) {
      startWord = i;
    }
    if (wordEnd >= matchEnd - 1) {
      endWord = i;
      break;
    }
  }

  const first = line.words[startWord].bbox;
  const last = line.words[endWord].bbox;

  return {
    x: first.x,
    y: Math.min(first.y, last.y),
    w: last.x + last.w - first.x,
    h: Math.max(first.y + first.h, last.y + last.h) - Math.min(first.y, last.y),
  };
}

// ---- Main detection function ----

const OCR_TIMEOUT_MS = 30_000;

export async function detectPII(
  imageBuffer: Buffer
): Promise<PIIDetection[]> {
  let words: OCRWord[];

  try {
    const result = await Promise.race([
      Tesseract.recognize(imageBuffer, "eng", {
        logger: () => {}, // suppress progress logs
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OCR timeout")), OCR_TIMEOUT_MS)
      ),
    ]);

    // Extract words with bounding boxes
    words = [];
    for (const block of result.data.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          for (const word of line.words || []) {
            const trimmed = word.text.trim();
            if (trimmed.length === 0) continue;
            words.push({
              text: trimmed,
              bbox: {
                x: word.bbox.x0,
                y: word.bbox.y0,
                w: word.bbox.x1 - word.bbox.x0,
                h: word.bbox.y1 - word.bbox.y0,
              },
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn(
      "PII detection OCR failed, skipping redaction:",
      err instanceof Error ? err.message : err
    );
    return [];
  }

  if (words.length === 0) return [];

  // Build lines for multi-word pattern matching
  const lines = buildLinesFromWords(words);
  const detections: PIIDetection[] = [];

  for (const line of lines) {
    for (const pattern of PII_PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.regex.exec(line.text)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;
        const bbox = findBboxForMatch(line, matchStart, matchEnd);

        detections.push({
          type: pattern.type,
          text: match[0],
          bbox,
        });
      }
    }
  }

  return detections;
}
