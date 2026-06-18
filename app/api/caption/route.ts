import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageUrl, mediaType } = await req.json();

  if (mediaType === "video") {
    const filename = imageUrl?.split("/").pop() ?? "video";
    return NextResponse.json({
      caption: `A safari video captured by JaeTravel Expeditions — ${filename.replace(/[-_]/g, " ").replace(/\.[^.]+$/, "")}.`,
      tags: ["video", "safari", "JaeTravel", "Kenya"],
      location_hint: null,
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
From this photo, identify the likely specific wildlife reserve, national park, or iconic natural landmark where the photo was taken in Kenya. Examples: "Masai Mara National Reserve", "Amboseli National Park", "Lake Nakuru National Park", "Tsavo East National Park", "Mount Kilimanjaro region".

Write a vivid 1–2 sentence professional safari caption for this photo (wildlife, landscape, or travel context).

Then on a new line write: TAGS: followed by 4–6 comma-separated short tags relevant to the image.

Then on a new line write: LOCATION: followed by the most likely specific Kenyan wildlife reserve, national park, or natural landmark name. If you cannot determine the location with reasonable confidence, write LOCATION: Unknown.

Respond with only these three lines — no preamble. Example format:
A lone elephant strides across the golden savannah as dusk paints the Amboseli sky in shades of amber.
TAGS: elephant, Amboseli, savannah, golden hour, wildlife, Kenya
LOCATION: Amboseli National Park`,
              },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("NVIDIA API error:", response.status, errText);
      return NextResponse.json({ caption: null, tags: [], location_hint: null });
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    const tagMatch = text.match(/TAGS:\s*([\s\S]*?)(?=LOCATION:|$)/i);
    const locMatch = text.match(/LOCATION:\s*([^\n]+)/i);

    const caption = text.split("TAGS:")[0].trim();
    const tags = tagMatch
      ? tagMatch[1]
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];
    const location_hint = locMatch ? locMatch[1].trim() : null;

    return NextResponse.json({ caption, tags, location_hint });
  } catch (err) {
    console.error("Caption error:", err);
    return NextResponse.json({ caption: null, tags: [], location_hint: null });
  }
}