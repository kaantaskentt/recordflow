// ============================================
// RecordFlow — Agent Instructions Markdown Formatter
// ============================================
// Converts AgentInstructions JSON to clean, human-readable Markdown

import type { AgentInstructions, ConfidenceAssessment } from "@/lib/types";

function confidenceTag(assessment: ConfidenceAssessment): string {
  const icons: Record<string, string> = {
    high: "[HIGH]",
    medium: "[MEDIUM]",
    low: "[LOW]",
  };
  return `${icons[assessment.level] || "[?]"} ${assessment.reasoning}`;
}

export function formatInstructionsAsMarkdown(
  instructions: AgentInstructions,
  projectName: string
): string {
  const lines: string[] = [];

  lines.push(`# Agent Instructions — ${projectName}`);
  lines.push(`Generated: ${instructions.generated_at}`);
  lines.push("");

  // Unanswered follow-ups warning
  if (instructions.unanswered_follow_ups_count > 0) {
    lines.push(
      `> **Warning:** ${instructions.unanswered_follow_ups_count} unanswered follow-up question(s). Answering them will improve accuracy.`
    );
    lines.push("");
  }

  // Process Summary
  lines.push("## Process Summary");
  lines.push(`Confidence: ${confidenceTag(instructions.process_summary_confidence)}`);
  lines.push("");
  lines.push(instructions.process_summary);
  lines.push("");

  // Steps
  if (instructions.steps.length > 0) {
    lines.push(`## Steps (${instructions.steps.length})`);
    lines.push(`Confidence: ${confidenceTag(instructions.steps_confidence)}`);
    lines.push("");

    for (const step of instructions.steps) {
      lines.push(`### Step ${step.step_number}`);
      lines.push(step.instruction);
      if (step.tool_context) {
        lines.push(`- **Tool:** ${step.tool_context}`);
      }
      if (step.data_inputs.length > 0) {
        lines.push(`- **Inputs:** ${step.data_inputs.join(", ")}`);
      }
      if (step.data_outputs.length > 0) {
        lines.push(`- **Outputs:** ${step.data_outputs.join(", ")}`);
      }
      if (step.notes) {
        lines.push(`- **Notes:** ${step.notes}`);
      }
      lines.push("");
    }
  }

  // Decision Logic
  if (instructions.decision_logic.length > 0) {
    lines.push(`## Decision Logic (${instructions.decision_logic.length})`);
    lines.push(
      `Confidence: ${confidenceTag(instructions.decision_logic_confidence)}`
    );
    lines.push("");

    for (const rule of instructions.decision_logic) {
      lines.push(`- **IF** ${rule.condition}`);
      lines.push(`  **THEN** ${rule.action}`);
      if (rule.related_steps.length > 0) {
        lines.push(`  *(Steps: ${rule.related_steps.join(", ")})*`);
      }
      lines.push(`  Source: ${rule.source}`);
      lines.push("");
    }
  }

  // Data Flow
  if (instructions.data_flow.length > 0) {
    lines.push(`## Data Flow (${instructions.data_flow.length})`);
    lines.push(
      `Confidence: ${confidenceTag(instructions.data_flow_confidence)}`
    );
    lines.push("");
    lines.push("| Source | Destination | Data | Steps |");
    lines.push("|--------|-------------|------|-------|");
    for (const flow of instructions.data_flow) {
      const steps =
        flow.related_steps.length > 0
          ? flow.related_steps.join(", ")
          : "—";
      lines.push(
        `| ${flow.source_system} | ${flow.destination_system} | ${flow.data_description} | ${steps} |`
      );
    }
    lines.push("");
  }

  // Exception Handling
  if (instructions.exception_handling.length > 0) {
    lines.push(
      `## Exception Handling (${instructions.exception_handling.length})`
    );
    lines.push(
      `Confidence: ${confidenceTag(instructions.exception_handling_confidence)}`
    );
    lines.push("");

    for (const exc of instructions.exception_handling) {
      const tag = exc.source === "observed" ? "[Observed]" : "[Inferred]";
      lines.push(`- ${tag} **WHEN** ${exc.scenario}`);
      lines.push(`  **DO** ${exc.handling}`);
      if (exc.related_steps.length > 0) {
        lines.push(`  *(Steps: ${exc.related_steps.join(", ")})*`);
      }
      lines.push("");
    }
  }

  // Gaps & Warnings
  if (instructions.gaps_and_warnings.length > 0) {
    lines.push(`## Gaps & Warnings (${instructions.gaps_and_warnings.length})`);
    lines.push("");

    for (const gap of instructions.gaps_and_warnings) {
      lines.push(`- **${gap.type.replace(/_/g, " ").toUpperCase()}:** ${gap.description}`);
      lines.push(`  Impact: ${gap.impact}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
