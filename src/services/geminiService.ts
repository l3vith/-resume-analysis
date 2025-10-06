import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry.js";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface AnalysisResult {
  scores: {
    overall: number;
    atsCompatibility: number;
    keywordOptimization: number;
    formatting: number;
    impact: number;
  };
  summary: string;
  strengths: string[];
  improvements: string[];
  criticalIssues: string[];
  suggestions: string[];
}

const ATS_ANALYSIS_PROMPT = `
You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the provided resume text and provide a comprehensive evaluation.

IMPORTANT: You must ONLY respond with a valid JSON object. Do not include any explanatory text, markdown formatting, or additional content outside the JSON.

Respond with a JSON object in this exact format:

\`\`\`json
{
  "score": 85,
  "breakdown": {
    "keywords": 80,
    "formatting": 90,
    "experience": 85,
    "skills": 75,
    "education": 95
  },
  "improvements": {
    "critical": ["Add more industry-specific keywords", "Include quantified achievements"],
    "important": ["Add professional summary", "Use consistent formatting"],
    "suggested": ["Include relevant certifications", "Add volunteer experience"]
  },
  "strengths": ["Clear work history", "Good educational background", "Professional formatting"],
  "summary": "Short summary sentence describing overall impression."
}
\`\`\`

Resume text to analyze:
`;

export async function analyzeResumeWithGemini(
  resumeText: string,
): Promise<AnalysisResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = ATS_ANALYSIS_PROMPT + resumeText;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (!jsonMatch) {
      jsonMatch = text.match(/\{[\s\S]*\}/);
    }

    if (!jsonMatch) {
      console.error(
        "Gemini response did not contain JSON. Full response:",
        text,
      );
      throw new Error(
        "No valid JSON found in response from Gemini. Try again.",
      );
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    let raw: any;
    try {
      raw = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error(
        "Failed to JSON.parse extracted text. Extracted text:",
        jsonText,
      );
      throw new Error("Failed to parse JSON from Gemini response");
    }

    const overall =
      typeof raw.score === "number"
        ? raw.score
        : typeof raw.score === "string"
          ? Number(raw.score) || 0
          : 0;
    const breakdown = raw.breakdown || {};
    const keywords =
      Number(breakdown.keywords ?? breakdown.keywordsScore ?? 0) || 0;
    const formatting = Number(breakdown.formatting ?? 0) || 0;
    const experience = Number(breakdown.experience ?? 0) || 0;
    const skills = Number(breakdown.skills ?? 0) || 0;
    const education = Number(breakdown.education ?? 0) || 0;

    const improvementsFlat: string[] = [];
    if (Array.isArray(raw.improvements)) {
      improvementsFlat.push(
        ...raw.improvements.filter((i: any) => typeof i === "string"),
      );
    } else if (raw.improvements && typeof raw.improvements === "object") {
      const keys = ["critical", "important", "suggested", "recommended"];
      for (const k of keys) {
        if (Array.isArray(raw.improvements[k])) {
          improvementsFlat.push(
            ...raw.improvements[k].filter((i: any) => typeof i === "string"),
          );
        }
      }
    }

    const strengths: string[] = Array.isArray(raw.strengths)
      ? raw.strengths.filter((s: any) => typeof s === "string")
      : [];

    const mapped: AnalysisResult = {
      scores: {
        overall: Math.round(overall),
        atsCompatibility:
          Math.round(
            (experience + education) / (experience || education ? 2 : 1),
          ) || 0,
        keywordOptimization: Math.round(keywords) || 0,
        formatting: Math.round(formatting) || 0,
        impact:
          Math.round((skills + experience) / (skills || experience ? 2 : 1)) ||
          0,
      },
      summary:
        (raw.summary && String(raw.summary)) ||
        (raw.analysisSummary && String(raw.analysisSummary)) ||
        "",
      strengths,
      improvements: improvementsFlat,
      criticalIssues: Array.isArray(raw.improvements?.critical)
        ? raw.improvements.critical.filter((i: any) => typeof i === "string")
        : [],
      suggestions: Array.isArray(raw.improvements?.suggested)
        ? raw.improvements.suggested.filter((i: any) => typeof i === "string")
        : [],
    };

    for (const key of Object.keys(mapped.scores) as Array<
      keyof AnalysisResult["scores"]
    >) {
      let v = mapped.scores[key];
      if (Number.isNaN(v) || v === Infinity || v === -Infinity) v = 0;
      mapped.scores[key] = Math.max(0, Math.min(100, Math.round(v)));
    }

    return mapped;
  } catch (error) {
    console.error("Error analyzing resume with Gemini:", error);
    if (error instanceof Error) {
      if (
        error.message.includes("Unavailable") ||
        error.message.includes("503")
      ) {
        throw new Error(
          "Gemini API is temporarily unavailable. Please try again later.",
        );
      }
      if (error.message.includes("JSON") || error.message.includes("parse")) {
        throw new Error(
          "Failed to parse analysis results from Gemini. Try again.",
        );
      }
      if (error.message.includes("API key")) {
        throw new Error("Invalid Gemini API key. Check configuration.");
      }
    }
    throw new Error("Failed to analyze resume. Please try again.");
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read text file"));
      reader.readAsText(file);
    } else if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(" ") + "\n";
          }
          if (text.trim().length > 50) {
            resolve(text.trim());
          } else {
            reject(
              new Error(
                "Could not extract readable text from PDF. Please try converting your PDF to a text file or copy-paste the content.",
              ),
            );
          }
        } catch (err) {
          console.error("PDF parsing error:", err);
          reject(
            new Error(
              "Failed to parse PDF. Try a different PDF or convert to text.",
            ),
          );
        }
      };
      reader.onerror = () => reject(new Error("Failed to read PDF file"));
      reader.readAsArrayBuffer(file);
    } else if (
      file.type === "application/msword" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      reject(
        new Error(
          "Word documents are not supported yet. Please convert your resume to PDF or text format.",
        ),
      );
    } else {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arr = e.target?.result as ArrayBuffer;
          const typedArray = new Uint8Array(arr);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(" ") + "\n";
          }
          if (text.trim().length > 50) {
            resolve(text.trim());
          } else {
            reject(
              new Error(
                "Could not extract readable text from file. Please provide a PDF or text file.",
              ),
            );
          }
        } catch (err) {
          reject(
            new Error("Unsupported file type. Please use PDF or text files."),
          );
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    }
  });
}
