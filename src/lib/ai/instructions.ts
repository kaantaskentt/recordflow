// ============================================
// RecordFlow — Agent Instructions Generator
// ============================================
// Per-project: aggregates all sessions, steps, follow-ups into structured agent instructions
// Uses Claude Sonnet 4.6 for reasoning-heavy instruction generation

import { anthropic } from "@/lib/ai/claude";
import { parseJSON } from "@/lib/ai/analysis";
import { buildAgentInstructionsPrompt } from "@/lib/ai/prompts";
import { supabase } from "@/lib/supabase";
import type {
  AgentInstructions,
  BriefingSummary,
  WatchListItem,
  Step,
  FollowUp,
} from "@/lib/types";

export async function generateAgentInstructions(
  projectId: string
): Promise<AgentInstructions> {
  // ---- Fetch project ----
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Project not found: ${projectError?.message}`);
  }

  try {
    // ---- Fetch all reviewed sessions ----
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, title")
      .eq("project_id", projectId)
      .eq("status", "reviewed")
      .order("created_at", { ascending: true });

    const reviewedSessions = sessions || [];
    const sessionIds = reviewedSessions.map((s: { id: string }) => s.id);

    if (sessionIds.length === 0) {
      throw new Error("No reviewed sessions found. Analyze at least one session first.");
    }

    // ---- Fetch all steps across reviewed sessions ----
    let allSteps: (Step & { session_title: string })[] = [];
    if (sessionIds.length > 0) {
      const { data: steps } = await supabase
        .from("steps")
        .select("*")
        .in("session_id", sessionIds)
        .order("step_number", { ascending: true });

      const rawSteps = (steps as Step[]) || [];

      // Sort by session order then step_number, renumber globally
      const sessionOrder = new Map(sessionIds.map((id, i) => [id, i]));
      const sessionTitleMap = new Map(
        reviewedSessions.map((s: { id: string; title: string }) => [s.id, s.title])
      );

      rawSteps.sort((a, b) => {
        const sa = sessionOrder.get(a.session_id) ?? 0;
        const sb = sessionOrder.get(b.session_id) ?? 0;
        if (sa !== sb) return sa - sb;
        return a.step_number - b.step_number;
      });

      allSteps = rawSteps.map((s, i) => ({
        ...s,
        step_number: i + 1,
        session_title: sessionTitleMap.get(s.session_id) || "Unknown Session",
      }));
    }

    // ---- Fetch all follow-ups ----
    let allFollowUps: FollowUp[] = [];
    if (sessionIds.length > 0) {
      const { data: followUps } = await supabase
        .from("follow_ups")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });
      allFollowUps = (followUps as FollowUp[]) || [];
    }

    // ---- Compute tools inventory ----
    const toolCounts = new Map<string, number>();
    for (const step of allSteps) {
      for (const tool of step.tools_detected || []) {
        toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
      }
    }
    const toolsInventory = Array.from(toolCounts.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count);

    // ---- Build prompt ----
    const watchList: WatchListItem[] = project.watch_list || [];
    const briefingSummary: BriefingSummary | null = project.briefing_summary || null;

    const prompt = buildAgentInstructionsPrompt(
      {
        name: project.name,
        client_name: project.client_name,
        department: project.department || "",
        description: project.description || "",
        briefing_summary: briefingSummary,
      },
      allSteps.map((s) => ({
        step_number: s.step_number,
        description: s.description,
        tools_detected: s.tools_detected,
        data_sources: s.data_sources,
        action_type: s.action_type,
        complexity: s.complexity,
        notes: s.notes,
        session_title: s.session_title,
      })),
      allFollowUps.map((f) => ({
        question: f.question,
        response: f.response,
        status: f.status,
      })),
      watchList,
      toolsInventory
    );

    // ---- Call Claude Sonnet 4.6 ----
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      temperature: 0.3,
      system:
        "You are a solutions architect. Always respond with valid JSON only. No markdown, no explanation — just the JSON object.",
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    const parsed = parseJSON(responseText) as unknown as AgentInstructions;

    // ---- Save to project ----
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        agent_instructions: parsed,
        instructions_generated_at: new Date().toISOString(),
        instructions_error: null,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Failed to save agent instructions:", updateError);
      throw new Error("Failed to save agent instructions");
    }

    return parsed;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error generating instructions";
    console.error("Agent instructions generation failed:", errorMessage);

    await supabase
      .from("projects")
      .update({ instructions_error: errorMessage })
      .eq("id", projectId);

    throw err;
  }
}
