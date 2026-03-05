import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validate, createProjectSchema } from "@/lib/validations";

export async function GET() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = validate(createProjectSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(result.data)
    .select()
    .single();

  if (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
