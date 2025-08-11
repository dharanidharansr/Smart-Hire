import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { LogOut, User } from "lucide-react";

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  // Check for user authentication on component mount and when localStorage changes
  useEffect(() => {
    const checkUserAuth = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    // Check on mount
    checkUserAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        checkUserAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Logout function
  const handleLogout = () => {
    // Clear all user-related data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    setUser(null);
    navigate('/');
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return '';
    
    // Handle different user object structures
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.name) {
      return user.name;
    } else if (user.full_name) {
      return user.full_name;
    } else if (user.email) {
      return user.email;
    }
    return 'User';
  };

  // Get user type for display
  const getUserType = () => {
    if (!user) return '';
    
    if (user.user_type) {
      return user.user_type.toLowerCase() === 'hr' ? 'HR' : 'Candidate';
    } else if (user.role) {
      return user.role;
    }
    return '';
  };

  // Check if current page is the landing page
  const isLandingPage = location.pathname === '/';

  return (
    <>
    <nav className="absolute top-0 left-0 right-0 z-20 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center max-w-4xl">
        <div className="text-2xl font-bold text-white font-bricolage">
          ScreenSmart
        </div>

        <div className="flex items-center space-x-4">
          {user && !isLandingPage ? (
            // Show user info and logout button when logged in and not on landing page
            <>
              <div className="flex items-center space-x-2 text-white cursor-pointer" onClick={() => {
                if (user?.role === 'hr_user') {
                  navigate('/hr/profile');
                } else if (user?.role === 'candidate_user') {
                  navigate('/candidate/profile');
                } else {
                  navigate('/profile');
                }
              }}>
                <User className="w-5 h-5" />
                <div className="flex flex-col">
                  <span className="font-inter text-sm font-medium">
                    {getUserDisplayName()}
                  </span>
                  {getUserType() && (
                    <span className="font-inter text-xs text-neutral-400">
                      {getUserType()}
                    </span>
                  )}
                </div>
              </div>
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-red-600/50 to-red-500/50 text-white 
                    px-4 py-2 rounded-full 
                    transition duration-300 font-inter
                    border border-red-700/50 hover:border-red-500/80
                    hover:shadow-md hover:shadow-red-600/30
                    flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="relative z-10">Logout</span>
              </motion.button>
            </>
          ) : isLandingPage ? (
            // Show get started button only on landing page
            <motion.button
              onClick={() => navigate("/signin")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-indigo-600/50 to-indigo-500/50 text-white 
                  px-6 py-3 rounded-full 
                  transition duration-300 font-inter
                  border border-indigo-700/50 hover:border-indigo-500/80
                  hover:shadow-md hover:shadow-indigo-600/30"
            >
              <span className="relative z-10">Get Started</span>
            </motion.button>
          ) : null}
        </div>
      </div>
    </nav>
    </>
  );
};

export default NavBar;