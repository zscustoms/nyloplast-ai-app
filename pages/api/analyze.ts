import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🔧 Toggle this to `false` to go back to real GPT API once quota is restored
const USE_LOCAL_MOCK = true;

// 🧪 Mock GPT response for offline testing
const mockStructures = [
  { id: "STR-101", diameter: 12, rim: 896.80, out: 895.08, casting: "DOMED GRATE", type: "NYLOPLAST DRAIN BASIN" },
  { id: "STR-102", diameter: 18, rim: 897.79, out: 894.43, casting: "DOMED GRATE", type: "NYLOPLAST DRAIN BASIN" },
  { id: "STR-103", diameter: 18, rim: 899.71, out: 895.19, casting: "SOLID COVER", type: "NYLOPLAST DRAIN BASIN" },
  { id: "STR-105", diameter: 24, rim: 899.90, out: 895.27, casting: "SOLID COVER", type: "NYLOPLAST DRAIN BASIN" }
];

const pricingTable: Record<number, Record<number, number>> = {
  8: { 3: 413, 5: 427, 7: 484, 10: 517 },
  10: { 3: 522, 5: 582, 7: 619, 10: 721 },
  12: { 3: 805, 5: 855, 7: 1042, 10: 1102 },
  15: { 3: 1114, 5: 1225, 7: 1320, 10: 1399 },
  18: { 3: 1402, 5: 1438, 7: 1544, 10: 1618 },
  24: { 3: 1649, 5: 1803, 7: 1876, 10: 2018 },
  30: { 3: 2640, 5: 2903, 7: 3328, 10: 3545 },
  36: { 3: 4541, 5: 5030, 7: 5499, 10: 6225 }
};

const domeSurcharge: Record<number, number> = {
  8: 45, 10: 51, 12: 76, 15: 146, 18: 269, 24: 328, 30: 647
};


const roundUpHeight = (heightFt: number): number => {
  if (heightFt <= 3) return 3;
  if (heightFt <= 5) return 5;
  if (heightFt <= 7) return 7;
  return 10;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { base64 } = req.body;

  if (!base64 && !USE_LOCAL_MOCK) {
    return res.status(400).json({ error: 'Missing base64 image data' });
  }

  try {
    let parsed;

    if (USE_LOCAL_MOCK) {
      parsed = mockStructures;
      console.log("🧪 Using mock GPT response");
    } else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that extracts storm drain structure info from civil engineering plan tables.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64}` }
              },
              {
                type: 'text',
                text: `Analyze the image of a storm structure data table. 
                  Extract a list of structures with these properties:
                  - id (e.g., STR-101)
                  - casting
                  - diameter (number only)
                  - rim (RIM ELEV)
                  - out (PIPE INV (OUT))
                  - type (e.g., NYLOPLAST DRAIN BASIN)

                  Only include entries with "NYLOPLAST DRAIN BASIN" in the type field.
                  Exclude rows labeled "INLINE DRAIN" or "FLARED END".

                  Return the result as a JSON array of objects with the above fields.`
              }
            ]
          }
        ],
        max_tokens: 1500
      });

      const raw = completion.choices[0]?.message?.content;
      console.log("🔍 Raw GPT Response:\n", raw);
      if (!raw) {
        console.error("⚠️ GPT returned no content");
        return res.status(500).json({ error: 'AI returned no result' });
      }

      parsed = JSON.parse(raw);
    }

    const enriched = parsed.map((s: any) => {
      const height = parseFloat((s.rim - s.out).toFixed(2));
      const rounded = roundUpHeight(height);
      const diameter = parseInt(s.diameter);
      const price = pricingTable[diameter]?.[rounded] ?? 0;
      const domed = s.casting.toLowerCase().includes('domed');
      const surcharge = domed ? domeSurcharge[diameter] || 0 : 0;
      const part = `28${diameter}AG${rounded}`;

      return {
        id: s.id,
        diameter,
        height,
        rounded,
        part,
        price: price + surcharge,
        domed
      };
    });

    res.status(200).json({ result: JSON.stringify(enriched) });
  } catch (err: any) {
    console.error('❌ OpenAI API error:', err.message || err);
    res.status(500).json({ error: err.message || 'AI processing failed' });
  }
}
