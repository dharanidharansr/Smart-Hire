import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { candidateProfileAPI } from '../../lib/candidateProfileAPI';
import { 
  UserIcon, 
  MapPinIcon, 
  PhoneIcon, 
  MailIcon, 
  EditIcon, 
  SaveIcon, 
  XIcon,
  CodeIcon
} from 'lucide-react';
import Background from '../../components/Background';
import Footer from '../../components/Footer';

const CandidateProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    skills: '',
    phone: '',
    address: '',
    bio: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get current user from localStorage
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          navigate('/signin');
          return;
        }

        const userData = JSON.parse(storedUser);
        
        // Check if user is candidate
        if (userData.role !== 'candidate_user') {
          navigate('/dashboard');
          return;
        }

        setProfile(userData);

        // Try to fetch candidate profile from API
        try {
          const candidateProfileData = await candidateProfileAPI.getProfile(userData.id || userData.email);
          if (candidateProfileData) {
            setCandidateProfile(candidateProfileData);
            setFormData({
              full_name: candidateProfileData.full_name || '',
              skills: candidateProfileData.skills || '',
              phone: candidateProfileData.phone || '',
              address: candidateProfileData.address || '',
              bio: candidateProfileData.bio || '',
            });
          } else {
            // No candidate profile exists, set default form data
            setFormData({
              full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
              skills: userData.skills || '',
              phone: userData.phone || '',
              address: userData.address || '',
              bio: userData.bio || '',
            });
          }
        } catch (error) {
          console.error('Error fetching candidate profile:', error);
          // Fall back to localStorage data
          setFormData({
            full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
            skills: userData.skills || '',
            phone: userData.phone || '',
            address: userData.address || '',
            bio: userData.bio || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const userId = profile.id || profile.email;
      
      if (candidateProfile) {
        // Update existing profile
        const updatedProfile = await candidateProfileAPI.updateProfile(userId, formData);
        setCandidateProfile(updatedProfile);
        alert('Profile updated successfully');
      } else {
        // Create new profile
        const newProfile = await candidateProfileAPI.createProfile({
          user_id: userId,
          ...formData
        });
        setCandidateProfile(newProfile);
        alert('Profile created successfully');
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(`Error saving profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Background className="min-h-screen" containerClassName="bg-black text-white relative overflow-hidden">
        <div className="flex justify-center items-center h-screen">
          <div className="text-blue-500 text-2xl">Loading profile...</div>
        </div>
      </Background>
    );
  }

  if (!profile) {
    return (
      <Background className="min-h-screen" containerClassName="bg-black text-white relative overflow-hidden">
        <div className="flex justify-center items-center h-screen">
          <div className="text-red-500 text-2xl">Profile not found or not loaded.</div>
        </div>
      </Background>
    );
  }

  return (
    <Background className="min-h-screen" containerClassName="bg-black text-white relative overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
            {!isEditing ? (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">Candidate Profile</h1>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-md flex items-center space-x-2 text-sm font-medium transition-colors"
                  >
                    <EditIcon size={16} />
                    <span>Edit Profile</span>
                  </motion.button>
                </div>

                <div className="flex flex-col md:flex-row">
                  <div className="mb-6 md:mb-0 md:mr-8 flex-shrink-0">
                    <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-4xl font-bold">
                      {(candidateProfile?.full_name || profile.full_name) ? 
                        (candidateProfile?.full_name || profile.full_name)[0].toUpperCase() : 
                        profile.email[0].toUpperCase()}
                    </div>
                  </div>

                  <div className="flex-grow">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {candidateProfile?.full_name || profile.full_name || profile.name || 'No Name Set'}
                    </h2>
                    <p className="text-blue-400 mb-4">Candidate</p>
                    
                    <h3 className="text-xl font-semibold mb-3">Skills</h3>
                    <div className="mb-6">
                      <div className="flex items-start text-neutral-300 font-inter">
                        <CodeIcon size={18} className="mr-3 text-neutral-400 mt-1" />
                        <div>
                          <p className="text-neutral-500 text-sm">Technical Skills</p>
                          <p>{candidateProfile?.skills || 'No skills listed'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center text-neutral-300 font-inter">
                        <MailIcon size={18} className="mr-3 text-neutral-400" />
                        <span>{profile.email}</span>
                      </div>

                      <div className="flex items-center text-neutral-300 font-inter">
                        <PhoneIcon size={18} className="mr-3 text-neutral-400" />
                        <span>{candidateProfile?.phone || profile.phone || 'No phone number'}</span>
                      </div>

                      <div className="flex items-start text-neutral-300 font-inter md:col-span-2">
                        <MapPinIcon size={18} className="mr-3 text-neutral-400 mt-1" />
                        <div>
                          <p className="text-neutral-500 text-sm">Address</p>
                          <p>{candidateProfile?.address || 'No address provided'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-xl font-semibold mb-3">About</h3>
                      <div className="bg-zinc-800 p-4 rounded-md text-neutral-300 font-inter">
                        {candidateProfile?.bio || 'No bio information.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">Edit Profile</h1>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(false)}
                    className="bg-zinc-700 hover:bg-zinc-600 py-2 px-4 rounded-md flex items-center space-x-2 text-sm font-medium transition-colors"
                  >
                    <XIcon size={16} />
                    <span>Cancel</span>
                  </motion.button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Full Name</label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Skills</label>
                      <input
                        type="text"
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="java, python, react, etc."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Phone Number</label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={5}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell us about yourself, your experience, and goals..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <motion.button
                      whileHover={{ scale: saving ? 1 : 1.05 }}
                      whileTap={{ scale: saving ? 1 : 0.95 }}
                      type="submit"
                      disabled={saving}
                      className={`py-2 px-6 rounded-md flex items-center space-x-2 text-sm font-medium transition-colors ${
                        saving 
                          ? 'bg-gray-600 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <SaveIcon size={16} />
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </motion.button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
      <Footer />
    </Background>
  );
};

export default CandidateProfile; 