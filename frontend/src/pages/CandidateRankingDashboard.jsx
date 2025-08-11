import React, { useState, useEffect } from "react";
import { Trophy, Star, Briefcase, FileText } from "lucide-react";
import { apiService } from "../lib/api";
import Background from "../components/Background";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const CandidateRankingDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching candidates...");
        
        // Use the API service for consistent handling
        const data = await apiService.processAndMatchResumes();
        console.log("Received candidates data:", data);
        
        // Validate the data structure
        if (data && data.candidates) {
          console.log("Number of candidates:", data.candidates.length);
          
          // Debug each candidate's match percentage
          data.candidates.forEach((candidate, index) => {
            console.log(`Candidate ${index + 1}:`, {
              name: candidate.name,
              matchPercentage: candidate.matchPercentage,
              type: typeof candidate.matchPercentage
            });
          });
          
          setCandidates(data.candidates);
        } else {
          console.warn("No candidates in response:", data);
          setCandidates([]);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching candidates:", err);
        setError(err.message || "Failed to fetch candidates");
        setIsLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  const getMatchColorClass = (matchPercentage) => {
    const percentage = matchPercentage && !isNaN(matchPercentage) ? matchPercentage : 0;
    if (percentage >= 90) return "bg-green-900/50 border-green-500";
    if (percentage >= 75) return "bg-lime-900/50 border-lime-500";
    if (percentage >= 60) return "bg-yellow-900/50 border-yellow-500";
    return "bg-red-900/50 border-red-500";
  };

  if (isLoading) {
    return (
      <Background className="min-h-screen" containerClassName="bg-black text-white relative overflow-hidden">
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Background>
    );
  }

  if (error) {
    return (
      <Background className="min-h-screen" containerClassName="bg-black text-white relative overflow-hidden">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div
            className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </Background>
    );
  }

  return (
    <Background className="min-h-screen" containerClassName="bg-black text-white relative overflow-hidden">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center mb-6">
          <Trophy className="w-10 h-10 text-yellow-500 mr-4" />
          <h1 className="text-3xl font-bold font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
            Candidate Ranking Dashboard
          </h1>
        </div>

        <div className="grid gap-6">
          {candidates.map((candidate, index) => (
            <div
              key={candidate.name}
              className={`
                border-l-4 rounded-lg shadow-md p-6 transition-all duration-300 
                hover:shadow-xl bg-zinc-900 ${getMatchColorClass(candidate.matchPercentage)}
              `}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {index === 0 ? (
                    <Star
                      className="w-8 h-8 text-yellow-400"
                      fill="currentColor"
                    />
                  ) : (
                    <Briefcase className="w-8 h-8 text-blue-500" />
                  )}
                  <div>
                    <h2 className="text-xl font-semibold text-white font-inter">
                      {candidate.name}
                    </h2>
                    {candidate.email && (
                      <p className="text-sm text-neutral-300 font-inter">{candidate.email}</p>
                    )}
                    {candidate.phone && (
                      <p className="text-sm text-neutral-300 font-inter">{candidate.phone}</p>
                    )}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((skill, skillIndex) => (
                            <span 
                              key={skillIndex}
                              className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="px-2 py-1 bg-zinc-800 text-neutral-400 text-xs rounded">
                              +{candidate.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-white font-inter">
                    {candidate.matchPercentage && !isNaN(candidate.matchPercentage) ? 
                      Math.round(candidate.matchPercentage) : 0}%
                  </span>
                  <FileText className="w-6 h-6 text-neutral-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {candidates.length === 0 && (
          <div className="text-center py-10 bg-zinc-900 rounded-lg">
            <p className="text-xl text-neutral-300 font-inter">No candidates found</p>
          </div>
        )}
      </div>
    <Footer />
    </Background>
  );
};

export default CandidateRankingDashboard;
