import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validate, updateProjectSchema } from "@/lib/validations";
import { deleteProjectStorage } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Project not found:", error);
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = validate(updateProjectSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .update(result.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Clean up storage files before DB cascade delete
  await deleteProjectStorage(id);

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
