import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      model = 'gemini-3.8-flash',
      useThinking = false,
      userApiKey
    } = body;

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key available. Please add GEMINI_API_KEY in environment or input one in Settings.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let responseText = '';

    if (useThinking || model === 'gemini-4-argon') {
      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: 'HIGH' as any
          }
        }
      });
      responseText = response.text || '';
    } else {
      const response = await ai.models.generateContent({
        model: model || 'gemini-3.8-flash',
        contents: prompt
      });
      responseText = response.text || '';
    }

    return NextResponse.json({
      text: responseText,
      modelUsed: useThinking ? 'gemini-4-argon (Thinking)' : (model || 'gemini-3.8-flash')
    });
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error executing AI strategy prompt.' },
      { status: 500 }
    );
  }
}
