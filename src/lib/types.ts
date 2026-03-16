// ============================================
// RecordIt — Core Types
// ============================================

export type ProjectStatus = "active" | "completed" | "archived";
export type SessionStatus =
  | "pending"
  | "recording"
  | "processing"
  | "analyzing"
  | "reviewed";
export type AnalysisStage = "frames" | "steps" | "gaps" | "followups";
export type ActionType =
  | "navigation"
  | "data_entry"
  | "decision"
  | "communication"
  | "lookup"
  | "validation"
  | "transformation";
export type Complexity = "automate" | "ai_assist" | "manual";
export type FollowUpStatus = "pending" | "sent" | "answered";
export type NarrationSource = "voice" | "typed" | "post_recording";

// ---- Projects ----

export interface BriefingSummary {
  process_overview: string;
  tools_mentioned: string[];
  pain_points: string[];
  key_entities: { name: string; type: string; description: string }[];
  open_questions: string[];
}

export interface WatchListItem {
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
}

export interface Project {
  id: string;
  name: string;
  client_name: string;
  department: string;
  description: string;
  status: ProjectStatus;
  briefing_transcript: string | null;
  briefing_summary: BriefingSummary | null;
  watch_list: WatchListItem[] | null;
  tags: string[];
  automation_score: number | null;
  agent_instructions: AgentInstructions | null;
  instructions_generated_at: string | null;
  instructions_error: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Sessions ----

export interface Session {
  id: string;
  project_id: string;
  title: string;
  status: SessionStatus;
  instructions: string | null;
  recording_url: string | null;
  duration_seconds: number | null;
  analysis_stage: AnalysisStage | null;
  analysis_error: string | null;
  analysis_intermediate: AnalysisIntermediate | null;
  created_at: string;
  completed_at: string | null;
}

// ---- Steps ----

export interface Step {
  id: string;
  session_id: string;
  step_number: number;
  timestamp_start: number | null;
  timestamp_end: number | null;
  description: string;
  tools_detected: string[];
  data_sources: string[];
  action_type: ActionType;
  complexity: Complexity;
  notes: string | null;
}

// ---- Follow-ups ----

export interface FollowUp {
  id: string;
  session_id: string;
  step_id: string | null;
  question: string;
  context: string;
  response: string | null;
  status: FollowUpStatus;
  created_at: string;
}

// ---- Narrations ----

export interface Narration {
  id: string;
  session_id: string;
  timestamp: number;
  text: string;
  source: NarrationSource;
}

// ---- Agent Instructions ----

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  reasoning: string;
}

export interface InstructionStep {
  step_number: number;
  instruction: string;
  tool_context: string | null;
  data_inputs: string[];
  data_outputs: string[];
  notes: string | null;
}

export interface DecisionRule {
  condition: string;
  action: string;
  related_steps: number[];
  source: string;
}

export interface DataFlowEntry {
  source_system: string;
  destination_system: string;
  data_description: string;
  related_steps: number[];
}

export interface ExceptionRule {
  scenario: string;
  handling: string;
  related_steps: number[];
  source: "observed" | "inferred";
}

export interface GapWarning {
  description: string;
  type: string;
  impact: string;
  related_follow_up_ids: string[];
}

export interface AgentInstructions {
  process_summary: string;
  process_summary_confidence: ConfidenceAssessment;
  steps: InstructionStep[];
  steps_confidence: ConfidenceAssessment;
  decision_logic: DecisionRule[];
  decision_logic_confidence: ConfidenceAssessment;
  data_flow: DataFlowEntry[];
  data_flow_confidence: ConfidenceAssessment;
  exception_handling: ExceptionRule[];
  exception_handling_confidence: ConfidenceAssessment;
  gaps_and_warnings: GapWarning[];
  unanswered_follow_ups_count: number;
  generated_at: string;
}

// ---- Analysis Intermediate Results ----

export interface AnalysisIntermediate {
  frame_descriptions?: { timestamp: number; app: string; action: string }[];
  preliminary_steps?: {
    step_number: number;
    description: string;
    tools_detected: string[];
    action_type: string;
    complexity: string;
  }[];
  gaps_detected?: number;
  stage_completed: string;
}

// ---- Recording Log (client-side) ----

export interface LogEntry {
  time: string;
  type: "action" | "narration" | "voice" | "system";
  text: string;
  timestamp?: number;
}
