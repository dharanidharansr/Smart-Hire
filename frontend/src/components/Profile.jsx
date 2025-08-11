import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EditIcon, SaveIcon, XIcon, PhoneIcon, MailIcon, MapPinIcon, BriefcaseIcon } from 'lucide-react';
import Background from './Background';
import Footer from './Footer';
import { apiService } from '../lib/api';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    skills: '',
    phone: '',
    address: '',
    bio: '',
    // HR-specific fields
    company_name: '',
    company_website: '',
    company_address: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!userData.id) {
          navigate('/signin');
          return;
        }

        // Set basic user data first
        setProfile(userData);

        // Try to fetch profile data from API based on user role
        try {
          console.log('🔄 Fetching profile for user:', userData);
          let profileData = null;
          
          if (userData.role === 'hr_user' || userData.role === 'hr') {
            // Fetch HR profile
            console.log('👔 Fetching HR profile...');
            profileData = await apiService.getHRProfile(userData.id);
          } else if (userData.role === 'candidate_user' || userData.role === 'candidate') {
            // Fetch candidate profile
            console.log('👤 Fetching candidate profile...');
            profileData = await apiService.getCandidateProfile(userData.id);
          }

          console.log('📋 Profile data received:', profileData);

          if (profileData) {
            // Merge user data with profile data, handling null values properly
            const processedProfileData = {
              ...profileData,
              full_name: profileData.full_name || userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || '',
              skills: profileData.skills || '',
              phone: profileData.phone || userData.phone || '',
              address: profileData.address || '',
              bio: profileData.bio || '',
              company_name: profileData.company_name || '',
              company_website: profileData.company_website || '',
              company_address: profileData.company_address || '',
            };
            
            const combinedProfile = { ...userData, ...processedProfileData };
            setProfile(combinedProfile);
            console.log('✅ Profile merged with processed data:', combinedProfile);
            
            setFormData({
              full_name: processedProfileData.full_name,
              skills: processedProfileData.skills,
              phone: processedProfileData.phone,
              address: processedProfileData.address,
              bio: processedProfileData.bio,
              // HR-specific fields
              company_name: processedProfileData.company_name,
              company_website: processedProfileData.company_website,
              company_address: processedProfileData.company_address,
            });
            console.log('📝 Form data set from profile:', {
              full_name: profileData.full_name || userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
              skills: profileData.skills,
              phone: profileData.phone || userData.phone,
              address: profileData.address,
              bio: profileData.bio,
            });
          } else {
            console.log('❌ No profile found, using user data only');
            // No profile found, initialize with user data
            const userFullName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || '';
            setFormData({
              full_name: userFullName,
              skills: '',
              phone: userData.phone || '',
              address: '',
              bio: '',
              // HR-specific fields
              company_name: '',
              company_website: '',
              company_address: '',
            });
          }
        } catch (profileError) {
          // Profile doesn't exist yet or API error, that's okay
          console.log('❌ Profile fetch error:', profileError);
          console.log('📊 Error status:', profileError.response?.status);
          console.log('🔍 Error details:', profileError.response?.data);
          
          const userFullName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || '';
          setFormData({
            full_name: userFullName,
            skills: '',
            phone: userData.phone || '',
            address: '',
            bio: '',
            // HR-specific fields
            company_name: '',
            company_website: '',
            company_address: '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        navigate('/signin');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 FORM SUBMITTED!'); // Very visible debug log
    console.log('Form data:', formData); // Debug log
    console.log('Profile data:', profile); // Debug log
    
    setSaving(true);
    
    try {
      console.log('Profile data:', profile); // Debug log
      
      const profileData = {
        user_id: userData.id,
        full_name: formData.full_name,
        skills: formData.skills,
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio,
      };

      console.log('Sending profile data:', profileData); // Debug log

      let updatedProfile = null;

      if (profile.role === 'hr_user' || profile.role === 'hr') {
        // For HR users, add company fields
        const hrProfileData = {
          ...profileData,
          company_name: formData.company_name || '',
          company_website: formData.company_website || '',
          company_address: formData.company_address || formData.address,
        };
        
        console.log('HR Profile Data:', hrProfileData); // Debug log
        
        try {
          // Try to update first
          console.log('Attempting to update HR profile...'); // Debug log
          updatedProfile = await apiService.updateHRProfile(userData.id, hrProfileData);
        } catch (updateError) {
          console.log('Update failed, trying to create:', updateError); // Debug log
          if (updateError.response?.status === 404) {
            // Profile doesn't exist, create it
            console.log('Creating new HR profile...'); // Debug log
            updatedProfile = await apiService.createHRProfile(hrProfileData);
          } else {
            throw updateError;
          }
        }
      } else if (profile.role === 'candidate_user' || profile.role === 'candidate') {
        console.log('📋 Candidate Profile Data:', profileData); // Debug log
        
        try {
          // Try to update first
          console.log('🔄 Attempting to update candidate profile...'); // Debug log
          console.log('🆔 User ID:', userData.id); // Debug log
          console.log('📦 Profile Data to send:', JSON.stringify(profileData, null, 2)); // Debug log
          
          updatedProfile = await apiService.updateCandidateProfile(userData.id, profileData);
          console.log('✅ Update successful:', updatedProfile); // Debug log
        } catch (updateError) {
          console.log('❌ Update failed, trying to create:', updateError); // Debug log
          console.log('🔍 Error details:', updateError.response?.data); // Debug log
          console.log('📊 Error status:', updateError.response?.status); // Debug log
          console.log('🌐 Error config:', updateError.config); // Debug log
          
          if (updateError.response?.status === 404) {
            // Profile doesn't exist, create it
            console.log('➕ Creating new candidate profile...'); // Debug log
            try {
              updatedProfile = await apiService.createCandidateProfile(profileData);
              console.log('✅ Create successful:', updatedProfile); // Debug log
            } catch (createError) {
              console.log('❌ Create also failed:', createError); // Debug log
              console.log('🔍 Create error details:', createError.response?.data); // Debug log
              throw createError;
            }
          } else {
            console.error('❌ Unexpected error:', updateError); // Debug log
            throw updateError;
          }
        }
      }

      console.log('Updated profile result:', updatedProfile); // Debug log

      if (updatedProfile) {
        // Process the updated profile data to handle null values
        const processedUpdatedProfile = {
          ...updatedProfile,
          full_name: updatedProfile.full_name || formData.full_name,
          skills: updatedProfile.skills || formData.skills,
          phone: updatedProfile.phone || formData.phone,
          address: updatedProfile.address || formData.address,
          bio: updatedProfile.bio || formData.bio,
          company_name: updatedProfile.company_name || formData.company_name || '',
          company_website: updatedProfile.company_website || formData.company_website || '',
          company_address: updatedProfile.company_address || formData.company_address || '',
        };
        
        // Update local state with the processed profile
        const combinedProfile = { ...profile, ...processedUpdatedProfile };
        setProfile(combinedProfile);
        console.log('✅ Profile state updated after save with processed data:', combinedProfile);
        
        // Also update localStorage as backup
        localStorage.setItem('profile', JSON.stringify(processedUpdatedProfile));
        
        setIsEditing(false);
        setSaveSuccess(true);
        console.log('Profile updated successfully:', updatedProfile);
        
        // Hide success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error('No updated profile returned');
        // Fallback: save to localStorage if API doesn't work
        const fallbackProfile = { ...profile, ...formData };
        setProfile(fallbackProfile);
        console.log('💾 Fallback profile state:', fallbackProfile);
        localStorage.setItem('profile', JSON.stringify(fallbackProfile));
        setIsEditing(false);
        setSaveSuccess(true);
        console.log('Profile saved to localStorage as fallback');
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update profile';
      alert(`Error updating profile: ${errorMessage}`);
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
          <div className="text-blue-500 text-2xl font-inter">Loading profile...</div>
        </div>
      </Background>
    );
  }

  if (!profile) {
    return null;
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
        {/* Success Message */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-4"
          >
            <div className="bg-green-600/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg">
              ✅ Profile updated successfully!
            </div>
          </motion.div>
        )}
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800"
        >
          {!isEditing ? (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">User Profile</h1>
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
                    {(profile.full_name && profile.full_name[0]?.toUpperCase()) ||
                     (profile.first_name && profile.first_name[0]?.toUpperCase()) ||
                     (profile.email && profile.email[0]?.toUpperCase()) ||
                     '?'}
                  </div>
                </div>

                <div className="flex-grow">
                  <h2 className="text-2xl font-bold font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent mb-2">
                    {profile.full_name || 
                     (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : '') ||
                     'No Name Set'}
                  </h2>
                  <p className="text-blue-400 mb-6 font-inter">
                    {profile.title || 'No Title Set'}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center text-neutral-300 font-inter">
                      <MailIcon size={18} className="mr-3 text-gray-400" />
                      <span>{profile.email}</span>
                    </div>

                    <div className="flex items-center text-neutral-300 font-inter">
                      <PhoneIcon size={18} className="mr-3 text-gray-400" />
                      <span>{profile.phone || 'No phone number'}</span>
                    </div>

                    <div className="flex items-center text-neutral-300 font-inter">
                      <MapPinIcon size={18} className="mr-3 text-gray-400" />
                      <span>{profile.address || 'No address'}</span>
                    </div>

                    <div className="flex items-center text-neutral-300 font-inter">
                      <BriefcaseIcon size={18} className="mr-3 text-gray-400" />
                      <span>{profile.title || 'No job title'}</span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-3 font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">Bio</h3>
                    <div className="bg-zinc-800 p-4 rounded-md text-neutral-300 font-inter">
                      {profile.bio || 'No bio information.'}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-3 font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">Skills</h3>
                    <div className="bg-zinc-800 p-4 rounded-md text-neutral-300 font-inter">
                      {profile.skills || 'No skills listed.'}
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

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                      placeholder="e.g. JavaScript, Python, React"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Phone Number</label>
                    <input
                      type="tel"
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
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-300 font-inter mb-1">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={5}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: saving ? 1 : 1.05 }}
                    whileTap={{ scale: saving ? 1 : 0.95 }}
                    type="submit"
                    disabled={saving}
                    className={`py-2 px-6 rounded-md text-white font-medium transition-colors ${
                      saving 
                        ? 'bg-blue-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <SaveIcon size={16} className="inline-block mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
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

export default Profile;