import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validate, updateSessionSchema } from "@/lib/validations";
import { deleteSessionStorage } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Session not found:", error);
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = validate(updateSessionSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(result.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Session operation failed:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Clean up storage files before DB cascade delete
  await deleteSessionStorage(id);

  const { error } = await supabase.from("sessions").delete().eq("id", id);

  if (error) {
    console.error("Session operation failed:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
