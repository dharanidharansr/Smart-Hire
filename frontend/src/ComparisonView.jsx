import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon, 
  CheckIcon, 
  XIcon,
  BarChart4Icon,
  PieChartIcon
} from 'lucide-react';
import Chart from 'chart.js/auto';

const ComparisonView = ({ candidates, onBack }) => {
  // References for charts
  const skillChartRef = useRef(null);
  const matchScoreChartRef = useRef(null);
  const expEducationChartRef = useRef(null);
  
  // Safety check: ensure candidates is an array
  if (!candidates || !Array.isArray(candidates) || candidates.length !== 2) {
    return (
      <div className="text-center py-10 bg-zinc-800/50 rounded-lg">
        <p className="text-xl text-neutral-400">Please select exactly 2 candidates to compare</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg flex items-center mx-auto"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to candidates
        </button>
      </div>
    );
  }

  const [candidate1, candidate2] = candidates;

  // Debug logging
  console.log('ComparisonView - Candidate 1:', candidate1);
  console.log('ComparisonView - Candidate 2:', candidate2);
  
  // Safety check: ensure both candidates exist
  if (!candidate1 || !candidate2) {
    return (
      <div className="text-center py-10 bg-zinc-800/50 rounded-lg">
        <p className="text-xl text-neutral-400">Invalid candidate data for comparison</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg flex items-center mx-auto"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to candidates
        </button>
      </div>
    );
  }

  // Helper to get skills from candidate (handles both data structures)
  const getCandidateSkills = (candidate) => {
    // First check if data is at top level (from CandidateRankingDashboard)
    if (candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0) {
      return { general: candidate.skills };
    }
    
    // Then check nested structure (from ResumeParserTest)
    if (candidate.fullDetails?.processed_data?.skills) {
      return candidate.fullDetails.processed_data.skills;
    }
    
    // Fall back to direct skills property (CandidateRankingDashboard format)
    if (candidate.skills) {
      // If skills is an array, convert to object with 'general' category
      if (Array.isArray(candidate.skills)) {
        return { general: candidate.skills };
      }
      // If skills is already an object, return it
      if (typeof candidate.skills === 'object') {
        return candidate.skills;
      }
    }
    
    return {};
  };

  // Helper to parse experience strings from backend
  const parseExperienceString = (expString) => {
    if (typeof expString !== 'string') {
      return expString; // Already an object
    }
    
    // Parse strings like "@{company=Trident Solutions, Chennai; position=App Development Intern; duration=July 2024; months=}"
    const parsed = {};
    
    // Remove @{ and }
    const cleanString = expString.replace(/^@\{/, '').replace(/\}$/, '');
    
    // Split by semicolon and parse key-value pairs
    const pairs = cleanString.split(';');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        parsed[key.trim()] = value.trim();
      }
    });
    
    return parsed;
  };

  // Helper to get experience from candidate
  const getCandidateExperience = (candidate) => {
    // First check if data is at top level (from CandidateRankingDashboard)
    if (candidate.experience && Array.isArray(candidate.experience) && candidate.experience.length > 0) {
      // Parse experience strings if they are strings
      return candidate.experience.map(exp => parseExperienceString(exp));
    }
    
    // Then check nested structure (from ResumeParserTest)
    if (candidate.fullDetails?.processed_data?.work_experience) {
      return candidate.fullDetails.processed_data.work_experience;
    }
    
    return [];
  };

  // Helper to get education from candidate
  const getCandidateEducation = (candidate) => {
    // First check if data is at top level (from CandidateRankingDashboard)
    if (candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0) {
      return candidate.education;
    }
    
    // Then check nested structure (from ResumeParserTest)
    if (candidate.fullDetails?.processed_data?.education) {
      const education = candidate.fullDetails.processed_data.education;
      return Array.isArray(education) ? education : [education];
    }
    
    return [];
  };

  // Helper to get personal information from candidate
  const getCandidatePersonalInfo = (candidate) => {
    // First check if data is at top level (from CandidateRankingDashboard)
    if (candidate.email || candidate.phone) {
      return {
        email: candidate.email || 'N/A',
        location: candidate.location || 'N/A',
        phone: candidate.phone || 'N/A'
      };
    }
    
    // Then check nested structure (from ResumeParserTest)
    if (candidate.fullDetails?.processed_data?.personal_information) {
      const personalInfo = candidate.fullDetails.processed_data.personal_information;
      return {
        email: personalInfo.email || 'N/A',
        location: personalInfo.location || 'N/A',
        phone: personalInfo.phone || personalInfo.contact || 'N/A'
      };
    }
    
    return {
      email: 'N/A',
      location: 'N/A',
      phone: 'N/A'
    };
  };

  // Extract categories from both candidates skills
  const candidate1Skills = getCandidateSkills(candidate1);
  const candidate2Skills = getCandidateSkills(candidate2);
  const allSkillCategories = new Set([
    ...Object.keys(candidate1Skills),
    ...Object.keys(candidate2Skills)
  ]);

  // Helper for skill comparison
  const hasSkill = (candidate, category, skill) => {
    const skills = getCandidateSkills(candidate);
    if (!skills[category]) return false;
    return skills[category].includes(skill);
  };

  // Get all unique skills from both candidates for a category
  const getAllSkillsForCategory = (category) => {
    const skills = new Set();
    
    // Add skills from candidate 1
    const candidate1SkillsData = getCandidateSkills(candidate1);
    if (candidate1SkillsData[category]) {
      candidate1SkillsData[category].forEach(skill => skills.add(skill));
    }
    
    // Add skills from candidate 2
    const candidate2SkillsData = getCandidateSkills(candidate2);
    if (candidate2SkillsData[category]) {
      candidate2SkillsData[category].forEach(skill => skills.add(skill));
    }
    
    return Array.from(skills);
  };

  // Get skill count by category for a candidate
  const getSkillCountByCategory = (candidate) => {
    const counts = {};
    const skills = getCandidateSkills(candidate);
    
    Object.keys(skills).forEach(category => {
      counts[category] = skills[category].length;
    });
    
    return counts;
  };

  // Calculate experience years (very basic estimation)
  const calculateExperienceYears = (candidate) => {
    const experience = getCandidateExperience(candidate);
    if (!experience || experience.length === 0) {
      return 0;
    }
    
    let totalYears = 0;
    experience.forEach(job => {
      // Handle different date formats
      let startYear = 0;
      let endYear = new Date().getFullYear();
      
      if (job.start_date) {
        const startMatch = job.start_date.match(/\d{4}/);
        if (startMatch) startYear = parseInt(startMatch[0]);
      }
      
      if (job.end_date && job.end_date !== 'Present') {
        const endMatch = job.end_date.match(/\d{4}/);
        if (endMatch) endYear = parseInt(endMatch[0]);
      }
      
      // Handle duration field as fallback
      if (job.duration && startYear === 0) {
        const durationMatch = job.duration.match(/(\d+)\s*year/i);
        if (durationMatch) {
          totalYears += parseInt(durationMatch[1]);
          return;
        }
      }
      
      if (startYear > 0) {
        totalYears += Math.max(0, endYear - startYear);
      }
    });
    
    return totalYears;
  };

  // Initialize charts when component mounts
  useEffect(() => {
    let skillChart = null;
    let matchChart = null;
    let expEducationChart = null;
    
    if (skillChartRef.current) {
      // Destroy existing chart if it exists
      if (skillChartRef.current.chart) {
        skillChartRef.current.chart.destroy();
      }
      
      // Prepare data for skills radar chart
      const categories = Array.from(allSkillCategories);
      const candidate1SkillsData = getCandidateSkills(candidate1);
      const candidate2SkillsData = getCandidateSkills(candidate2);
      
      const candidate1Skills = categories.map(category => {
        return candidate1SkillsData[category]?.length || 0;
      });
      const candidate2Skills = categories.map(category => {
        return candidate2SkillsData[category]?.length || 0;
      });
      
      // Create radar chart for skills comparison
      skillChart = new Chart(skillChartRef.current, {
        type: 'radar',
        data: {
          labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
          datasets: [
            {
              label: candidate1.name,
              data: candidate1Skills,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 1)',
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
            },
            {
              label: candidate2.name,
              data: candidate2Skills,
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              borderColor: 'rgba(168, 85, 247, 1)',
              pointBackgroundColor: 'rgba(168, 85, 247, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(168, 85, 247, 1)'
            }
          ]
        },
        options: {
          scales: {
            r: {
              angleLines: {
                color: 'rgba(255, 255, 255, 0.15)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              pointLabels: {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)',
                backdropColor: 'rgba(0, 0, 0, 0)'
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }
          }
        }
      });
      
      // Store chart instance for cleanup
      skillChartRef.current.chart = skillChart;
    }
    
    if (matchScoreChartRef.current) {
      // Destroy existing chart if it exists
      if (matchScoreChartRef.current.chart) {
        matchScoreChartRef.current.chart.destroy();
      }
      
      // Create bar chart for match score comparison
      matchChart = new Chart(matchScoreChartRef.current, {
        type: 'bar',
        data: {
          labels: [candidate1.name, candidate2.name],
          datasets: [{
            data: [
              candidate1.matchPercentage && !isNaN(candidate1.matchPercentage) ? candidate1.matchPercentage : 0,
              candidate2.matchPercentage && !isNaN(candidate2.matchPercentage) ? candidate2.matchPercentage : 0
            ],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(168, 85, 247, 0.8)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(168, 85, 247, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            },
            y: {
              grid: {
                display: false
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Match: ${context.raw}%`;
                }
              }
            }
          }
        }
      });
      
      // Store chart instance for cleanup
      matchScoreChartRef.current.chart = matchChart;
    }
    
    if (expEducationChartRef.current) {
      // Destroy existing chart if it exists
      if (expEducationChartRef.current.chart) {
        expEducationChartRef.current.chart.destroy();
      }
      
      // Calculate education level (very basic - just count degrees)
      const educationLevel1 = getCandidateEducation(candidate1).length;
      const educationLevel2 = getCandidateEducation(candidate2).length;
      
      // Calculate years of experience
      const experienceYears1 = calculateExperienceYears(candidate1);
      const experienceYears2 = calculateExperienceYears(candidate2);
      
      // Create grouped bar chart for experience and education
      expEducationChart = new Chart(expEducationChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Work Experience (Years)', 'Education (Degrees)'],
          datasets: [
            {
              label: candidate1.name,
              data: [experienceYears1, educationLevel1],
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1
            },
            {
              label: candidate2.name,
              data: [experienceYears2, educationLevel2],
              backgroundColor: 'rgba(168, 85, 247, 0.8)',
              borderColor: 'rgba(168, 85, 247, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }
          }
        }
      });
      
      // Store chart instance for cleanup
      expEducationChartRef.current.chart = expEducationChart;
    }
    
    // Cleanup function
    return () => {
      if (skillChart) skillChart.destroy();
      if (matchChart) matchChart.destroy();
      if (expEducationChart) expEducationChart.destroy();
    };
  }, [candidates, allSkillCategories]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 shadow-xl"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
          Candidate Comparison
        </h1>
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>

      {/* Comparison Header */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-1"></div>
        <div className="col-span-1 text-center">
          <h2 className="text-2xl font-bold text-neutral-100 bg-blue-900/30 py-2 px-4 rounded-lg">
            {candidate1.name}
            <span className="ml-2 text-sm bg-blue-800/50 text-blue-300 px-2 py-0.5 rounded-full">
              {candidate1.matchPercentage && !isNaN(candidate1.matchPercentage) ? 
                Math.round(candidate1.matchPercentage) : 0}%
            </span>
          </h2>
        </div>
        <div className="col-span-1 text-center">
          <h2 className="text-2xl font-bold text-neutral-100 bg-purple-900/30 py-2 px-4 rounded-lg">
            {candidate2.name}
            <span className="ml-2 text-sm bg-purple-800/50 text-purple-300 px-2 py-0.5 rounded-full">
              {candidate2.matchPercentage && !isNaN(candidate2.matchPercentage) ? 
                Math.round(candidate2.matchPercentage) : 0}%
            </span>
          </h2>
        </div>
      </div>

      {/* Match Score Chart Visualization */}
      <div className="mb-8 bg-zinc-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-neutral-200 mb-4 flex items-center">
          <BarChart4Icon className="w-5 h-5 mr-2" />
          Match Score Comparison
        </h3>
        <div className="h-32">
          <canvas ref={matchScoreChartRef}></canvas>
        </div>
      </div>

      {/* Skills Radar Chart */}
      <div className="mb-8 bg-zinc-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-neutral-200 mb-4 flex items-center">
          <PieChartIcon className="w-5 h-5 mr-2" />
          Skills Comparison
        </h3>
        <div className="h-64 w-full">
          <canvas ref={skillChartRef}></canvas>
        </div>
      </div>

      {/* Experience & Education Chart */}
      <div className="mb-8 bg-zinc-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-neutral-200 mb-4 flex items-center">
          <BarChart4Icon className="w-5 h-5 mr-2" />
          Experience & Education
        </h3>
        <div className="h-64 w-full">
          <canvas ref={expEducationChartRef}></canvas>
        </div>
      </div>

      {/* Personal Information Comparison */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-neutral-200 border-b border-zinc-700 pb-2 mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 font-medium text-neutral-400">
            <p className="py-2">Email</p>
            <p className="py-2">Location</p>
            <p className="py-2">Phone</p>
          </div>
          <div className="col-span-1 text-neutral-200">
            <p className="py-2">{getCandidatePersonalInfo(candidate1).email}</p>
            <p className="py-2">{getCandidatePersonalInfo(candidate1).location}</p>
            <p className="py-2">{getCandidatePersonalInfo(candidate1).phone}</p>
          </div>
          <div className="col-span-1 text-neutral-200">
            <p className="py-2">{getCandidatePersonalInfo(candidate2).email}</p>
            <p className="py-2">{getCandidatePersonalInfo(candidate2).location}</p>
            <p className="py-2">{getCandidatePersonalInfo(candidate2).phone}</p>
          </div>
        </div>
      </div>

      {/* Education Comparison */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-neutral-200 border-b border-zinc-700 pb-2 mb-4">
          Education
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-blue-900/20 rounded-lg p-4">
            {(() => {
              const education = getCandidateEducation(candidate1);
              
              return education && education.length > 0 ? (
                <div className="space-y-4">
                  {education.map((edu, index) => (
                    <div key={index} className="border-b border-blue-800 pb-3 last:border-0">
                      <p className="font-semibold text-neutral-200">
                        {edu.degree || edu.qualification || edu.title || edu.institution || 'Unknown Degree'}
                      </p>
                      <p className="text-sm text-neutral-300">
                        {edu.institution || edu.school || edu.university || 'Unknown Institution'}
                      </p>
                      {(edu.year || edu.graduation_year || edu.date) && (
                        <p className="text-xs text-neutral-400">
                          {edu.year || edu.graduation_year || edu.date}
                        </p>
                      )}
                      {edu.field && (
                        <p className="text-xs text-neutral-500">{edu.field}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400">No education information available</p>
              );
            })()}
          </div>
          <div className="bg-purple-900/20 rounded-lg p-4">
            {(() => {
              const education = getCandidateEducation(candidate2);
              
              return education && education.length > 0 ? (
                <div className="space-y-4">
                  {education.map((edu, index) => (
                    <div key={index} className="border-b border-purple-800 pb-3 last:border-0">
                      <p className="font-semibold text-neutral-200">
                        {edu.degree || edu.qualification || edu.title || edu.institution || 'Unknown Degree'}
                      </p>
                      <p className="text-sm text-neutral-300">
                        {edu.institution || edu.school || edu.university || 'Unknown Institution'}
                      </p>
                      {(edu.year || edu.graduation_year || edu.date) && (
                        <p className="text-xs text-neutral-400">
                          {edu.year || edu.graduation_year || edu.date}
                        </p>
                      )}
                      {edu.field && (
                        <p className="text-xs text-neutral-500">{edu.field}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400">No education information available</p>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Work Experience Comparison */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-neutral-200 border-b border-zinc-700 pb-2 mb-4">
          Work Experience
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-blue-900/20 rounded-lg p-4">
            {(() => {
              const experience = getCandidateExperience(candidate1);
              
              return experience && experience.length > 0 ? (
                <div className="space-y-4">
                  {experience.map((job, index) => (
                    <div key={index} className="border-b border-blue-800 pb-3 last:border-0">
                      <p className="font-semibold text-neutral-200">
                        {job.title || job.position || 'Unknown Position'}
                      </p>
                      <p className="text-sm text-neutral-300">
                        {job.company || job.organization || 'Unknown Company'}
                      </p>
                      <p className="text-sm text-neutral-400">
                        {job.duration || `${job.start_date || ''} - ${job.end_date || 'Present'}`}
                      </p>
                      {job.months && (
                        <p className="text-xs text-neutral-500">
                          {job.months} month{job.months !== '1' ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400">No work experience available</p>
              );
            })()}
          </div>
          <div className="bg-purple-900/20 rounded-lg p-4">
            {(() => {
              const experience = getCandidateExperience(candidate2);
              
              return experience && experience.length > 0 ? (
                <div className="space-y-4">
                  {experience.map((job, index) => (
                    <div key={index} className="border-b border-purple-800 pb-3 last:border-0">
                      <p className="font-semibold text-neutral-200">
                        {job.title || job.position || 'Unknown Position'}
                      </p>
                      <p className="text-sm text-neutral-300">
                        {job.company || job.organization || 'Unknown Company'}
                      </p>
                      <p className="text-sm text-neutral-400">
                        {job.duration || `${job.start_date || ''} - ${job.end_date || 'Present'}`}
                      </p>
                      {job.months && (
                        <p className="text-xs text-neutral-500">
                          {job.months} month{job.months !== '1' ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400">No work experience available</p>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Skills Comparison Table */}
      <div>
        <h3 className="text-xl font-semibold text-neutral-200 border-b border-zinc-700 pb-2 mb-4">
          Skills Detail
        </h3>
        <div className="bg-zinc-800/50 rounded-lg p-4">
          {allSkillCategories.size > 0 ? (
            <div className="space-y-6">
              {Array.from(allSkillCategories).map(category => (
                <div key={category} className="mb-4">
                  <h4 className="text-lg font-medium text-neutral-300 capitalize mb-3">{category}</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-zinc-900/50 rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-zinc-800/50">
                          <th className="py-2 px-4 text-left text-sm font-medium text-neutral-400">Skill</th>
                          <th className="py-2 px-4 text-center text-sm font-medium text-blue-400">{candidate1.name}</th>
                          <th className="py-2 px-4 text-center text-sm font-medium text-purple-400">{candidate2.name}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getAllSkillsForCategory(category).map((skill, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-zinc-800/20' : 'bg-zinc-800/10'}>
                            <td className="py-2 px-4 text-sm text-neutral-300">{skill}</td>
                            <td className="py-2 px-4 text-center">
                              {hasSkill(candidate1, category, skill) ? (
                                <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XIcon className="w-5 h-5 text-red-500 mx-auto" />
                              )}
                            </td>
                            <td className="py-2 px-4 text-center">
                              {hasSkill(candidate2, category, skill) ? (
                                <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <XIcon className="w-5 h-5 text-red-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400 text-center py-4">No skills data available for comparison</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ComparisonView;