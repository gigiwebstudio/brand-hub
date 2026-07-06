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

const SYSTEM_PROMPT = `You read one or more screenshots of chat conversations between a marketing agency coworker and a client.
When multiple screenshots are given, treat them as a continuous conversation in the order provided.
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
    const { images, client } = body;
    // images: [{ data: base64string, mimeType: 'image/jpeg' }, ...]

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'images array is required' }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY env var is not set' }, { status: 500 });
    }

    const userText = client
      ? `클라이언트: ${client}. 위 스크린샷${images.length > 1 ? '들' : ''}을 순서대로 같이 읽고, 하나의 태스크로 정리해줘. 여러 장이면 서로 이어지는 대화/맥락으로 봐줘.`
      : `위 스크린샷${images.length > 1 ? '들' : ''}을 순서대로 같이 읽고, 하나의 태스크로 정리해줘. 클라이언트 이름이 대화에 보이면 같이 알려줘.`;

    const imageParts = images.map((img) => ({
      inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data },
    }));

    const response = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [...imageParts, { text: userText }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 600,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API error:', data.error);
      return NextResponse.json(
        { error: 'Gemini API request failed', detail: data.error },
        { status: 500 }
      );
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
    return NextResponse.json(
      { error: 'Failed to parse screenshot', detail: err.message },
      { status: 500 }
    );
  }
}
