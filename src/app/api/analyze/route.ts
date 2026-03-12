import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

// タイムアウトを長めに設定 (60秒)
export const maxDuration = 60;

// GenAIクライアントの初期化
// ※利用者が後から .env.local に GEMINI_API_KEY を設定する前提
const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEYが設定されていません。アプリの .env.local にAPIキーを設定してください。");
    }
    return new GoogleGenAI({ apiKey });
};

const SYSTEM_INSTRUCTION = `
あなたは優秀な経理アシスタントです。
ユーザーがアップロードした画像（レシートや領収書）から、経費精算に必要な情報を抽出してください。

【重要】
画像の中に複数のレシートや領収書が写っている場合は、それらすべてを個別のデータとして抽出し、配列として返してください。
1つしかない場合は要素1つの配列として返してください。

読み取れない項目は null にしてください。
"summary" は購入した主な品目や経費の内容を短くまとめてください（例: "事務用品"、"飲食代"など）。
`;

export async function POST(req: NextRequest) {
    try {
        const { imageBase64, mimeType } = await req.json();

        if (!imageBase64) {
            return NextResponse.json(
                { error: "画像データが提供されていません。" },
                { status: 400 }
            );
        }

        const ai = getGenAI();

        // gemini-2.5-flashを使用
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                SYSTEM_INSTRUCTION,
                {
                    inlineData: {
                        mimeType: mimeType || "image/jpeg",
                        data: imageBase64,
                    },
                },
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    description: "抽出したレシート・領収書データのリスト",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING, description: "購入日 (YYYY/MM/DD形式)" },
                            storeName: { type: Type.STRING, description: "購入店舗名や会社名" },
                            amount: { type: Type.INTEGER, description: "合計金額" },
                            summary: { type: Type.STRING, description: "主な購入品目や経費の内容" },
                            hasInvoiceNumber: { type: Type.BOOLEAN, description: "適格請求書発行事業者登録番号(T+13桁)の記載があるかどうか" }
                        },
                        required: ["date", "storeName", "amount", "summary", "hasInvoiceNumber"]
                    }
                }
            }
        });

        const outputText = response.text || "";
        // 万が一Markdownのコードブロックが含まれていたら除去
        const cleanedText = outputText
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const result = JSON.parse(cleanedText);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Gemini API Analytics Error:", error);
        return NextResponse.json(
            { error: error.message || "解析中にエラーが発生しました。" },
            { status: 500 }
        );
    }
}
