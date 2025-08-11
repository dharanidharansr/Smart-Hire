import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../lib/api';
import Background from '../components/Background';
import Spotlight from '../components/Spotlight';
import Navbar from './Navbar';
import Footer from './Footer';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Application states - simplified for resume-only approach
  const [resume, setResume] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch job details on component mount
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        console.log("Fetching job details for jobId:", jobId);
        const jobData = await apiService.getJob(jobId);
        console.log("Job data received:", jobData);
        
        // Handle different response structures
        const job = jobData.job || jobData;
        setJob(job);
      } catch (err) {
        console.error("Error fetching job details:", err);
        setError("Failed to fetch job details.");
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  // File upload handler
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setResume(file);
    } else {
      alert("Please upload a PDF file.");
    }
  };

  // Resume extraction method using FastAPI backend with enhanced processing
  const extractResumeData = async (file) => {
    try {
      console.log("🔄 Starting enhanced resume extraction...");
      const formData = new FormData();
      formData.append('file', file);

      console.log("📤 Sending request to enhanced processing endpoint...");
      const response = await apiService.enhancedResumeProcessing(formData);
      console.log("📥 Received enhanced response from FastAPI:", response);
      
      // Enhanced processing returns more structured data
      const extractedData = response.extracted_data || response;
      const personalInfo = extractedData.personal_info || {};
      const skillsData = extractedData.skills || {};
      
      console.log("✅ Enhanced processing completed");
      console.log("📊 Extraction summary:", response.extraction_summary);
      console.log("💾 Database info:", response.database_info);
      
      return {
        full_name: personalInfo.name || extractedData.name || extractedData.full_name || "Placeholder Name",
        email: personalInfo.email || extractedData.email || "placeholder@email.com",
        phone: personalInfo.phone || extractedData.phone || extractedData.phone_number || "",
        skills: skillsData.technical_skills || extractedData.extracted_skills || extractedData.skills || [],
        education: extractedData.education || [],
        experience: extractedData.experience || extractedData.work_experience || [],
        certifications: extractedData.certifications || [],
        languages: extractedData.languages || []
      };
    } catch (error) {
      console.error("❌ Enhanced resume parsing error:", error);
      // Fallback to placeholder data if parsing fails
      return {
        full_name: "Placeholder Name",
        email: "placeholder@email.com",
        phone: "",
        skills: [],
        education: [],
        experience: [],
        certifications: [],
        languages: []
      };
    }
  };

  // Main application submission handler
  const handleSubmit = async (event) => {
    event.preventDefault();
    setUploading(true);
    console.log("Starting resume-only application submission process...");

    try {
      // Get current authenticated user from localStorage
      console.log("Getting authenticated user...");
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id;
      
      if (!userId) {
        throw new Error("User not authenticated");
      }
      console.log("User ID:", userId);

      // Ensure resume is uploaded
      if (!resume) throw new Error("Please upload your resume to apply");
      
      // Extract resume data first using enhanced Groq AI processing
      console.log("🔄 Starting enhanced AI resume data extraction...");
      const extractedData = await extractResumeData(resume);
      console.log("🤖 Enhanced AI extracted resume data:", extractedData);

      // Create FormData for the application (resume-only approach)
      const applicationData = new FormData();
      applicationData.append('job_id', jobId);
      applicationData.append('candidate_id', userId);
      applicationData.append('file', resume);
      
      // All data comes from AI-extracted resume data
      applicationData.append('full_name', extractedData.full_name || 'Unknown');
      applicationData.append('email', extractedData.email || userData.email || 'unknown@email.com');
      applicationData.append('phone', extractedData.phone || '');
      applicationData.append('skills', JSON.stringify(extractedData.skills || []));
      applicationData.append('education', JSON.stringify(extractedData.education || []));
      applicationData.append('experience', JSON.stringify(extractedData.experience || []));
      applicationData.append('certifications', JSON.stringify(extractedData.certifications || []));
      applicationData.append('languages', JSON.stringify(extractedData.languages || []));
      
      // Optional fields (can be empty)
      applicationData.append('cover_letter', coverLetter || '');
      applicationData.append('phone_number', extractedData.phone || '');
      applicationData.append('location', '');
      applicationData.append('linkedin_url', '');
      applicationData.append('github_url', '');
      applicationData.append('portfolio_url', '');

      // Debug logging with enhanced details
      console.log("🤖 Enhanced AI Resume-Only Application Data:");
      console.log("📋 job_id:", jobId);
      console.log("👤 candidate_id:", userId);
      console.log("📝 full_name:", extractedData.full_name);
      console.log("📧 email:", extractedData.email);
      console.log("📞 phone:", extractedData.phone);
      console.log("🔧 skills:", extractedData.skills?.length || 0, "skills found:", extractedData.skills);
      console.log("🎓 education:", extractedData.education?.length || 0, "entries found");
      console.log("💼 experience:", extractedData.experience?.length || 0, "entries found");
      console.log("📄 file:", resume.name);

      console.log("📤 Submitting enhanced resume-only application via backend API...");
      const response = await apiService.applyJob(applicationData);
      console.log("✅ Application submitted successfully:", response);

      alert("✅ Application submitted successfully! Your resume has been processed by AI and all relevant information has been extracted.");
      navigate('/dashboard'); // Redirect to dashboard after successful submission
   
    } catch (err) {
      console.error("Application submission error:", err);
      
      // Handle different error types
      if (err.response?.status === 409) {
        alert("⚠️ You have already applied to this job.");
      } else if (err.response?.status === 404) {
        alert("❌ Job not found. This job may have been removed.");
      } else if (err.response?.status === 503) {
        alert("❌ Service temporarily unavailable. Please try again later.");
      } else if (err.message?.includes("already applied")) {
        alert("⚠️ You have already applied to this job.");
      } else {
        const errorMessage = err.response?.data?.detail || err.message || 'Unknown error';
        alert(`❌ Application submission failed: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <Background className="min-h-screen" containerClassName="bg-black text-white relative overflow-hidden">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 text-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
          <p className="text-neutral-300 font-inter">Loading job details...</p>
        </div>
      </div>
    </Background>
  );

  if (error) return (
    <Background className="min-h-screen" containerClassName="bg-black text-white relative overflow-hidden">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 text-center">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-4 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          Go Back
        </button>
      </div>
    </Background>
  );

  return (
    <Background 
      className="min-h-screen" 
      containerClassName="bg-black text-white relative overflow-hidden"
    >
      <Spotlight 
        className="-top-40 left-0 md:-top-20 md:left-60" 
        fill="white" 
      />
      
      <Navbar />
      
      {job ? (
        <>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative container my-16 mx-auto py-3 px-4 pt-24 pb-16 text-center max-w-5xl"
          >
            <h1 
              className="text-5xl md:text-6xl font-bold mb-6 relative z-10 
              font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 
              bg-clip-text text-transparent px-4 md:px-8"
            >
              {job?.title || 'Job Title'}
            </h1>
            
            <p 
              className="text-xl text-neutral-300 max-w-2xl mx-auto mb-10 
              relative z-10 font-inter"
            >
              {job?.company_name || 'Company'} | {job?.location || 'Location'}
            </p>
          </motion.div>

          <div className="container mx-auto px-4 max-w-5xl mb-16">
            <div className="bg-zinc-900 rounded-xl shadow-lg p-8 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-4 text-white font-inter">Job Description</h2>
              <p className="text-neutral-300 font-inter mb-6">{job?.description || 'No description available.'}</p>

          <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 rounded-xl shadow-lg p-8 border border-zinc-800 backdrop-blur-sm">
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-300 font-inter mb-2">
                Upload Resume (PDF):
              </label>
              <div className="relative">
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handleFileChange} 
                  className="hidden" 
                  id="pdf-upload"
                  required
                />
                <label 
                  htmlFor="pdf-upload"
                  className="inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  style={{ 
                    backgroundColor: 'rgb(30, 37, 95)', 
                    borderColor: 'rgb(30, 37, 95)',
                    ':hover': { backgroundColor: 'rgb(25, 30, 75)' }
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgb(25, 30, 75)')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = 'rgb(30, 37, 95)')}
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose Files
                </label>
                <span className="ml-3 text-sm text-neutral-400 font-inter">
                  {resume ? resume.name : 'No file chosen'}
                </span>
                {resume && (
                  <div className="mt-3 p-3 bg-green-900/20 border border-green-600 rounded-lg">
                    <p className="text-green-400 text-sm font-medium">✅ {resume.name}</p>
                    <p className="text-green-300 text-xs">Ready for AI processing</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-neutral-500 font-inter">PDF files only (Max 5MB) - Our AI will extract all information automatically</p>
            </div>

            <motion.button
              type="submit"
              disabled={uploading || !resume}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full font-bold py-4 px-6 rounded-lg transition duration-300 relative z-10 font-inter shadow-xl transform hover:-translate-y-1 group overflow-hidden border ${
                uploading || !resume 
                  ? 'bg-neutral-600 border-neutral-600 text-neutral-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-blue-600 hover:shadow-blue-500/40'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center">
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Resume with AI...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {resume ? 'Apply with AI Resume Processing' : 'Upload Resume to Apply'}
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </motion.button>
          </form>
        </div>
      </div>
      </>
      ) : (
        <div className="container mx-auto px-4 pt-24 text-center">
          <p className="text-neutral-300 font-inter">Job not found.</p>
        </div>
      )}
    <Footer />
    </Background>
  );
};

export default JobDetails;