import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validate, updateFollowUpSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Follow-up not found:", error);
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = validate(updateFollowUpSchema, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("follow_ups")
    .update(result.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Follow-up operation failed:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}
