import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, Zap, Target, Award, TrendingUp } from 'lucide-react';
import { analyzeResumeWithGemini, extractTextFromFile, type AnalysisResult } from './services/geminiService';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeResume = useCallback(async (uploadedFile: File) => {
    setAnalyzing(true);
    setError(null);
    
    try {
      // Extract text from the uploaded file
      const resumeText = await extractTextFromFile(uploadedFile);
      console.log('Extracted resume text:', resumeText); // Debug: log extracted text
      
      // Analyze the resume using Gemini API
      const analysisResult = await analyzeResumeWithGemini(resumeText);
      
      setResults(analysisResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const uploadedFile = files[0];
      if (uploadedFile.type === 'text/plain' || 
          uploadedFile.type === 'application/pdf' || 
          uploadedFile.type === 'application/msword' || 
          uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFile(uploadedFile);
        analyzeResume(uploadedFile);
      }
    }
  }, [analyzeResume]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      analyzeResume(uploadedFile);
    }
  }, [analyzeResume]);

  const resetAnalysis = () => {
    setFile(null);
    setResults(null);
    setAnalyzing(false);
    setError(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-white/10 backdrop-blur-lg rounded-full">
              <Zap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Resume <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Analyzer</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Get instant ATS scoring and actionable insights to make your resume stand out to hiring managers
          </p>
        </div>

        {!file && !analyzing && !results && (
          <div className="max-w-2xl mx-auto">
            <div
              className={`relative border-2 border-dashed transition-all duration-300 rounded-xl p-12 text-center bg-white/5 backdrop-blur-lg ${
                dragActive 
                  ? 'border-cyan-400 bg-cyan-400/10 scale-105' 
                  : 'border-white/30 hover:border-white/50 hover:bg-white/10'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-6 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full">
                    <Upload className="w-16 h-16 text-white" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    Upload Your Resume
                  </h3>
                  <p className="text-white/70 text-lg">
                    Drop your text file, PDF, or Word document here, or click to browse
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4 text-sm text-white/60">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    TXT
                  </span>
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF
                  </span>
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    DOC
                  </span>
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    DOCX
                  </span>
                </div>
              </div>
              
              {!import.meta.env.VITE_GEMINI_API_KEY && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    <strong>Setup Required:</strong> Please add your Gemini API key to the .env file to enable resume analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {analyzing && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full animate-spin">
                  <Target className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Analyzing Your Resume</h3>
              <p className="text-white/70 mb-6">
                Gemini AI is analyzing your resume for ATS compatibility, keywords, and optimization opportunities...
              </p>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-500/10 backdrop-blur-lg rounded-xl p-8 text-center border border-red-500/20">
              <div className="flex justify-center mb-4">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Analysis Failed</h3>
              <p className="text-red-400 mb-6">{error}</p>
              <button
                onClick={resetAnalysis}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-lg text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {results && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center">
              <button
                onClick={resetAnalysis}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-lg text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Analyze Another Resume
              </button>
            </div>

            {/* ATS Score */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">ATS Compatibility Score</h2>
                <div className="relative w-40 h-40 mx-auto">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="12"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - results.score / 100)}`}
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(results.score)}`}>
                        {results.score}
                      </div>
                      <div className="text-white/60 text-sm">out of 100</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {Object.entries(results.breakdown).map(([category, score]) => (
                  <div key={category} className="bg-white/5 rounded-lg p-4 text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(score)} mb-1`}>
                      {score}%
                    </div>
                    <div className="text-white/70 text-sm capitalize">
                      {category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvements and Strengths */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Improvements */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-2xl font-bold text-white">Improvements</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <h4 className="font-semibold text-red-400">Critical Issues</h4>
                    </div>
                    <ul className="space-y-2">
                      {results.improvements.critical.map((improvement, index) => (
                        <li key={index} className="text-white/80 text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <h4 className="font-semibold text-yellow-400">Important</h4>
                    </div>
                    <ul className="space-y-2">
                      {results.improvements.important.map((improvement, index) => (
                        <li key={index} className="text-white/80 text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-blue-400" />
                      <h4 className="font-semibold text-blue-400">Suggested</h4>
                    </div>
                    <ul className="space-y-2">
                      {results.improvements.suggested.map((improvement, index) => (
                        <li key={index} className="text-white/80 text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Strengths */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Award className="w-6 h-6 text-green-400" />
                  <h3 className="text-2xl font-bold text-white">Strengths</h3>
                </div>

                <ul className="space-y-3">
                  {results.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/80">{strength}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-semibold text-green-400">Pro Tip</span>
                  </div>
                  <p className="text-white/80 text-sm">
                    Build on these strengths while addressing the critical issues to significantly improve your ATS score.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;