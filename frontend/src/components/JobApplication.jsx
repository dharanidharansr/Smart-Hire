import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, UploadIcon, CheckIcon } from 'lucide-react';
import { apiService } from '../lib/api';
import Background from './Background';
import Footer from './Footer';

// Hardcoded jobs data
const MOCK_JOBS = [
  {
    id: 'job-1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp Inc.',
  },
  {
    id: 'job-2',
    title: 'Backend Developer',
    company: 'DataSystems LLC',
  },
  {
    id: 'job-3',
    title: 'Full Stack Engineer',
    company: 'Growth Startup',
  }
];

const JobApplication = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [job, setJob] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [applicationResult, setApplicationResult] = useState(null);
  const [parsedResume, setParsedResume] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
  });
  const [resume, setResume] = useState(null);
  const [resumeName, setResumeName] = useState('');

  useEffect(() => {
    const fetchJobAndUser = async () => {
      try {
        // Get current user from localStorage
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          navigate('/signin');
          return;
        }

        const userData = JSON.parse(storedUser);
        setUser(userData);

        // Prefill form data
        setFormData({
          fullName: `${userData.first_name} ${userData.last_name}` || '',
          email: userData.email || '',
          phone: userData.phone || '',
          coverLetter: '',
        });

        // Find job from mock data
        const foundJob = MOCK_JOBS.find(j => j.id === jobId);
        setJob(foundJob);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobAndUser();
  }, [jobId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Only accept PDF files for resume parsing
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file for automatic resume parsing');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setResume(file);
      setResumeName(file.name);
      setError(null); // Clear any previous errors
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resume) {
      setError('Please upload your resume.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create FormData for file upload with resume parsing
      const applicationData = new FormData();
      applicationData.append('job_id', jobId);
      applicationData.append('candidate_id', user.id);
      applicationData.append('cover_letter', formData.coverLetter || '');
      applicationData.append('resume_file', resume);

      console.log('🚀 Submitting job application with resume parsing...');
      console.log('📋 Job ID:', jobId);
      console.log('👤 Candidate ID:', user.id);
      console.log('📄 Resume file:', resume.name);

      // Submit application through new API endpoint with resume parsing
      const response = await apiService.applyForJob(applicationData);
      
      console.log('✅ Application submitted successfully:', response);
      
      setApplicationResult(response);
      setParsedResume(response.parsed_resume);
      setSuccess(true);

    } catch (error) {
      console.error('❌ Application submission error:', error);
      setError(error.response?.data?.detail || 'There was an error submitting your application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Background 
        className="min-h-screen" 
        containerClassName="bg-black text-white relative overflow-hidden"
      >
        <div className="flex justify-center items-center h-screen">
          <div className="text-blue-500 text-2xl font-inter">Loading application form...</div>
        </div>
      </Background>
    );
  }

  // Success view with parsed resume data
  if (success && applicationResult) {
    return (
      <Background 
        className="min-h-screen" 
        containerClassName="bg-black text-white relative overflow-hidden"
      >
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckIcon className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-green-400 mb-2 font-bricolage">Application Submitted Successfully!</h1>
              <p className="text-neutral-300 font-inter">Your application has been submitted and your resume has been automatically parsed using AI.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-800/50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-blue-400 mb-4 font-bricolage">Application Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-neutral-300 font-inter">
                    <span className="w-5 h-5 mr-3 bg-blue-500 rounded-full"></span>
                    <span>{job?.title}</span>
                  </div>
                  <div className="flex items-center text-neutral-300 font-inter">
                    <span className="w-5 h-5 mr-3 bg-blue-500 rounded-full"></span>
                    <span>{job?.company}</span>
                  </div>
                  <div className="flex items-center text-neutral-300 font-inter">
                    <span className="w-5 h-5 mr-3 bg-yellow-500 rounded-full"></span>
                    <span>Status: <span className="text-yellow-400 capitalize">{applicationResult.status}</span></span>
                  </div>
                  <div className="flex items-center text-neutral-300 font-inter">
                    <span className="w-5 h-5 mr-3 bg-green-500 rounded-full"></span>
                    <span>Applied: {new Date(applicationResult.application_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {parsedResume && !parsedResume.error && (
                <div className="bg-zinc-800/50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-purple-400 mb-4 font-bricolage">Resume Parsed Successfully</h3>
                  <div className="space-y-3">
                    {parsedResume.personal_information && (
                      <>
                        <div className="flex items-center text-neutral-300 font-inter">
                          <span className="w-5 h-5 mr-3 bg-purple-500 rounded-full"></span>
                          <span>{parsedResume.personal_information.name || 'Name extracted'}</span>
                        </div>
                        {parsedResume.personal_information.email && (
                          <div className="flex items-center text-neutral-300 font-inter">
                            <span className="w-5 h-5 mr-3 bg-purple-500 rounded-full"></span>
                            <span>{parsedResume.personal_information.email}</span>
                          </div>
                        )}
                      </>
                    )}
                    {parsedResume.ats_score && (
                      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-3 rounded font-inter">
                        <span className="text-purple-300 text-sm">ATS Score: </span>
                        <span className="text-white font-bold">{parsedResume.ats_score}/100</span>
                      </div>
                    )}
                    <p className="text-xs text-neutral-400 font-inter mt-2">
                      Skills, experience, and education have been automatically extracted and stored.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              <motion.button
                onClick={() => navigate('/candidate/profile')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium font-inter"
              >
                View My Applications
              </motion.button>
              <motion.button
                onClick={() => navigate('/dashboard')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg font-medium font-inter"
              >
                Back to Dashboard
              </motion.button>
            </div>
          </motion.div>
        </div>
        <Footer />
      </Background>
    );
  }

  if (!job) {
    return (
      <Background 
        className="min-h-screen" 
        containerClassName="bg-black text-white relative overflow-hidden"
      >
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-2xl mb-4 text-white font-inter">Job not found</div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-md text-white font-inter"
          >
            Return to Dashboard
          </button>
        </div>
      </Background>
    );
  }

  return (
    <Background 
      className="min-h-screen" 
      containerClassName="bg-black text-white relative overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-8"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(`/job/${jobId}`)}
          className="flex items-center text-neutral-400 hover:text-white mb-6 font-inter"
        >
          <ChevronLeftIcon size={20} className="mr-1" />
          <span>Back to Job Details</span>
        </motion.button>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-zinc-900 rounded-xl shadow-lg p-8 border border-zinc-800"
        >
          <h1 className="text-2xl font-bold mb-2 font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">Apply for Position</h1>
          <p className="text-blue-400 font-inter mb-6">{job.title} at {job.company}</p>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-start"
            >
              <div className="w-6 h-6 text-red-500 mr-3 flex-shrink-0">⚠️</div>
              <div>
                <p className="text-red-300 font-medium">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name, Email, Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Full Name*</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="input-field"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Email Address*</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-field"/>
              </div>
            </div>

            {/* Resume Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Upload Resume*</label>
              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".pdf" 
                  className="hidden" 
                  id="resume-upload"
                />
                <label 
                  htmlFor="resume-upload"
                  className={`inline-flex items-center px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    resume
                      ? 'border-green-500 bg-green-900/20'
                      : 'border-zinc-600 bg-zinc-800/50 hover:border-blue-500'
                  } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-neutral-200 font-medium">
                    {resume ? resumeName : 'Choose PDF file'}
                  </span>
                </label>
              </div>
              <p className="mt-2 text-xs text-neutral-500 font-inter">
                PDF files only (Max 5MB). Your resume will be automatically parsed using AI to extract skills, experience, and education.
              </p>
              {resume && (
                <div className="mt-2 text-xs text-green-400 font-inter">
                  ✅ Resume ready for AI parsing: {resumeName}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button 
                type="submit" 
                disabled={submitting || !resume} 
                className={`px-8 py-3 rounded-md font-medium font-inter transition flex items-center ${
                  submitting || !resume
                    ? 'bg-zinc-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting & Parsing Resume...
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-5 h-5 mr-2" />
                    Submit Application with AI Parsing
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
    <Footer />
    </Background>
  );
};

export default JobApplication;
