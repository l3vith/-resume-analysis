import React, { useEffect, useState } from "react";
import { Clock, FileText, Download, Eye, Trash2 } from "lucide-react";
import { getUserAnalyses, deleteResume } from "../services/storageService";
import { useAuth } from "../contexts/AuthContext";
import { AnalysisResult } from "../services/geminiService";
import { supabase } from "../lib/supabase";

interface ResumeAnalysis {
  id: string;
  file_name: string;
  file_url: string;
  analysis_results: AnalysisResult;
  created_at: string;
}

interface ResumeHistoryProps {
  onViewAnalysis: (analysis: AnalysisResult) => void;
  onAnalysisDeleted?: () => void;
}

export function ResumeHistory({
  onViewAnalysis,
  onAnalysisDeleted,
}: ResumeHistoryProps) {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<ResumeAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAnalyses();
    }
  }, [user]);

  const loadAnalyses = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await getUserAnalyses(user.id);

    if (data && !error) {
      setAnalyses(data as ResumeAnalysis[]);
    }

    setLoading(false);
  };

  const handleDelete = async (analysis: ResumeAnalysis) => {
    if (!window.confirm("Are you sure you want to delete this analysis?")) {
      return;
    }

    setDeletingId(analysis.id);

    try {
      await deleteResume(analysis.file_url);

      const { error } = await supabase
        .from("resume_analyses")
        .delete()
        .eq("id", analysis.id);

      if (error) throw error;

      setAnalyses((prev) => prev.filter((a) => a.id !== analysis.id));
      onAnalysisDeleted?.();
    } catch (error) {
      console.error("Error deleting analysis:", error);
      alert("Failed to delete analysis. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">
          No previous analyses found. Upload your first resume to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Previous Analyses
      </h3>

      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {analyses.map((analysis) => {
          const ar = analysis.analysis_results ?? {};
          const overallRaw =
            ar?.scores?.overall ??
            (typeof ar.score === "number"
              ? ar.score
              : Number(ar.score) || null);
          const atsRaw =
            ar?.scores?.atsCompatibility ??
            (ar?.breakdown
              ? (() => {
                  const exp = Number(ar.breakdown.experience ?? 0) || 0;
                  const edu = Number(ar.breakdown.education ?? 0) || 0;
                  if (exp || edu) {
                    return Math.round((exp + edu) / (exp && edu ? 2 : 1));
                  }
                  return null;
                })()
              : null);

          const overallDisplay =
            overallRaw !== null && overallRaw !== undefined
              ? Math.max(0, Math.min(100, Math.round(Number(overallRaw))))
              : null;
          const atsDisplay =
            atsRaw !== null && atsRaw !== undefined
              ? Math.max(0, Math.min(100, Math.round(Number(atsRaw))))
              : null;

          return (
            <div
              key={analysis.id}
              className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-white font-medium truncate"
                      title={analysis.file_name}
                    >
                      {analysis.file_name}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {new Date(analysis.created_at).toLocaleDateString()} at{" "}
                      {new Date(analysis.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => onViewAnalysis(analysis.analysis_results)}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 transition-colors"
                    title="View Analysis"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <a
                    href={analysis.file_url}
                    download
                    className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 transition-colors"
                    title="Download Resume"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(analysis)}
                    disabled={deletingId === analysis.id}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete Analysis"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 flex gap-4 text-sm">
                <span className="text-gray-400">
                  Score:{" "}
                  <span className="text-white font-medium">
                    {overallDisplay !== null ? `${overallDisplay}%` : "—"}
                  </span>
                </span>
                <span className="text-gray-400">
                  ATS:{" "}
                  <span className="text-white font-medium">
                    {atsDisplay !== null ? `${atsDisplay}%` : "—"}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
