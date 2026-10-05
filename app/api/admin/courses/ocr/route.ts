import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import mammoth from "mammoth";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseErrorMessage(error: any, provider: string = "AI"): string {
  if (!error) return `Failed to process document with ${provider} OCR.`;
  let msg = error?.message || String(error);

  if (typeof msg === "string" && msg.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {
      // ignore JSON parse failure
    }
  }

  if (msg.includes("insufficient_quota")) {
    return "OpenAI API quota exceeded. Please check your OpenAI account billing details.";
  }

  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
    return `The ${provider} model is currently experiencing high demand. Please try again in a few moments.`;
  }

  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return `${provider} rate limit reached. Please wait a moment before trying again.`;
  }

  return msg;
}

async function generateGeminiContentWithFallback(ai: GoogleGenAI, promptContents: any[], config: any) {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-3.6-flash",
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini OCR] Attempting model ${model} (attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          model,
          contents: promptContents,
          config,
        });
        return response.text || "";
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err);
        const isTransient =
          errString.includes("503") ||
          errString.includes("UNAVAILABLE") ||
          errString.includes("high demand") ||
          errString.includes("429") ||
          errString.includes("RESOURCE_EXHAUSTED") ||
          errString.includes("500");

        console.warn(`[Gemini OCR] Model ${model} attempt ${attempt} (failed): ${errString}`);

        if (isTransient && attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1500;
          console.log(`[Gemini OCR] Waiting ${delay}ms before retrying ${model}...`);
          await sleep(delay);
        } else {
          break;
        }
      }
    }
  }

  throw lastError;
}

async function generateOpenAIContentWithFallback(openai: OpenAI, messages: any[]) {
  const modelsToTry = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[OpenAI OCR] Attempting model ${model} (attempt ${attempt}/${maxRetries})...`);
        const completion = await openai.chat.completions.create({
          model,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.2,
        });
        return completion.choices[0]?.message?.content || "";
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err);
        console.warn(`[OpenAI OCR] Model ${model} attempt ${attempt} (failed): ${errString}`);
        if (attempt < maxRetries) {
          await sleep(1500);
        } else {
          break;
        }
      }
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  let providerName = "AI";
  try {
    const body = await request.json();
    const { documentUrl, fileName, rawText, fileType, isPractical, practicalTitle, provider = "gemini" } = body;
    providerName = provider === "openai" ? "ChatGPT (OpenAI)" : "Google Gemini";

    if (!documentUrl && !rawText) {
      return NextResponse.json(
        { error: "Please provide a document URL or text to process." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a high-speed exam question parser for AVERO ACADEMY. Extract all past exam questions, options, correct answers, and exact verbatim rationales into JSON format.

CRITICAL RATIONALE EXTRACTION RULE:
1. Extract the rationale / explanation EXACTLY as it appears in the source document/text, word-for-word, verbatim.
2. DO NOT change, rephrase, rewrite, condense, shorten, or summarize the rationale in any way.
3. Preserve the full text, exact wording, and punctuation of the rationale as presented in the original question paper.

JSON format:
{
  "title": "Suggested Course/Exam Title",
  "description": "Short 2-sentence summary of exam topics.",
  "level": "Beginner | Intermediate | Advanced",
  "modules": [
    {
      "title": "Module 1: Key Topics Summary",
      "content": "Short markdown summary of tested concepts.",
      "estimatedMinutes": 15
    }
  ],
  "questions": [
    {
      "question": "Full question text",
      "options": [
        "A. Option 1",
        "B. Option 2",
        "C. Option 3",
        "D. Option 4"
      ],
      "correctAnswer": "A. Option 1",
      "explanation": "Exact verbatim rationale from the source document without any alteration or summarization."
    }
  ]
}`;

    let responseText = "";

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY is not configured on the server. Please set OPENAI_API_KEY in your environment variables." },
          { status: 500 }
        );
      }

      const openai = new OpenAI({ apiKey });
      let userContent: any = "";

      if (documentUrl) {
        try {
          const fileRes = await fetch(documentUrl);
          const contentTypeHeader = fileRes.headers.get("content-type") || "";
          const arrayBuffer = await fileRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const isZipDocxHeader =
            buffer.length >= 4 &&
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            buffer[2] === 0x03 &&
            buffer[3] === 0x04;

          const isPngHeader =
            buffer.length >= 4 &&
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47;

          const isJpegHeader =
            buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff;

          const isDocx =
            isZipDocxHeader ||
            contentTypeHeader.includes("wordprocessingml") ||
            contentTypeHeader.includes("msword") ||
            contentTypeHeader.includes("officedocument") ||
            fileType?.includes("wordprocessingml") ||
            fileType?.includes("msword") ||
            fileType?.includes("officedocument") ||
            documentUrl.match(/\.(docx?)$/i) ||
            fileName?.match(/\.(docx?)$/i);

          if (isDocx) {
            try {
              const result = await mammoth.extractRawText({ buffer });
              userContent = `Extract past questions JSON from this uploaded DOCX document text (do NOT edit, change, or summarize rationales; extract them exact and verbatim):\n\n${result.value}`;
            } catch (mammothErr) {
              const rawTxt = buffer.toString("utf-8");
              userContent = `Extract past questions JSON from this document text:\n\n${rawTxt}`;
            }
          } else if (isPngHeader || isJpegHeader || contentTypeHeader.includes("image") || fileType?.includes("image") || documentUrl.match(/\.(png|jpe?g|webp)$/i) || fileName?.match(/\.(png|jpe?g|webp)$/i)) {
            const base64Data = buffer.toString("base64");
            const mimeType = isPngHeader ? "image/png" : isJpegHeader ? "image/jpeg" : fileType || "image/jpeg";
            userContent = [
              { type: "text", text: "Extract all past exam questions, multiple-choice options, correct answers, and exact verbatim rationales into JSON format:" },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
            ];
          } else {
            // Plain text or PDF text fallback
            const txt = buffer.toString("utf-8");
            userContent = `Extract past questions JSON from this document content:\n\n${txt}`;
          }
        } catch (fetchErr) {
          console.error("Failed to fetch uploaded document URL for OpenAI OCR:", fetchErr);
          userContent = `Analyze document URL (${documentUrl}) and convert into past questions JSON with exact verbatim rationales.`;
        }
      } else {
        userContent = `Extract past questions JSON from text (do NOT edit, change, or summarize rationales; extract them exact and verbatim):\n\n${rawText}`;
      }

      const openAiMessages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ];

      responseText = await generateOpenAIContentWithFallback(openai, openAiMessages);

    } else {
      // Default: Google Gemini
      const apiKey = process.env.GEMINI_APIKEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "GEMINI_APIKEY is not configured on the server." },
          { status: 500 }
        );
      }

      const ai = new GoogleGenAI({ apiKey });
      let promptContents: any[] = [];

      if (documentUrl) {
        try {
          const fileRes = await fetch(documentUrl);
          const contentTypeHeader = fileRes.headers.get("content-type") || "";
          const arrayBuffer = await fileRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const isZipDocxHeader =
            buffer.length >= 4 &&
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            buffer[2] === 0x03 &&
            buffer[3] === 0x04;
          
          const isPdfHeader =
            buffer.length >= 4 &&
            buffer[0] === 0x25 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x44 &&
            buffer[3] === 0x46;

          const isPngHeader =
            buffer.length >= 4 &&
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47;

          const isJpegHeader =
            buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff;

          const isDocx =
            isZipDocxHeader ||
            contentTypeHeader.includes("wordprocessingml") ||
            contentTypeHeader.includes("msword") ||
            contentTypeHeader.includes("officedocument") ||
            fileType?.includes("wordprocessingml") ||
            fileType?.includes("msword") ||
            fileType?.includes("officedocument") ||
            documentUrl.match(/\.(docx?)$/i) ||
            fileName?.match(/\.(docx?)$/i);

          if (isDocx) {
            try {
              const result = await mammoth.extractRawText({ buffer });
              promptContents = [
                `Extract past questions JSON from this uploaded DOCX document text (do NOT edit, change, or summarize rationales; extract them exact and verbatim):\n\n${result.value}`,
              ];
            } catch (mammothErr) {
              const rawTxt = buffer.toString("utf-8");
              promptContents = [
                `Extract past questions JSON from this document text:\n\n${rawTxt}`,
              ];
            }
          } else if (isPdfHeader || contentTypeHeader.includes("pdf") || fileType?.includes("pdf") || documentUrl.match(/\.pdf$/i) || fileName?.match(/\.pdf$/i)) {
            const base64Data = buffer.toString("base64");
            promptContents = [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                },
              },
              "Extract all past exam questions, multiple-choice options, correct answers, and exact verbatim rationales into JSON format:",
            ];
          } else if (isPngHeader || isJpegHeader || contentTypeHeader.includes("image") || fileType?.includes("image") || documentUrl.match(/\.(png|jpe?g|webp)$/i) || fileName?.match(/\.(png|jpe?g|webp)$/i)) {
            const base64Data = buffer.toString("base64");
            const mimeType = isPngHeader ? "image/png" : isJpegHeader ? "image/jpeg" : fileType || "image/jpeg";
            promptContents = [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              "Extract all past exam questions, multiple-choice options, correct answers, and exact verbatim rationales into JSON format:",
            ];
          } else {
            const txt = buffer.toString("utf-8");
            promptContents = [
              `Extract past questions JSON from this text (do NOT edit, change, or summarize rationales; extract them exact and verbatim):\n\n${txt}`,
            ];
          }
        } catch (fetchErr) {
          console.error("Failed to fetch uploaded document URL for Gemini OCR:", fetchErr);
          promptContents = [
            `Analyze document URL (${documentUrl}) and convert into past questions JSON with exact verbatim rationales.`,
          ];
        }
      } else {
        promptContents = [
          `Extract past questions JSON from text (do NOT edit, change, or summarize rationales; extract them exact and verbatim):\n\n${rawText}`,
        ];
      }

      responseText = await generateGeminiContentWithFallback(ai, promptContents, {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      });
    }
    
    const cleanJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsedCourse;
    try {
      parsedCourse = JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn(`Raw ${providerName} response was not strict JSON, fallback parsing:`, responseText);
      parsedCourse = {
        title: "Extracted Past Questions",
        description: "Generated from uploaded past question document.",
        level: "Intermediate",
        modules: [
          {
            title: "Module 1: Overview",
            content: responseText,
            estimatedMinutes: 15,
          },
        ],
        questions: [],
      };
    }

    if (isPractical && Array.isArray(parsedCourse.questions)) {
      parsedCourse.questions = parsedCourse.questions.map((q: any) => ({
        ...q,
        questionType: "practical",
        practicalTitle: practicalTitle || parsedCourse.title || "Practical Module",
      }));
    }

    return NextResponse.json({
      success: true,
      provider: providerName,
      data: parsedCourse,
    });
  } catch (error: any) {
    console.error("OCR AI Processing Error:", error);
    const friendlyMessage = parseErrorMessage(error, providerName);
    return NextResponse.json(
      { error: friendlyMessage },
      { status: 500 }
    );
  }
}
