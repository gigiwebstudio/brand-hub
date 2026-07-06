import { NextResponse } from 'next/server';

// Uses Google Gemini API (free tier, no credit card required) instead of the
// Claude API, since this is a low-stakes, low-volume classification task.
// Get a free key at https://aistudio.google.com/apikey — set as GEMINI_API_KEY.
//
// Note: on the free tier, Google's terms allow using your inputs/outputs to
// improve their models. Fine for casual client-request screenshots, but worth
// knowing if anything sensitive ever goes through this.

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You read screenshots of chat conversations between a marketing agency coworker and a client.
Extract the task the client is requesting. Respond with ONLY valid JSON matching this shape:

{
  "taskTitle": "short action-oriented title, max 8 words, in Korean",
  "taskDescription": "2-4 sentence detailed description of what the client wants, in Korean",
  "urgency": "low" | "normal" | "high",
  "mentionedLinks": ["any URLs visible in the screenshot text, empty array if none"]
}

If the screenshot is unclear or doesn't contain a client request, still return your best-guess JSON with taskTitle set to "확인 필요 - 스크린샷 다시 확인".`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, client } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY env var is not set' }, { status: 500 });
    }

    const userText = client
      ? `클라이언트: ${client}. 위 스크린샷에서 태스크를 추출해줘.`
      : '위 스크린샷에서 태스크를 추출해줘. 클라이언트 이름이 대화에 보이면 같이 알려줘.';

    const response = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
              { text: userText },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 500,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API error:', data.error);
      return NextResponse.json({ error: 'Gemini API request failed' }, { status: 500 });
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        taskTitle: '확인 필요 - AI 파싱 실패',
        taskDescription: raw.slice(0, 200),
        urgency: 'normal',
        mentionedLinks: [],
      };
    }

    return NextResponse.json({ draft: parsed });
  } catch (err) {
    console.error('POST /api/parse-task error:', err);
    return NextResponse.json({ error: 'Failed to parse screenshot' }, { status: 500 });
  }
}
