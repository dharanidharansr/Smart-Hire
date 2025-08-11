import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileIcon,
  UsersIcon,
  StarIcon,
  FileTextIcon,
  AlertCircleIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BrainIcon,
  LoaderIcon,
  MailIcon,
} from "lucide-react";
import Background from "./components/Background";
import Footer from "./components/Footer";
import ComparisonView from "./ComparisonView";
import { apiService } from "./lib/api";

const ResumeParser = () => {
  // Normalization function to inflate scores
  const normalizeAndInflateScore = (score, minScore = 15, maxScore = 25) => {
    // Handle null/undefined/NaN cases
    if (score == null || isNaN(score)) return 0;
    
    // Edge cases
    if (score >= 1) return score;
    
    // Normalize to 0-1 range based on observed min/max
    const inflated = score * 1.75;
    
    // Scale to 50-95 range (adjust these values as needed)
    
    // Round to nearest integer and ensure within bounds
    return Math.min(100, Math.max(0, Math.round(inflated)));
  };

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);

  const [hiringPrediction, setHiringPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false)
  // Add this function with your other functions
  const predictHiring = async () => {
    if (!selectedCandidate || !selectedCandidate.fullDetails) {
      return;
    }
  
    setIsPredicting(true);
    setHiringPrediction(null);
  
    try {
      // Extract candidate data from the selected candidate
      const candidateData = selectedCandidate.fullDetails.processed_data;
      
      // Extract skills from candidate data as a flat array
      let candidateSkills = [];
      if (candidateData.skills) {
        if (typeof candidateData.skills === 'object' && !Array.isArray(candidateData.skills)) {
          Object.values(candidateData.skills).forEach((skillArray) => {
            if (Array.isArray(skillArray)) {
              candidateSkills.push(...skillArray);
            }
          });
        } else if (Array.isArray(candidateData.skills)) {
          candidateSkills = candidateData.skills;
        }
      }
      
      // Calculate years of experience based on work history
      let experienceYears = 0;
      if (
        candidateData.work_experience &&
        candidateData.work_experience.length > 0
      ) {
        // Estimate years based on number of positions
        experienceYears = candidateData.work_experience.length * 1.5;
      }
      
      // Prepare the payload for hiring prediction
      const payload = {
        resume_text: selectedCandidate.fullDetails.raw_text,
        job_description:
          "TechNova Solutions is seeking a Senior Frontend Developer (React.js) to build and optimize scalable web applications using React.js, TypeScript, and Next.js. You'll collaborate with cross-functional teams, implement efficient state management with Redux or Context API, and ensure a seamless user experience.",
        education:
          candidateData.education?.[0]?.degree ||
          "Bachelor's Degree",
        industry: "Information Technology & Services",
        work_type: "Full-time",
        location:
          candidateData.personal_information?.location || "Remote",
        applied_job_title: "Senior Frontend Developer",
        experience_years: experienceYears || 3.0,
        salary_expectation: 100000.0,
        offered_salary: 120000.0,
        skills: candidateSkills,
        required_skills: [
          "React.js",
          "TypeScript",
          "Next.js",
          "Redux",
          "Context API",
          "CSS-in-JS",
          "SASS",
          "Tailwind CSS",
          "Jest",
          "React Testing Library",
          "Git",
          "Webpack",
          "Figma",
          "Problem-solving",
          "Team collaboration",
          "Agile methodologies",
        ],
      };
  
      console.log("Sending hiring prediction request with payload:", payload);
  
      // TODO: Backend endpoint not implemented yet
      // Placeholder response for now
      setHiringPrediction({
        prediction: 0.85,
        confidence: 0.90,
        message: "Hiring prediction feature is not yet implemented in the backend"
      });
      
      // Uncomment below when backend endpoint is ready:
      // const response = await apiService.predictHiring(payload);
      // console.log("Hiring prediction response:", response);
      // setHiringPrediction(response);
    } catch (err) {
      console.error("Hiring prediction error:", err);
      setHiringPrediction({
        error: err.response?.data?.detail || "Failed to predict hiring",
      });
    } finally {
      setIsPredicting(false);
    }
  };

  const sendConfirmationEmail = async () => {
    if (!selectedCandidate || !selectedCandidate.fullDetails) {
      setEmailStatus({ type: 'error', message: 'No candidate selected' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);
    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      const candidateData = selectedCandidate.fullDetails.processed_data;
      const email = selectedCandidate.fullDetails.processed_data.personal_information.email;
      console.log(selectedCandidate.fullDetails.processed_data.personal_information.email)
      if (!email) {
        setEmailStatus({ type: 'error', message: 'Candidate has no email address' });
        return;
      }

      const response = await apiService.sendConfirmationEmail({
        candidate_data: candidateData,
        email: email
      });

      if (response.message) {
        setEmailStatus({ type: 'success', message: response.message });
      } else {
        setEmailStatus({ type: 'error', message: response.error || 'Email sent but no confirmation received' });
      }
    } catch (err) {
      const errorDetails = err.response?.data || err.message;
      console.error("Full error details:", errorDetails);
      
      setEmailStatus({ 
        type: 'error', 
        message: err.response?.data?.detail || 
                err.response?.data?.message || 
                'Failed to send confirmation email' 
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const fetchCandidateAnalysis = async (candidate) => {
    if (!candidate || !candidate.fullDetails) return;

    setIsAnalysisLoading(true);
    setAiAnalysis(null);
    setAnalysisError(null);

    try {
      const response = await apiService.analyzeCandidate({
        candidate_data: JSON.stringify(candidate.fullDetails.processed_data),
      });

      if (response.analysis) {
        try {
          const parsedAnalysis =
            typeof response.analysis === "string"
              ? JSON.parse(response.analysis)
              : response.analysis;
          setAiAnalysis(parsedAnalysis);
        } catch (err) {
          setAnalysisError("Failed to parse AI analysis");
          console.error("Analysis parsing error:", err);
        }
      } else if (response.data.error) {
        setAnalysisError(response.data.error);
      }
    } catch (err) {
      setAnalysisError("Failed to get AI analysis");
      console.error("Analysis fetch error:", err);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processedResults, setProcessedResults] = useState([]);
  const [candidateRankings, setCandidateRankings] = useState([]);
  const [activeTab, setActiveTab] = useState("uploaded");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [alreadyParsedFiles, setAlreadyParsedFiles] = useState([]);
  const [expandedSkillCategories, setExpandedSkillCategories] = useState({});

  // Comparison state
  const [candidatesForComparison, setCandidatesForComparison] = useState([]);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [showComparisonView, setShowComparisonView] = useState(false);

  const CANDIDATES_PER_PAGE = 10;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError(null);
    setAlreadyParsedFiles([]);
  };

  const getMatchColorClass = (matchPercentage) => {
    const normalized = normalizeAndInflateScore(matchPercentage);
    
    if (normalized >= 85) return "border-green-800 bg-green-900/20";
    if (normalized >= 70) return "border-lime-800 bg-lime-900/20";
    if (normalized >= 55) return "border-yellow-800 bg-yellow-900/20";
    return "border-red-800 bg-red-900/20";
  };

  const extractNameFromRawText = (rawText) => {
    const lines = rawText.split("\n");
    return lines[0].trim();
  };

  const handleCandidateComparisonToggle = (candidate) => {
    if (candidatesForComparison.some((c) => c.name === candidate.name)) {
      setCandidatesForComparison((prev) =>
        prev.filter((c) => c.name !== candidate.name)
      );
    } else {
      if (candidatesForComparison.length < 2) {
        setCandidatesForComparison((prev) => [...prev, candidate]);
      }
    }
  };

  const startComparison = () => {
    if (candidatesForComparison.length === 2) {
      setShowComparisonView(true);
    }
  };

  const handleBackFromComparison = () => {
    setShowComparisonView(false);
  };

  const resetComparisonState = () => {
    setShowComparisonView(false);
    setCandidatesForComparison([]);
    setIsComparisonMode(false);
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    resetComparisonState();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please select at least one PDF file");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessedResults([]);
    setCandidateRankings([]);
    setSelectedCandidate(null);
    setAlreadyParsedFiles([]);
    resetComparisonState();

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        console.log(`🔄 Processing resume: ${file.name}`);
        
        // Use the new enhanced resume processing endpoint
        const response = await apiService.enhancedResumeProcessing(formData);
        
        console.log(`✅ Enhanced processing completed for: ${file.name}`);
        console.log(`📊 Extraction summary:`, response.extraction_summary);
        console.log(`💾 Database info:`, response.database_info);

        return {
          fileName: file.name,
          ...response,
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      const alreadyParsed = uploadResults
        .filter(
          (result) =>
            result.database_info && result.database_info.already_exists
        )
        .map((result) => result.fileName);

      if (alreadyParsed.length > 0) {
        setAlreadyParsedFiles(alreadyParsed);
      }

      setProcessedResults(uploadResults);

      // Get candidate rankings from the simplified endpoint
      console.log("🔄 Getting candidate rankings...");
      const rankingResponse = await apiService.processAndMatchResumes();
      
      console.log("🔍 Ranking response from backend:", rankingResponse);
      
      if (rankingResponse.candidates && rankingResponse.candidates.length > 0) {
        console.log("🔍 Sample candidate data:", rankingResponse.candidates[0]);
      }

      // Map the simplified ranking data to the expected format
      const combinedCandidates = rankingResponse.candidates.map((ranking) => {
        // Find the corresponding processed resume data
        const matchedResume = uploadResults.find((result) => {
          const extractedName = result.processed_data?.personal_info?.name || "";
          return extractedName.toLowerCase() === ranking.name.toLowerCase();
        });

        const mappedCandidate = {
          ...ranking,
          matchPercentage: ranking.match || ranking.ats_score || 0,
          fullDetails: matchedResume
            ? {
                raw_text: matchedResume.raw_text,
                processed_data: matchedResume.processed_data,
                extraction_summary: matchedResume.extraction_summary,
                database_info: matchedResume.database_info
              }
            : {
                raw_text: "Resume data not available",
                processed_data: {
                  personal_info: { name: ranking.name, email: ranking.email },
                  skills: { technical: [] },
                  education: [],
                  work_experience: [],
                  ats_score: ranking.ats_score
                },
                extraction_summary: {
                  career_level: ranking.career_level,
                  years_experience: ranking.years_experience,
                  skills_count: ranking.skills_count
                }
              },
        };
        
        console.log(`🔍 Mapped candidate ${ranking.name}: match=${ranking.match}, ats_score=${ranking.ats_score}`);
        
        return mappedCandidate;
      });

      setCandidateRankings(combinedCandidates);
      setActiveTab("rankings");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to process resumes");
      console.error("Error processing resumes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate);
    fetchCandidateAnalysis(candidate);
    setExpandedSkillCategories({});
  };

  const toggleSkillCategory = (category) => {
    setExpandedSkillCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const tabs = [
    {
      name: "uploaded",
      icon: FileIcon,
      label: "Uploaded Resumes",
      count: files.length,
    },
    {
      name: "rankings",
      icon: StarIcon,
      label: "Candidate Rankings",
      count: candidateRankings.length,
    },
  ];

  return (
    <Background
      className="min-h-screen"
      containerClassName="bg-black text-white relative overflow-hidden"
    >
      <div className="container mx-auto px-4 py-16 max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 shadow-xl"
        >
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
              HR Resume Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-xl font-inter text-neutral-300"></span>
            </div>
          </div>

          <div className="flex mb-6 space-x-4 border-b border-zinc-800 pb-2">
            {tabs.map((tab) => (
              <motion.button
                key={tab.name}
                onClick={() => handleTabChange(tab.name)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition duration-300 ${
                  activeTab === tab.name
                    ? "bg-blue-800/50 text-white"
                    : "bg-zinc-800/50 text-neutral-400 hover:bg-zinc-800/70"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-inter">{tab.label}</span>
                <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-0.5 rounded-full ml-2">
                  {tab.count}
                </span>
              </motion.button>
            ))}

            {activeTab === "rankings" && candidateRankings.length >= 2 && (
              <motion.button
                onClick={() => setIsComparisonMode(!isComparisonMode)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition duration-300 ${
                  isComparisonMode
                    ? "bg-purple-800/50 text-white"
                    : "bg-zinc-800/50 text-neutral-400 hover:bg-zinc-800/70"
                }`}
              >
                <UsersIcon className="w-5 h-5" />
                <span className="font-inter">Compare Candidates</span>
                {candidatesForComparison.length > 0 && (
                  <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-0.5 rounded-full ml-2">
                    {candidatesForComparison.length}/2
                  </span>
                )}
              </motion.button>
            )}
          </div>

          {isComparisonMode && candidatesForComparison.length === 2 && (
            <motion.div
              className="flex justify-end mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.button
                onClick={startComparison}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-purple-700 text-white px-4 py-2 rounded-full flex items-center"
              >
                <span className="mr-2">Start Comparison</span>
              </motion.button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex flex-col space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Upload Resume PDFs (Multiple)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    id="resume-pdfs-upload"
                    disabled={isLoading}
                  />
                  <label 
                    htmlFor="resume-pdfs-upload"
                    className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{ 
                      backgroundColor: 'rgb(30, 37, 95)', 
                      borderColor: 'rgb(30, 37, 95)',
                      ':hover': { backgroundColor: 'rgb(25, 30, 75)' }
                    }}
                    onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = 'rgb(25, 30, 75)')}
                    onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = 'rgb(30, 37, 95)')}
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose Files
                  </label>
                  <span className="ml-3 text-sm text-neutral-400 font-inter">
                    {files.length > 0 ? `${files.length} file(s) selected` : 'No file chosen'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-500 font-inter">PDF files only (Multiple files allowed)</p>
              </div>

              <motion.button
                type="submit"
                disabled={files.length === 0 || isLoading}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)",
                }}
                whileTap={{ scale: 0.95 }}
                className={`px-6 py-3 rounded-full text-white font-inter font-bold transition duration-300 
                  ${
                    files.length === 0 || isLoading
                      ? "bg-zinc-800 cursor-not-allowed"
                      : "bg-blue-800/50 hover:bg-blue-800/70 shadow-xl hover:shadow-blue-500/40"
                  }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing {files.length}{" "}
                    {files.length === 1 ? "resume" : "resumes"}...
                  </span>
                ) : (
                  `Process ${files.length} ${
                    files.length === 1 ? "Resume" : "Resumes"
                  }`
                )}
              </motion.button>
            </div>
          </form>

          {alreadyParsedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-amber-900/30 border border-amber-800 rounded-lg p-4 flex items-start"
            >
              <InfoIcon className="w-6 h-6 text-amber-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <p className="text-amber-300 font-medium">
                  The following{" "}
                  {alreadyParsedFiles.length === 1 ? "resume" : "resumes"}{" "}
                  {alreadyParsedFiles.length === 1 ? "has" : "have"} already
                  been parsed and stored in the database:
                </p>
                <ul className="mt-2 text-amber-200 list-disc list-inside pl-2">
                  {alreadyParsedFiles.map((fileName, index) => (
                    <li key={index} className="text-sm">
                      {fileName}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-start"
            >
              <AlertCircleIcon className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-300 font-medium">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          <div className="space-y-6">
            {activeTab === "uploaded" &&
              files.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className={`flex items-center justify-between p-4 rounded-lg
                  ${
                    alreadyParsedFiles.includes(file.name)
                      ? "bg-amber-900/20 border border-amber-800"
                      : "bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <FileIcon
                      className={`w-6 h-6 ${
                        alreadyParsedFiles.includes(file.name)
                          ? "text-amber-500"
                          : "text-blue-500"
                      }`}
                    />
                    <div>
                      <span className="text-neutral-300">{file.name}</span>
                      {alreadyParsedFiles.includes(file.name) && (
                        <span className="ml-3 text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">
                          Already in database
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </motion.div>
              ))}

            {activeTab === "rankings" && (
              <>
                {showComparisonView ? (
                  <ComparisonView
                    candidates={candidatesForComparison}
                    onBack={handleBackFromComparison}
                  />
                ) : (
                  <div className="grid md:grid-cols-[1fr_2fr] gap-6">
                    <div className="space-y-4">
                      {candidateRankings.length > 0 ? (
                        candidateRankings.map((candidate, index) => (
                          <motion.div
                            key={candidate.name}
                            onClick={() => handleCandidateSelect(candidate)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            className={`
                              border-l-4 rounded-lg cursor-pointer
                              ${getMatchColorClass(candidate.matchPercentage)}
                              ${
                                selectedCandidate?.name === candidate.name
                                  ? "ring-2 ring-blue-500"
                                  : ""
                              }
                              bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 
                              p-6 transition-all duration-300 relative
                              hover:shadow-xl hover:border-opacity-70
                            `}
                          >
                            {isComparisonMode && (
                              <div
                                className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 cursor-pointer
                                  ${
                                    candidatesForComparison.some(
                                      (c) => c.name === candidate.name
                                    )
                                      ? "bg-purple-500 border-purple-300"
                                      : "bg-transparent border-neutral-400"
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCandidateComparisonToggle(candidate);
                                }}
                              />
                            )}
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <h2 className="text-xl font-semibold text-neutral-100">
                                    {candidate.name}
                                  </h2>
                                  {candidate.fullDetails?.processed_data
                                    ?.note ===
                                    "Resume already exists in database" && (
                                    <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">
                                      Previously parsed
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span
                                  className={`
                                  text-2xl font-bold 
                                  ${
                                    normalizeAndInflateScore(candidate.matchPercentage) >= 85
                                      ? "text-green-400"
                                      : normalizeAndInflateScore(candidate.matchPercentage) >= 70
                                      ? "text-lime-400"
                                      : normalizeAndInflateScore(candidate.matchPercentage) >= 55
                                      ? "text-yellow-400"
                                      : "text-red-400"
                                  }
                                `}
                                >
                                  {normalizeAndInflateScore(candidate.matchPercentage)}%
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-10 bg-zinc-800/50 rounded-lg">
                          <p className="text-xl text-neutral-400">
                            No candidate rankings available
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedCandidate && selectedCandidate.fullDetails && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-zinc-800/50 rounded-lg p-6 space-y-6"
                      >
                        <div className="flex justify-between items-center border-b border-zinc-700 pb-4">
                          <div>
                            <h2 className="text-2xl font-bold text-white">
                              {selectedCandidate.name}
                            </h2>
                            {selectedCandidate.fullDetails?.processed_data
                              ?.note ===
                              "Resume already exists in database" && (
                              <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">
                                Previously parsed
                              </span>
                            )}
                            {selectedCandidate.fullDetails?.database_info?.already_exists && (
                              <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">
                                Already in database
                              </span>
                            )}
                          </div>
                          <span
                            className={`
                            text-2xl font-bold 
                            ${
                              normalizeAndInflateScore(selectedCandidate.matchPercentage) >= 85
                                ? "text-green-400"
                                : normalizeAndInflateScore(selectedCandidate.matchPercentage) >= 70
                                ? "text-lime-400"
                                : normalizeAndInflateScore(selectedCandidate.matchPercentage) >= 55
                                ? "text-yellow-400"
                                : "text-red-400"
                            }
                          `}
                          >
                            {normalizeAndInflateScore(selectedCandidate.matchPercentage)}% Match
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-neutral-400 mb-2 text-lg font-semibold">
                              Personal Information
                            </h3>
                            {selectedCandidate.fullDetails.processed_data
                              .personal_info ? (
                              <>
                                <p className="text-neutral-200">
                                  <strong>Name:</strong>{" "}
                                  {selectedCandidate.fullDetails.processed_data
                                    .personal_info.name || "N/A"}
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Email:</strong>{" "}
                                  {selectedCandidate.fullDetails.processed_data
                                    .personal_info.email || "No email"}
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Phone:</strong>{" "}
                                  {selectedCandidate.fullDetails.processed_data
                                    .personal_info.phone || "No phone"}
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Location:</strong>{" "}
                                  {selectedCandidate.fullDetails.processed_data
                                    .personal_info.location || "N/A"}
                                </p>
                                {selectedCandidate.fullDetails.processed_data
                                  .personal_info.linkedin && (
                                  <p className="text-neutral-300 text-sm">
                                    <strong>LinkedIn:</strong>{" "}
                                    <a 
                                      href={selectedCandidate.fullDetails.processed_data.personal_info.linkedin}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      View Profile
                                    </a>
                                  </p>
                                )}
                                {selectedCandidate.fullDetails.processed_data
                                  .personal_info.github && (
                                  <p className="text-neutral-300 text-sm">
                                    <strong>GitHub:</strong>{" "}
                                    <a 
                                      href={selectedCandidate.fullDetails.processed_data.personal_info.github}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      View Profile
                                    </a>
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-neutral-300">
                                No personal information available
                              </p>
                            )}
                          </div>

                          <div>
                            <h3 className="text-neutral-400 mb-2 text-lg font-semibold">
                              Extraction Summary
                            </h3>
                            {selectedCandidate.extraction_summary ? (
                              <div className="space-y-1">
                                <p className="text-neutral-300 text-sm">
                                  <strong>Career Level:</strong> {selectedCandidate.extraction_summary.career_level}
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Years Experience:</strong> {selectedCandidate.extraction_summary.years_experience}
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Education:</strong> {selectedCandidate.extraction_summary.education_count} entries
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Experience:</strong> {selectedCandidate.extraction_summary.experience_count} positions
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Skills:</strong> {selectedCandidate.extraction_summary.skills_count} technical skills
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Projects:</strong> {selectedCandidate.extraction_summary.projects_count} projects
                                </p>
                                <p className="text-neutral-300 text-sm">
                                  <strong>Certifications:</strong> {selectedCandidate.extraction_summary.certifications_count} certifications
                                </p>
                              </div>
                            ) : (
                              <p className="text-neutral-300 text-sm">
                                No extraction summary available
                              </p>
                            )}
                          </div>

                          <div>
                            <h3 className="text-neutral-400 mb-2 text-lg font-semibold">
                              Education
                            </h3>
                            {selectedCandidate.fullDetails.processed_data
                              .education &&
                            selectedCandidate.fullDetails.processed_data
                              .education.length > 0 ? (
                              selectedCandidate.fullDetails.processed_data.education.map(
                                (edu, index) => (
                                  <div key={index} className="mb-2">
                                    <p className="text-neutral-200">
                                      <strong>{edu.degree}</strong>
                                    </p>
                                    <p className="text-neutral-300 text-sm">
                                      {edu.institution}
                                    </p>
                                    <p className="text-neutral-300 text-sm">
                                      {edu.graduation_year}
                                    </p>
                                  </div>
                                )
                              )
                            ) : (
                              <p className="text-neutral-300">
                                No education details
                              </p>
                            )}
                          </div>

                          <div>
                            <h3 className="text-neutral-400 mb-2 text-lg font-semibold">
                              Work Experience
                            </h3>
                            {selectedCandidate.fullDetails.processed_data
                              .work_experience &&
                            selectedCandidate.fullDetails.processed_data
                              .work_experience.length > 0 ? (
                              selectedCandidate.fullDetails.processed_data.work_experience.map(
                                (job, index) => (
                                  <div key={index} className="mb-2">
                                    <p className="text-neutral-200">
                                      <strong>{job.title}</strong>
                                    </p>
                                    <p className="text-neutral-300 text-sm">
                                      {job.company}
                                    </p>
                                    <p className="text-neutral-300 text-sm">
                                      {job.start_date} -{" "}
                                      {job.end_date || "Present"}
                                    </p>
                                  </div>
                                )
                              )
                            ) : (
                              <p className="text-neutral-300">
                                No work experience details
                              </p>
                            )}
                          </div>
                            <div>
                              <h3 className="text-neutral-400 mb-2 text-lg font-semibold">ATS Score</h3>
                              <h6>{selectedCandidate.fullDetails.processed_data.ats_score}/100</h6>
                            </div>

                          <div>
                            <h3 className="text-neutral-400 mb-2 text-lg font-semibold">
                              Skills
                            </h3>
                            {selectedCandidate.fullDetails.processed_data
                              .skills ? (
                              <div className="space-y-4">
                                {/* Programming Languages */}
                                {selectedCandidate.fullDetails.processed_data.skills.programming_languages?.length > 0 && (
                                  <div>
                                    <p className="text-neutral-300 text-sm font-semibold mb-1">
                                      Programming Languages:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedCandidate.fullDetails.processed_data.skills.programming_languages.map((skill, idx) => (
                                        <span key={idx} className="inline-block px-2 py-0.5 bg-blue-900/30 text-blue-300 text-xs rounded-full">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Frameworks */}
                                {selectedCandidate.fullDetails.processed_data.skills.frameworks?.length > 0 && (
                                  <div>
                                    <p className="text-neutral-300 text-sm font-semibold mb-1">
                                      Frameworks & Libraries:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedCandidate.fullDetails.processed_data.skills.frameworks.map((skill, idx) => (
                                        <span key={idx} className="inline-block px-2 py-0.5 bg-green-900/30 text-green-300 text-xs rounded-full">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Databases */}
                                {selectedCandidate.fullDetails.processed_data.skills.databases?.length > 0 && (
                                  <div>
                                    <p className="text-neutral-300 text-sm font-semibold mb-1">
                                      Databases:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedCandidate.fullDetails.processed_data.skills.databases.map((skill, idx) => (
                                        <span key={idx} className="inline-block px-2 py-0.5 bg-purple-900/30 text-purple-300 text-xs rounded-full">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Cloud Platforms */}
                                {selectedCandidate.fullDetails.processed_data.skills.cloud_platforms?.length > 0 && (
                                  <div>
                                    <p className="text-neutral-300 text-sm font-semibold mb-1">
                                      Cloud Platforms:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedCandidate.fullDetails.processed_data.skills.cloud_platforms.map((skill, idx) => (
                                        <span key={idx} className="inline-block px-2 py-0.5 bg-orange-900/30 text-orange-300 text-xs rounded-full">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* DevOps Tools */}
                                {selectedCandidate.fullDetails.processed_data.skills.devops_tools?.length > 0 && (
                                  <div>
                                    <p className="text-neutral-300 text-sm font-semibold mb-1">
                                      DevOps Tools:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedCandidate.fullDetails.processed_data.skills.devops_tools.map((skill, idx) => (
                                        <span key={idx} className="inline-block px-2 py-0.5 bg-red-900/30 text-red-300 text-xs rounded-full">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Soft Skills */}
                                {selectedCandidate.fullDetails.processed_data.skills.soft_skills?.length > 0 && (
                                  <div>
                                    <p className="text-neutral-300 text-sm font-semibold mb-1">
                                      Soft Skills:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedCandidate.fullDetails.processed_data.skills.soft_skills.map((skill, idx) => (
                                        <span key={idx} className="inline-block px-2 py-0.5 bg-yellow-900/30 text-yellow-300 text-xs rounded-full">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Legacy skills display for backward compatibility */}
                                {(!selectedCandidate.fullDetails.processed_data.skills.programming_languages?.length && 
                                  !selectedCandidate.fullDetails.processed_data.skills.frameworks?.length) && (
                                  <div>
                                    <p className="text-neutral-300 text-sm font-semibold mb-1">
                                      Technical Skills:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedCandidate.fullDetails.processed_data.skills.technical?.map((skill, idx) => (
                                        <span key={idx} className="inline-block px-2 py-0.5 bg-blue-900/30 text-blue-300 text-xs rounded-full">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-neutral-300">
                                No skills listed
                              </p>
                            )}
                          </div>
                        </div>

                        {selectedCandidate && (
                          <div className="mt-6 border-t border-zinc-700 pt-4">
                            <div className="flex items-center gap-2 mb-4">
                              <BrainIcon className="w-6 h-6 text-purple-400" />
                              <h3 className="text-xl font-semibold text-purple-300">
                                AI Candidate Analysis
                              </h3>
                            </div>

                            {isAnalysisLoading ? (
                              <div className="flex items-center justify-center p-6 bg-zinc-900/50 rounded-lg">
                                <LoaderIcon className="w-6 h-6 text-purple-400 animate-spin mr-2" />
                                <span className="text-neutral-300">
                                  Analyzing candidate profile...
                                </span>
                              </div>
                            ) : analysisError ? (
                              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                                <p className="text-red-300 text-sm">
                                  {analysisError}
                                </p>
                              </div>
                            ) : aiAnalysis ? (
                              <div className="bg-zinc-900/50 rounded-lg p-4">
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="text-green-400 font-medium mb-2 flex items-center">
                                      <StarIcon
                                        className="w-4 h-4 mr-1"
                                        fill="currentColor"
                                      />{" "}
                                      Key Strengths
                                    </h4>
                                    <ul className="space-y-1">
                                      {aiAnalysis.strengths &&
                                        aiAnalysis.strengths.map(
                                          (strength, idx) => (
                                            <li
                                              key={idx}
                                              className="text-neutral-200 text-sm flex items-start"
                                            >
                                              <span className="text-green-500 mr-2">
                                                •
                                              </span>
                                              <span>{strength}</span>
                                            </li>
                                          )
                                        )}
                                    </ul>
                                  </div>

                                  <div>
                                    <h4 className="text-amber-400 font-medium mb-2 flex items-center">
                                      <InfoIcon className="w-4 h-4 mr-1" />{" "}
                                      Areas for Growth
                                    </h4>
                                    <ul className="space-y-1">
                                      {aiAnalysis.improvements &&
                                        aiAnalysis.improvements.map(
                                          (area, idx) => (
                                            <li
                                              key={idx}
                                              className="text-neutral-200 text-sm flex items-start"
                                            >
                                              <span className="text-amber-500 mr-2">
                                                •
                                              </span>
                                              <span>{area}</span>
                                            </li>
                                          )
                                        )}
                                    </ul>
                                  </div>
                                </div>

                                <div className="mt-4 border-t border-zinc-800 pt-4">
                                  <h4 className="text-blue-400 font-medium mb-2">
                                    Overall Assessment
                                  </h4>
                                  <p className="text-neutral-200 text-sm bg-zinc-800/50 p-3 rounded">
                                    {aiAnalysis.suitability}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
                                <p className="text-neutral-400">
                                  Select a candidate to see AI analysis
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Add this after the email status section, right before closing the selected candidate display */}
                       



                        {/* <div>
                          <h3 className="text-neutral-400 mb-2 text-lg font-semibold border-t border-zinc-700 pt-4">
                            Raw Resume Text
                          </h3>
                          <pre className="bg-zinc-900 p-4 rounded-lg text-neutral-300 text-sm overflow-x-auto max-h-40 overflow-y-auto">
                            {selectedCandidate.fullDetails.raw_text}
                          </pre>
                        </div> */}
                        <div className="mt-6 space-y-2">
                          <motion.button
                            onClick={sendConfirmationEmail}
                            disabled={
                              isSendingEmail ||
                              !selectedCandidate?.fullDetails?.processed_data
                                ?.personal_information?.email
                            }
                            whileHover={{ scale: isSendingEmail ? 1 : 1.05 }}
                            whileTap={{ scale: isSendingEmail ? 1 : 0.95 }}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                              isSendingEmail
                                ? "bg-gray-600 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            } ${
                              !selectedCandidate?.fullDetails?.processed_data
                                ?.personal_information?.email
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {isSendingEmail ? (
                              <>
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <MailIcon className="w-4 h-4" />
                                Send Confirmation Email
                              </>
                            )}
                          </motion.button>

                          {emailStatus && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-3 rounded-lg text-sm ${
                                emailStatus.type === "success"
                                  ? "bg-green-900/30 border border-green-800 text-green-200"
                                  : "bg-red-900/30 border border-red-800 text-red-200"
                              }`}
                            >
                              {emailStatus.message}
                            </motion.div>
                          )}

                          {selectedCandidate?.fullDetails?.processed_data
                            ?.personal_information?.email ? (
                            <p className="text-neutral-400 text-sm mt-1">
                              Will be sent to:{" "}
                              {
                                selectedCandidate.fullDetails.processed_data
                                  .personal_information.email
                              }
                            </p>
                          ) : (
                            <p className="text-amber-500 text-sm mt-1">
                              No email address found for this candidate
                            </p>
                          )}
                        </div>
                        <div className="mt-6 border-t border-zinc-700 pt-4">
                          <div className="flex items-center gap-2 mb-4">
                            <BrainIcon className="w-5 h-5 text-blue-400" />
                            <h3 className="text-xl font-semibold text-blue-300">
                              Hiring Prediction
                            </h3>
                          </div>

                          <motion.button
                            onClick={predictHiring}
                            disabled={
                              isPredicting || !selectedCandidate?.fullDetails
                            }
                            whileHover={{ scale: isPredicting ? 1 : 1.05 }}
                            whileTap={{ scale: isPredicting ? 1 : 0.95 }}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                              isPredicting
                                ? "bg-gray-600 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            } ${
                              !selectedCandidate?.fullDetails
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {isPredicting ? (
                              <>
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                                Predicting Hiring Outcome...
                              </>
                            ) : (
                              <>
                                <BrainIcon className="w-4 h-4" />
                                Predict Hiring Outcome
                              </>
                            )}
                          </motion.button>

                          {hiringPrediction && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`mt-4 p-4 rounded-lg ${
                                hiringPrediction.error
                                  ? "bg-red-900/30 border border-red-800"
                                  : hiringPrediction.hired_prediction
                                  ? "bg-green-900/30 border border-green-800"
                                  : "bg-amber-900/30 border border-amber-800"
                              }`}
                            >
                              {hiringPrediction.error ? (
                                <p className="text-red-200">
                                  {hiringPrediction.error}
                                </p>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <p
                                      className={`text-lg font-semibold ${
                                        hiringPrediction.hired_prediction
                                          ? "text-green-300"
                                          : "text-amber-300"
                                      }`}
                                    >
                                      {hiringPrediction.message}
                                    </p>

                                    <div className="bg-zinc-800/70 rounded-full px-3 py-1 text-white">
                                      <span className="font-bold">
                                        {Math.round(
                                          hiringPrediction.hiring_probability *
                                            100
                                        )}
                                        %
                                      </span>{" "}
                                      probability
                                    </div>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Comparison View */}
      <AnimatePresence>
        {showComparisonView && candidatesForComparison.length === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto"
          >
            <div className="container mx-auto px-4 py-8 max-w-7xl">
              <ComparisonView 
                candidates={candidatesForComparison} 
                onBack={handleBackFromComparison} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </Background>
  );
};

export default ResumeParser;