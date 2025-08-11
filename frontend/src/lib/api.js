import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens or other headers
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.log('Authentication failed - clearing stored auth data');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Only redirect if not already on signin page
      if (window.location.pathname !== '/signin') {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  return !!(token && user);
};

// Helper function to get current user
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Helper function to clear authentication
export const clearAuth = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

// API endpoints
export const apiEndpoints = {
  // Authentication
  signUp: '/auth/signup',
  signIn: '/auth/signin',
  getUser: '/auth/user',
  
  // Resume parsing
  parseResume: '/parse-resume/',
  sendData: '/send-data',
  enhancedResumeProcessing: '/enhanced-resume-processing',
  
  // Candidate analysis
  analyzeCandidate: '/analyze-candidate',
  
  // Job management
  getJobsByHR: (userId) => `/api/jobs/hr/${userId}`,
  getJobById: (jobId) => `/api/jobs/${jobId}`,
  createJob: '/api/jobs',
  updateJob: (jobId) => `/api/jobs/${jobId}`,
  deleteJob: (jobId) => `/api/jobs/${jobId}`,
  getJob: (jobId) => `/api/jobs/${jobId}`,
  
  // Job Applications
  applyForJob: '/api/job-applications',
  getCandidateApplications: (candidateId) => `/api/candidate-applications/${candidateId}`,
  getJobApplications: (jobId) => `/api/job-applications/${jobId}`,
  
  // Resume matching
  processAndMatchResumes: '/process-and-match-resumes',
  
  // User roles
  getUserRoles: (userId) => `/api/user-roles/${userId}`,
  
  // Profile management
  getHRProfile: (userId) => `/api/hr-profiles/${userId}`,
  createHRProfile: '/api/hr-profiles',
  updateHRProfile: (userId) => `/api/hr-profiles/${userId}`,
  deleteHRProfile: (userId) => `/api/hr-profiles/${userId}`,
  
  getCandidateProfile: (userId) => `/api/candidate-profiles/${userId}`,
  createCandidateProfile: '/api/candidate-profiles',
  updateCandidateProfile: (userId) => `/api/candidate-profiles/${userId}`,
  deleteCandidateProfile: (userId) => `/api/candidate-profiles/${userId}`,
  
  // Generic API
  getTableData: (tableName) => `/api/${tableName}`,
  createTableData: (tableName) => `/api/${tableName}`,
  
  // Health check
  health: '/health',
  
  // Email
  sendConfirmationEmail: '/send-confirmation-email',
};

// API service functions
export const apiService = {
  // Authentication
  async signUp(userData) {
    const response = await api.post(apiEndpoints.signUp, userData);
    return response.data;
  },

  async signIn(credentials) {
    const response = await api.post(apiEndpoints.signIn, credentials);
    return response.data;
  },

  async getUser() {
    const response = await api.get(apiEndpoints.getUser);
    return response.data;
  },

  // Resume parsing
  async parseResume(formData) {
    const response = await api.post(apiEndpoints.parseResume, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async sendData(formData) {
    const response = await api.post(apiEndpoints.sendData, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async enhancedResumeProcessing(formData) {
    const response = await api.post(apiEndpoints.enhancedResumeProcessing, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Candidate analysis
  async analyzeCandidate(candidateData) {
    const response = await api.post(apiEndpoints.analyzeCandidate, candidateData);
    return response.data;
  },

  // Job management
  async getJobsByHR(userId) {
    console.log('API: Getting jobs for HR user:', userId);
    const response = await api.get(apiEndpoints.getJobsByHR(userId));
    console.log('API: Jobs response:', response.data);
    return response.data;
  },

  async getJobById(jobId) {
    console.log('🌐 API: getJobById called for:', jobId);
    const response = await api.get(apiEndpoints.getJobById(jobId));
    console.log('📋 Job data:', response.data);
    return response.data;
  },

  async createJob(jobData) {
    console.log('API: Creating job:', jobData);
    const response = await api.post(apiEndpoints.createJob, jobData);
    console.log('API: Create job response:', response.data);
    return response.data;
  },

  async updateJob(jobId, jobData) {
    console.log('API: Updating job:', jobId, jobData);
    const response = await api.put(apiEndpoints.updateJob(jobId), jobData);
    console.log('API: Update job response:', response.data);
    return response.data;
  },

  async deleteJob(jobId) {
    console.log('API: Deleting job:', jobId);
    const response = await api.delete(apiEndpoints.deleteJob(jobId));
    console.log('API: Delete job response:', response.data);
    return response.data;
  },

  async getJob(jobId) {
    console.log('API: Getting job:', jobId);
    const response = await api.get(apiEndpoints.getJob(jobId));
    console.log('API: Get job response:', response.data);
    return response.data;
  },

  // Job applications
  async applyJob(applicationData) {
    const response = await api.post(apiEndpoints.applyForJob, applicationData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getJobApplications(jobId) {
    const response = await api.get(apiEndpoints.getJobApplications(jobId));
    return response.data;
  },

  // Resume matching
  async processAndMatchResumes() {
    const response = await api.get(apiEndpoints.processAndMatchResumes);
    return response.data;
  },

  // User roles
  async getUserRoles(userId) {
    const response = await api.get(apiEndpoints.getUserRoles(userId));
    return response.data;
  },

  // Profile management
  async getHRProfile(userId) {
    const response = await api.get(apiEndpoints.getHRProfile(userId));
    return response.data;
  },

  async createHRProfile(profileData) {
    const response = await api.post(apiEndpoints.createHRProfile, profileData);
    return response.data;
  },

  async updateHRProfile(userId, profileData) {
    const response = await api.put(apiEndpoints.updateHRProfile(userId), profileData);
    return response.data;
  },

  async deleteHRProfile(userId) {
    const response = await api.delete(apiEndpoints.deleteHRProfile(userId));
    return response.data;
  },

  async getCandidateProfile(userId) {
    const response = await api.get(apiEndpoints.getCandidateProfile(userId));
    return response.data;
  },

  async createCandidateProfile(profileData) {
    console.log('🌐 API: createCandidateProfile called');
    console.log('📦 Profile Data:', profileData);
    console.log('🔗 URL:', apiEndpoints.createCandidateProfile);
    
    const response = await api.post(apiEndpoints.createCandidateProfile, profileData);
    console.log('📈 API Response:', response);
    console.log('📋 Response Data:', response.data);
    return response.data;
  },

  async updateCandidateProfile(userId, profileData) {
    console.log('🌐 API: updateCandidateProfile called');
    console.log('🆔 User ID:', userId);
    console.log('📦 Profile Data:', profileData);
    console.log('🔗 URL:', apiEndpoints.updateCandidateProfile(userId));
    
    const response = await api.put(apiEndpoints.updateCandidateProfile(userId), profileData);
    console.log('📈 API Response:', response);
    console.log('📋 Response Data:', response.data);
    return response.data;
  },

  async deleteCandidateProfile(userId) {
    const response = await api.delete(apiEndpoints.deleteCandidateProfile(userId));
    return response.data;
  },

  // Generic API
  async getTableData(tableName) {
    const response = await api.get(apiEndpoints.getTableData(tableName));
    return response.data;
  },

  async createTableData(tableName, data) {
    const response = await api.post(apiEndpoints.createTableData(tableName), data);
    return response.data;
  },

  // Health check
  async healthCheck() {
    const response = await api.get(apiEndpoints.health);
    return response.data;
  },

  // Email
  async sendConfirmationEmail(emailData) {
    const response = await api.post(apiEndpoints.sendConfirmationEmail, emailData);
    return response.data;
  },

  // Job Applications
  async applyForJob(formData) {
    console.log('🌐 API: applyForJob called');
    console.log('📦 Form Data contents:', Object.fromEntries(formData.entries()));
    
    const response = await api.post(apiEndpoints.applyForJob, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('📈 API Response:', response);
    return response.data;
  },

  async getCandidateApplications(candidateId) {
    console.log('🌐 API: getCandidateApplications called for:', candidateId);
    const response = await api.get(apiEndpoints.getCandidateApplications(candidateId));
    console.log('📋 Response Data:', response.data);
    return response.data;
  },

  async getJobApplications(jobId) {
    console.log('🌐 API: getJobApplications called for job:', jobId);
    const response = await api.get(apiEndpoints.getJobApplications(jobId));
    console.log('📋 Response Data:', response.data);
    return response.data;
  },
};

export default api;
