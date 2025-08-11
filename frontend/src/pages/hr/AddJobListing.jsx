import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../../lib/api';
import { ChevronLeftIcon, SaveIcon } from 'lucide-react';
import Background from '../../components/Background';
import Footer from '../../components/Footer';

const AddJobListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
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
    const checkUser = async () => {
      try {
        // Get current user from localStorage
        const storedUser = localStorage.getItem('user');
        console.log('Stored user:', storedUser);
        
        if (!storedUser) {
          console.log('No user found, redirecting to signin');
          navigate('/signin');
          return;
        }

        const userData = JSON.parse(storedUser);
        console.log('User data:', userData);
        
        if (userData.role !== 'hr_user') {
          console.log('User is not HR, redirecting to dashboard');
          navigate('/dashboard');
          return;
        }
        
        // Set the user and pre-fill company name
        setUser(userData);
        setFormData(prev => ({ 
          ...prev, 
          company: userData.company_name || ''
        }));
        
        console.log('User set successfully:', userData);
        
      } catch (error) {
        console.error('Error checking user:', error);
        navigate('/signin');
      }
    };

    checkUser();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Transform formData to match backend expectations
      const newJob = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(req => req.trim() !== ''),
        location: formData.location,
        salary_range: formData.salary || null,
        employment_type: formData.job_type,
        company_name: formData.company || null
      };

      const createdJob = await apiService.createJob(newJob);
      console.log('Job created:', createdJob);

      alert('Job listing created successfully!');
      navigate('/hr/dashboard');
    } catch (error) {
      console.error('Error creating job:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        alert('Your session has expired. Please sign in again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/signin');
        return;
      }
      
      // Handle other errors
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create job listing.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold mb-6">Create New Job Listing</h1>
          
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
                  <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Location*</label>
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
                  <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Job Type*</label>
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
                  <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Salary Range</label>
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
                  <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Status*</label>
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
                <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Description*</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Provide a detailed description of the job role, responsibilities, and expectations..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-neutral-500 font-inter mt-1">Use line breaks to separate paragraphs.</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Requirements*</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="List the skills, qualifications, and experience required..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-neutral-500 font-inter mt-1">Put each requirement on a new line for better formatting.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Benefits</label>
                <textarea
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleChange}
                  rows={4}
                  placeholder="List the benefits, perks, and other advantages..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-neutral-500 font-inter mt-1">Put each benefit on a new line for better formatting.</p>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className={`flex items-center space-x-2 px-6 py-3 rounded-md ${
                  loading ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                <SaveIcon size={18} />
                <span>{loading ? 'Creating...' : 'Create Job Listing'}</span>
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

export default AddJobListing;