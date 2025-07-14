import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "", // fallback to empty
  dangerouslyAllowBrowser: true
});

export async function analyzeFile(base64Content: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract a table of Nyloplast drain basins from this civil site plan. Return the data as JSON with fields: Structure ID, Rim Elevation, Outlet Invert Elevation, and Diameter." },
          { type: "image_url", image_url: { url: `data:image/png;base64,${base64Content}` } }
        ]
      }
    ],
    max_tokens: 1000
  });

  return response.choices[0]?.message?.content || "";
}
