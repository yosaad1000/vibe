import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const SYSTEM_PROMPT = `You are an expert full-stack web developer. When the user describes an app or feature, you respond with a SINGLE self-contained HTML file that implements it completely.

Rules:
- Output ONLY a valid HTML file — no markdown, no explanation, no code fences
- Use vanilla JS or inline React via CDN (unpkg/esm.sh) — no build step
- Use Tailwind CSS via CDN for styling
- Make it look polished and modern
- All logic must be inside the single HTML file
- If the user asks for changes, output the full updated HTML file`;

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function generateCode(messages: ChatMessage[]): Promise<string> {
    const history = messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = genai.chats.create({
        model: 'gemini-2.0-flash',
        config: { systemInstruction: SYSTEM_PROMPT },
        history,
    });

    const response = await chat.sendMessage({
        message: lastMessage.content,
    });

    return response.text ?? '';
}
