import React, { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Zap,
  Target,
  Award,
  TrendingUp,
  LogOut,
  User,
  Loader2,
} from "lucide-react";
import {
  analyzeResumeWithGemini,
  extractTextFromFile,
  type AnalysisResult,
} from "./services/geminiService";
import { uploadResume, saveAnalysisResults } from "./services/storageService";
import { useAuth } from "./contexts/AuthContext";
import { AuthForm } from "./components/AuthForm";
import { ResumeHistory } from "./components/ResumeHistory";
import bgVideo from "./assets/video.webm";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingToStorage, setUploadingToStorage] = useState(false);

  const { user, signOut, loading: authLoading } = useAuth();

  const analyzeResume = useCallback(
    async (uploadedFile: File) => {
      if (!user) {
        setError("Please sign in to analyze your resume");
        return;
      }

      setAnalyzing(true);
      setError(null);
      setUploadingToStorage(true);

      try {
        const { url: fileUrl, error: uploadError } = await uploadResume(
          user.id,
          uploadedFile,
        );

        if (uploadError || !fileUrl) {
          throw new Error("Failed to upload resume to storage");
        }

        setUploadingToStorage(false);

        const resumeText = await extractTextFromFile(uploadedFile);
        console.log("Extracted resume text:", resumeText);

        const analysisResult = await analyzeResumeWithGemini(resumeText);

        const { error: saveError } = await saveAnalysisResults(
          user.id,
          uploadedFile.name,
          fileUrl,
          analysisResult,
        );

        if (saveError) {
          console.error("Failed to save analysis results:", saveError);
        }

        setResults(analysisResult);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
      } finally {
        setAnalyzing(false);
        setUploadingToStorage(false);
      }
    },
    [user],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        const uploadedFile = files[0];
        if (
          uploadedFile.type === "text/plain" ||
          uploadedFile.type === "application/pdf" ||
          uploadedFile.type === "application/msword" ||
          uploadedFile.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          setFile(uploadedFile);
          analyzeResume(uploadedFile);
        }
      }
    },
    [analyzeResume],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const uploadedFile = e.target.files[0];
        setFile(uploadedFile);
        analyzeResume(uploadedFile);
      }
    },
    [analyzeResume],
  );

  const resetAnalysis = () => {
    setFile(null);
    setResults(null);
    setAnalyzing(false);
    setError(null);
  };

  const handleSignOut = async () => {
    await signOut();
    resetAnalysis();
  };

  const handleViewHistoricalAnalysis = (analysis: AnalysisResult) => {
    setResults(analysis);
    setFile(null);
    setError(null);
  };

  const ScoreCard = ({
    title,
    score,
    description,
    icon: Icon,
    color,
  }: {
    title: string;
    score: number;
    description: string;
    icon: React.ElementType;
    color: string;
  }) => {
    const getScoreColor = (score: number) => {
      if (score >= 80) return "text-green-400";
      if (score >= 60) return "text-yellow-400";
      return "text-red-400";
    };

    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-white">{title}</h3>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
        </div>
        <p className="text-gray-300 text-sm">{description}</p>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={bgVideo} type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-pink-900/80" />
        <div className="relative z-10 flex items-center gap-3 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xl">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={bgVideo} type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-pink-900/80" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-4">
              AI Resume Analyzer
            </h1>
            <p className="text-xl text-gray-200">
              Sign in to analyze your resume and get AI-powered insights
            </p>
          </div>

          <AuthForm onSuccess={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={bgVideo} type="video/webm" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-pink-900/80" />

      <div className="relative z-10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <User className="w-5 h-5" />
            <span>{user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-4">
              AI Resume Analyzer
            </h1>
            <p className="text-xl text-gray-200">
              Upload your resume and get instant AI-powered insights
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <ResumeHistory
                onViewAnalysis={handleViewHistoricalAnalysis}
                onAnalysisDeleted={resetAnalysis}
              />
            </div>

            <div className="lg:col-span-2">
              {!analyzing && !results && (
                <div
                  className={`bg-white/10 backdrop-blur-md rounded-2xl p-10 border-2 border-dashed transition-all ${
                    dragActive
                      ? "border-blue-400 bg-blue-400/10"
                      : "border-white/30"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <Upload className="w-20 h-20 text-white/70 mx-auto mb-6" />
                    <h2 className="text-2xl font-semibold text-white mb-2">
                      Drop your resume here
                    </h2>
                    <p className="text-gray-300 mb-6">
                      or click to browse (PDF, Word, or Text format)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                </div>
              )}

              {analyzing && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-10 text-center">
                  <div className="animate-pulse">
                    {uploadingToStorage ? (
                      <>
                        <Upload className="w-20 h-20 text-blue-400 mx-auto mb-6" />
                        <h2 className="text-2xl font-semibold text-white mb-2">
                          Uploading Resume...
                        </h2>
                        <p className="text-gray-300">
                          Securely storing your resume in the cloud
                        </p>
                      </>
                    ) : (
                      <>
                        <Zap className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
                        <h2 className="text-2xl font-semibold text-white mb-2">
                          Analyzing Your Resume...
                        </h2>
                        <p className="text-gray-300">
                          Our AI is reviewing your resume for improvements
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 backdrop-blur-md rounded-2xl p-6 border border-red-500/50">
                  <div className="flex items-center gap-3 text-red-300">
                    <XCircle className="w-8 h-8" />
                    <div>
                      <h3 className="font-semibold text-lg">Error</h3>
                      <p>{error}</p>
                    </div>
                  </div>
                  <button
                    onClick={resetAnalysis}
                    className="mt-4 px-4 py-2 bg-red-500/30 hover:bg-red-500/40 rounded-lg text-white transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {results && !analyzing && (
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                      Overall Score
                    </h2>
                    <div
                      className={`text-6xl font-bold ${
                        results.scores.overall >= 80
                          ? "text-green-400"
                          : results.scores.overall >= 60
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {results.scores.overall}%
                    </div>
                    <p className="text-gray-300 mt-3">{results.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ScoreCard
                      title="ATS Compatibility"
                      score={results.scores.atsCompatibility}
                      description="How well your resume passes through Applicant Tracking Systems"
                      icon={Target}
                      color="bg-blue-500"
                    />
                    <ScoreCard
                      title="Keyword Optimization"
                      score={results.scores.keywordOptimization}
                      description="Presence of industry-relevant keywords and skills"
                      icon={Zap}
                      color="bg-purple-500"
                    />
                    <ScoreCard
                      title="Formatting"
                      score={results.scores.formatting}
                      description="Visual appeal and structural organization"
                      icon={FileText}
                      color="bg-green-500"
                    />
                    <ScoreCard
                      title="Impact"
                      score={results.scores.impact}
                      description="Strength of achievements and quantified results"
                      icon={Award}
                      color="bg-orange-500"
                    />
                  </div>

                  {results.strengths.length > 0 && (
                    <div className="bg-green-500/10 backdrop-blur-md rounded-2xl p-6 border border-green-500/30">
                      <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6" />
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {results.strengths.map((strength, index) => (
                          <li
                            key={index}
                            className="text-gray-300 flex items-start gap-2"
                          >
                            <span className="text-green-400 mt-1">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.improvements.length > 0 && (
                    <div className="bg-yellow-500/10 backdrop-blur-md rounded-2xl p-6 border border-yellow-500/30">
                      <h3 className="text-xl font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-6 h-6" />
                        Areas for Improvement
                      </h3>
                      <ul className="space-y-2">
                        {results.improvements.map((improvement, index) => (
                          <li
                            key={index}
                            className="text-gray-300 flex items-start gap-2"
                          >
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.criticalIssues &&
                    results.criticalIssues.length > 0 && (
                      <div className="bg-red-500/10 backdrop-blur-md rounded-2xl p-6 border border-red-500/30">
                        <h3 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
                          <XCircle className="w-6 h-6" />
                          Critical Issues
                        </h3>
                        <ul className="space-y-2">
                          {results.criticalIssues.map((issue, index) => (
                            <li
                              key={index}
                              className="text-gray-300 flex items-start gap-2"
                            >
                              <span className="text-red-400 mt-1">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {results.suggestions && results.suggestions.length > 0 && (
                    <div className="bg-blue-500/10 backdrop-blur-md rounded-2xl p-6 border border-blue-500/30">
                      <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" />
                        Suggestions
                      </h3>
                      <ul className="space-y-2">
                        {results.suggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            className="text-gray-300 flex items-start gap-2"
                          >
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={resetAnalysis}
                      className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
                    >
                      Analyze Another Resume
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
