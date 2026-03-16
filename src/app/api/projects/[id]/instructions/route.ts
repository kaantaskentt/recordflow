import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateAgentInstructions } from "@/lib/ai/instructions";
import { formatInstructionsAsMarkdown } from "@/lib/ai/instructions-formatter";
import { validate, generateInstructionsSchema } from "@/lib/validations";
import type { AgentInstructions } from "@/lib/types";

export const maxDuration = 120;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const { data: project, error } = await supabase
    .from("projects")
    .select("name, agent_instructions, instructions_generated_at, instructions_error")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Download as JSON file
  if (format === "json") {
    if (!project.agent_instructions) {
      return NextResponse.json(
        { error: "No instructions generated yet" },
        { status: 404 }
      );
    }
    const filename = `${(project.name || "instructions").replace(/[^a-zA-Z0-9_-]/g, "_")}_agent_instructions.json`;
    return new NextResponse(
      JSON.stringify(project.agent_instructions, null, 2),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      }
    );
  }

  // Download as Markdown file
  if (format === "markdown") {
    if (!project.agent_instructions) {
      return NextResponse.json(
        { error: "No instructions generated yet" },
        { status: 404 }
      );
    }
    const instructions = project.agent_instructions as AgentInstructions;
    const markdown = formatInstructionsAsMarkdown(instructions, project.name || "Project");
    const filename = `${(project.name || "instructions").replace(/[^a-zA-Z0-9_-]/g, "_")}_agent_instructions.md`;
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Default: return JSON response (API usage)
  return NextResponse.json(project);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine, defaults apply
  }

  const result = validate(generateInstructionsSchema, {
    project_id: id,
    ...body,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // If not forcing, check for existing instructions
  if (!result.data.force) {
    const { data: existing } = await supabase
      .from("projects")
      .select("agent_instructions, instructions_generated_at")
      .eq("id", id)
      .single();

    if (existing?.agent_instructions) {
      return NextResponse.json({
        agent_instructions: existing.agent_instructions,
        instructions_generated_at: existing.instructions_generated_at,
        cached: true,
      });
    }
  }

  try {
    const instructions = await generateAgentInstructions(id);
    return NextResponse.json({
      agent_instructions: instructions,
      instructions_generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Instructions generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate instructions" },
      { status: 500 }
    );
  }
}
