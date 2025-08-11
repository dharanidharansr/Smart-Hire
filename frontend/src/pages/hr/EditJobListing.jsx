import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../../lib/api';
import { ChevronLeftIcon, SaveIcon } from 'lucide-react';
import Background from '../../components/Background';
import Footer from '../../components/Footer';

const EditJobListing = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    job_type: 'full_time',
    salary: '',
    description: '',
    requirements: '',
    benefits: '',
    status: 'active'
  });

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        // Get current user from localStorage
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          navigate('/signin');
          return;
        }

        const userData = JSON.parse(storedUser);
        
        if (userData.role !== 'hr_user') {
          navigate('/dashboard');
          return;
        }

        // Fetch job data
        const jobData = await apiService.getJob(jobId);
        
        // Make sure the HR user owns this job listing
        if (jobData.created_by !== userData.id) {
          alert('You do not have permission to edit this job listing.');
          navigate('/hr/dashboard');
          return;
        }
        
        setJob(jobData);
        setFormData({
          title: jobData.title || '',
          company: jobData.company || '',
          location: jobData.location || '',
          job_type: jobData.job_type || 'full_time',
          salary: jobData.salary || '',
          description: jobData.description || '',
          requirements: jobData.requirements || '',
          benefits: jobData.benefits || '',
          status: jobData.status || 'active'
        });
      } catch (error) {
        console.error('Error fetching job data:', error);
        
        // Handle authentication errors
        if (error.response?.status === 401) {
          alert('Your session has expired. Please sign in again.');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          navigate('/signin');
          return;
        }
        
        // Handle other errors
        const errorMessage = error.response?.data?.detail || error.message || 'Error loading job data.';
        alert(errorMessage);
        navigate('/hr/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchJobData();
  }, [jobId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      await apiService.updateJob(jobId, updates);

      alert('Job listing updated successfully!');
      navigate('/hr/dashboard');
    } catch (error) {
      console.error('Error updating job:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        alert('Your session has expired. Please sign in again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/signin');
        return;
      }
      
      // Handle other errors
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update job listing.';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Background 
        className="min-h-screen" 
        containerClassName="bg-black text-white relative overflow-hidden"
      >
        <div className="flex justify-center items-center h-screen">
          <div className="text-blue-500 text-2xl">Loading job data...</div>
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
        <div className="flex items-center mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/hr/dashboard')}
            className="flex items-center text-neutral-400 hover:text-white transition-colors font-inter"
          >
            <ChevronLeftIcon size={20} className="mr-1" />
            <span>Back to Dashboard</span>
          </motion.button>
        </div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-zinc-900 rounded-xl p-8 border border-zinc-800"
        >
          <h1 className="text-2xl font-bold mb-6">Edit Job Listing</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-blue-400">Basic Information</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Job Title*</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Company*</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Location*</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    placeholder="City, State or Remote"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Job Type*</label>
                  <select
                    name="job_type"
                    value={formData.job_type}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Salary Range</label>
                  <input
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="e.g. $50,000 - $70,000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status*</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Job Details */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-blue-400">Job Details</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Description*</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Use line breaks to separate paragraphs.</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Requirements*</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Put each requirement on a new line for better formatting.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Benefits</label>
                <textarea
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Put each benefit on a new line for better formatting.</p>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={saving}
                className={`flex items-center space-x-2 px-6 py-3 rounded-md ${
                  saving ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                <SaveIcon size={18} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
    <Footer />
    </Background>
  );
};

export default EditJobListing;