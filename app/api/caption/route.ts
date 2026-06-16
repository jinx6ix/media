import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageUrl, mediaType } = await req.json();

  // Videos get a text-only description prompt (no vision needed)
  if (mediaType === "video") {
    const filename = imageUrl?.split("/").pop() ?? "video";
    return NextResponse.json({
      caption: `A safari video captured by JaeTravel Expeditions — ${filename.replace(/[-_]/g, " ").replace(/\.[^.]+$/, "")}.`,
      tags: ["video", "safari", "JaeTravel", "Kenya"],
    });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
              {
                type: "text",
                text: `You are an assistant for JaeTravel Expeditions, a Kenya-based safari and tour company.
Write a vivid 1–2 sentence professional safari caption for this photo (wildlife, landscape, or travel context).
Then on a new line write: TAGS: followed by 4–6 comma-separated short tags relevant to the image.

Example format:
A lone elephant strides across the golden savannah as dusk paints the Amboseli sky in shades of amber.
TAGS: elephant, Amboseli, savannah, golden hour, wildlife, Kenya

Respond with only the caption and TAGS line — no preamble.`,
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("NVIDIA API error:", response.status, errText);
      return NextResponse.json({ caption: null, tags: [] });
    }

    const data = await response.json();
    const text: string =
      data.choices?.[0]?.message?.content?.trim() ?? "";

    const parts = text.split(/TAGS:/i);
    const caption = parts[0].trim();
    const tags = parts[1]
      ? parts[1]
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];

    return NextResponse.json({ caption, tags });
  } catch (err) {
    console.error("Caption error:", err);
    return NextResponse.json({ caption: null, tags: [] });
  }
}
