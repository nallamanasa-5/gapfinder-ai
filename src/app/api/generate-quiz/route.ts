
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";



type QuizQuestion = {
  topic: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  source: string;
  evidence: string;
};

function validateQuestions(
  value: unknown,
  material: string,
  sourceName: string
): QuizQuestion[] {
  if (
    typeof value !== "object" ||
    value === null ||
    !("questions" in value) ||
    !Array.isArray(value.questions)
  ) {
    throw new Error("The AI returned an invalid quiz format. Please try again.");
  }

  if (value.questions.length !== 5) {
    throw new Error("The AI did not generate exactly five questions. Please try again.");
  }

  return value.questions.map((item: unknown) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("A quiz question has an invalid format.");
    }

    const q = item as Record<string, unknown>;

    if (
      typeof q.topic !== "string" ||
      typeof q.question !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      !q.options.every((option) => typeof option === "string") ||
      !Number.isInteger(q.answer) ||
      Number(q.answer) < 0 ||
      Number(q.answer) > 3 ||
      typeof q.explanation !== "string" ||
      typeof q.evidence !== "string" ||
      !q.evidence.trim() ||
      !material.includes(q.evidence)
    ) {
      throw new Error(
        "A question failed validation. Please try generating the quiz again."
      );
    }

    return {
      topic: q.topic,
      question: q.question,
      options: q.options as string[],
      answer: Number(q.answer),
      explanation: q.explanation,
      source: sourceName,
      evidence: q.evidence,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const material =
      typeof body.material === "string" ? body.material.trim() : "";

    const sourceName =
      typeof body.sourceName === "string" && body.sourceName.trim()
        ? body.sourceName.trim().slice(0, 200)
        : "Study material";

    if (material.length < 50) {
      return NextResponse.json(
        { error: "Please provide at least 50 characters of study material." },
        { status: 400 }
      );
    }

    if (material.length > 30000) {
      return NextResponse.json(
        { error: "Please limit your study material to 30,000 characters." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is missing. Add your Gemini API key to .env.local, then restart the development server.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are GapFinder AI, a careful study assistant.

Create exactly FIVE multiple-choice questions using ONLY the study material below.
Do not use outside facts or switch to a different subject.
Every question must be answerable from the supplied material.
Each question must have exactly four distinct answer options.
The "answer" field must be the zero-based index (0, 1, 2, or 3) of the correct option.
Include a brief explanation supported by the material.
The "evidence" field must be an exact, continuous quotation copied from the material.
Do not invent evidence. Do not include Markdown code fences.

Return only valid JSON in this format:
{
  "questions": [
    {
      "topic": "Topic covered by the notes",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Explanation based on the notes",
      "evidence": "Exact quotation copied from the notes"
    }
  ]
}

SOURCE NAME:
${sourceName}

STUDY MATERIAL:
${material}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response. Please try again.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(response.text);
    } catch {
      throw new Error("Gemini returned invalid JSON. Please try again.");
    }

    const questions = validateQuestions(parsed, material, sourceName);

    return NextResponse.json({
      questions,
      demoMode: false,
    });
  } catch (error) {
    console.error("Quiz generation failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
