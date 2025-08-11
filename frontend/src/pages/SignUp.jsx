import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiService } from "../lib/api";
import { useNavigate } from "react-router-dom";
import Background from "../components/Background";
import Footer from "../components/Footer";

function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userType, setUserType] = useState("candidate");
  const [companyId, setCompanyId] = useState(""); 
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
  
    try {
      if (!userType) {
        throw new Error("Please select a user type.");
      }
  
      // Prepare signup data
      const signupData = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role: userType
      };

      // Add company_id for HR users
      if (userType === "hr_user") {
        if (!companyId) {
          throw new Error("Company ID is required for HR users");
        }
        signupData.company_id = companyId;
      }
  
      // Sign up user through backend API
      const response = await apiService.signUp(signupData);
  
      console.log("User created:", response.user);

      // Store auth token if provided
      if (response.access_token) {
        localStorage.setItem('authToken', response.access_token);
      }

      // Store user data
      localStorage.setItem('user', JSON.stringify(response.user));
  
      setSuccessMessage(
        "Account created successfully! Welcome to ScreenSmart!"
      );

      // Navigate based on user type
      setTimeout(() => {
        navigate(userType === "hr_user" ? "/hr/dashboard" : "/dashboard");
      }, 1500);
      
    } catch (error) {
      console.error("Signup error:", error);
      setError(error.response?.data?.detail || error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };
  
    
  return (
    <Background 
      className="min-h-screen" 
      containerClassName="bg-black text-white relative overflow-hidden"
    >
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-zinc-900 rounded-xl shadow-lg p-8 border border-zinc-800"
          >
        <h2 className="text-3xl font-bold mb-6 text-center font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
          Sign Up for CareerCraft
        </h2>

        {/* User Type Selection */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-700 rounded-full p-1 flex items-center">
            <button
              type="button"
              onClick={() => setUserType("candidate")}
              className={`px-4 py-2 rounded-full transition-colors font-inter ${
                userType === "candidate"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-300 hover:bg-gray-600"
              }`}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType("hr_user")
              }}
              className={`px-4 py-2 rounded-full transition-colors font-inter ${
                userType === "hr_user"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-300 hover:bg-gray-600"
              }`}
            >
              HR Professional
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-600/20 border border-green-600 text-green-400 p-3 rounded-md mb-4">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-400 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-neutral-300 font-inter mb-2">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-inter mb-2">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-inter mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-inter mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength="6"
            />
          </div>

          {userType === "hr_user" && (
            <div>
              <label className="block text-neutral-300 font-inter mb-2">Company ID</label>
              <input
                type="text"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required={userType === "hr_user"}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your company's unique ID"
              />
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className={`w-full text-white py-3 rounded-md transition-colors ${
              loading
                ? "bg-blue-800 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </motion.button>
        </form>

        <div className="text-center mt-6">
          <p className="text-neutral-300 font-inter">
            Already have an account?{" "}
            <a href="/signin" className="text-blue-400 hover:underline">
              Sign In
            </a>
          </p>
        </div>
      </motion.div>
        </div>
        
        <Footer />
      </div>
    </Background>
  );
}

export default SignUp;