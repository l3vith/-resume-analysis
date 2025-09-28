import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-expect-error: No types for pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry.js';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface AnalysisResult {
  score: number;
  breakdown: {
    keywords: number;
    formatting: number;
    experience: number;
    skills: number;
    education: number;
  };
  improvements: {
    critical: string[];
    important: string[];
    suggested: string[];
  };
  strengths: string[];
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
  "strengths": ["Clear work history", "Good educational background", "Professional formatting"]
}
\`\`\`

Analysis Guidelines:
- Score based on ATS compatibility, keyword optimization, formatting, and content quality
- Critical issues: Problems that would cause ATS rejection or major parsing errors
- Important improvements: Issues that significantly impact ranking and visibility
- Suggested enhancements: Nice-to-have improvements for better presentation
- Strengths: Positive aspects that work well for ATS systems

Consider these ATS factors:
1. Keyword relevance and density
2. Standard section headers (Experience, Education, Skills, etc.)
3. Consistent formatting and structure
4. Contact information placement
5. File format compatibility
6. Use of standard fonts and formatting
7. Quantified achievements
8. Industry-specific terminology
9. Skills section optimization
10. Education credentials formatting

Resume text to analyze:
`;

export async function analyzeResumeWithGemini(resumeText: string): Promise<AnalysisResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const prompt = ATS_ANALYSIS_PROMPT + resumeText;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response - look for JSON code blocks first, then fallback to raw JSON
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      jsonMatch = text.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      console.error('Gemini response:', text);
      throw new Error('No valid JSON found in response. Please try again.');
    }
    
    const jsonText = jsonMatch[1] || jsonMatch[0];
    const analysisResult = JSON.parse(jsonText);
    
    // Validate the response structure
    if (!analysisResult.score || !analysisResult.breakdown || !analysisResult.improvements || !analysisResult.strengths) {
      console.error('Invalid structure:', analysisResult);
      throw new Error('Invalid response structure from Gemini API');
    }
    
    return analysisResult;
  } catch (error) {
    console.error('Error analyzing resume with Gemini:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('503') || error.message.includes('unavailable')) {
        throw new Error('Gemini API is temporarily unavailable. Please try again in a few moments.');
      }
      if (error.message.includes('JSON') || error.message.includes('structure')) {
        throw new Error('Failed to parse analysis results. Please try again.');
      }
      if (error.message.includes('API key')) {
        throw new Error('Invalid API key. Please check your Gemini API key configuration.');
      }
    }
    
    throw new Error('Failed to analyze resume. Please try again.');
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Use pdfjs-dist for robust PDF extraction
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
          if (text.trim().length > 50) {
            resolve(text.trim());
          } else {
            reject(new Error('Could not extract readable text from PDF. Please try converting your PDF to a text file or copy-paste the content.'));
          }
        } catch (error) {
          console.error('PDF parsing error:', error);
          reject(new Error('Failed to parse PDF. Please try a different PDF or convert to text format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file);
    } else if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      reject(new Error('Word documents are not supported yet. Please convert your resume to PDF or text format.'));
    } else {
      reject(new Error('Unsupported file type. Please use PDF or text files.'));
    }
  });
}