import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("session_id") as string;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: "File and session_id required" },
        { status: 400 }
      );
    }

    const MAX_RECORDING_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_RECORDING_SIZE) {
      return NextResponse.json(
        { error: "Recording exceeds 500MB limit" },
        { status: 413 }
      );
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Only video files are accepted" },
        { status: 400 }
      );
    }

    const fileName = `recordings/${sessionId}/${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(fileName, file, {
        contentType: "video/webm",
        upsert: true,
      });

    if (uploadError) {
      console.error("Recording upload failed:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload recording" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("recordings").getPublicUrl(fileName);

    // Update session with recording URL
    await supabase
      .from("sessions")
      .update({ recording_url: publicUrl })
      .eq("id", sessionId);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
