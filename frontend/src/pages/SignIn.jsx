import React, { useState } from "react";
import { motion } from "framer-motion";
import { apiService } from "../lib/api";
import { useNavigate } from "react-router-dom";
import Background from "../components/Background";
import Footer from "../components/Footer";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiService.signIn({
        email,
        password,
      });

      console.log("User signed in:", response.user);

      // Store auth token if provided
      if (response.access_token) {
        localStorage.setItem('authToken', response.access_token);
      }

      // Store user data
      localStorage.setItem('user', JSON.stringify(response.user));

      // Redirect based on role
      if (response.user.role === "candidate") {
        navigate("/dashboard");
      } else if (response.user.role === "hr_user") {
        navigate("/hr/dashboard");
      } else {
        navigate("/dashboard"); // Default fallback
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError(error.response?.data?.detail || error.message || "Sign in failed");
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
          Sign In to CareerCraft
        </h2>

        {/* Error Message */}
        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-400 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
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
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className={`w-full text-white py-3 rounded-md transition-colors ${
              loading
                ? "bg-blue-800 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Signing In..." : "Sign In"}
          </motion.button>
        </form>

        <div className="text-center mt-6 space-y-4">
          <p className="text-neutral-300 font-inter mt-2">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-400 hover:underline">
              Sign Up
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

export default SignIn;