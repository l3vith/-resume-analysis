import { supabase } from "../lib/supabase";
import { AnalysisResult } from "./geminiService";

const RESUME_BUCKET = "resumes";

export async function uploadResume(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(RESUME_BUCKET)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error("Error uploading resume:", error);
    return { url: null, error: error as Error };
  }
}

export async function saveAnalysisResults(
  userId: string,
  fileName: string,
  fileUrl: string,
  analysisResults: AnalysisResult,
): Promise<{ id: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("resume_analyses")
      .insert([
        {
          user_id: userId,
          file_name: fileName,
          file_url: fileUrl,
          analysis_results: analysisResults as any,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { id: data.id, error: null };
  } catch (error) {
    console.error("Error saving analysis results:", error);
    return { id: null, error: error as Error };
  }
}

export async function getUserAnalyses(userId: string) {
  try {
    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error fetching user analyses:", error);
    return { data: null, error: error as Error };
  }
}

export async function deleteResume(
  fileUrl: string,
): Promise<{ error: Error | null }> {
  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf(RESUME_BUCKET);

    if (bucketIndex === -1) {
      throw new Error("Invalid file URL");
    }

    const filePath = pathParts.slice(bucketIndex + 1).join("/");

    const { error } = await supabase.storage
      .from(RESUME_BUCKET)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    console.error("Error deleting resume:", error);
    return { error: error as Error };
  }
}
