import React, { useState } from 'react';
import axios from 'axios';

const InterviewQuestions = ({ candidateId }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateInterviewQuestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `http://localhost:8000/generate-interview-questions/`, 
        { candidate_id: candidateId }
      );

      setQuestions(response.data.interview_questions);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate questions');
      console.error('Error generating interview questions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-lg shadow-md border border-zinc-800">
      <h2 className="text-xl font-bold mb-4 text-white font-inter">Interview Question Generator</h2>
      
      <button 
        onClick={generateInterviewQuestions}
        disabled={loading}
        className={`px-4 py-2 rounded-md text-white font-inter ${
          loading 
            ? 'bg-gray-600 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? 'Generating...' : 'Generate Interview Questions'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border-l-4 border-red-500 text-red-300">
          <p className="font-inter">{error}</p>
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-white font-inter">Suggested Interview Questions:</h3>
          <ol className="list-decimal list-inside space-y-3">
            {questions.map((question, index) => (
              <li key={index} className="text-neutral-300 font-inter">{question}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default InterviewQuestions;
