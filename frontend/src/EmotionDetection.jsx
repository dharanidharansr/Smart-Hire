import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import Footer from './components/Footer';

const EmotionDetection = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [emotion, setEmotion] = useState('');
  const [userId, setUserId] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);

  // Load models and start video
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      
      startVideo();
    };
    
    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(err => console.error(err));
  };

  // Detect emotions in real-time
  const detectEmotions = async () => {
    const detection = await faceapi.detectAllFaces(
      videoRef.current, 
      new faceapi.TinyFaceDetectorOptions()
    )
    .withFaceLandmarks()
    .withFaceExpressions();

    if (detection.length > 0) {
      const expressions = detection[0].expressions;
      const dominantEmotion = Object.entries(expressions).reduce(
        (max, [emotion, value]) => value > max[1] ? [emotion, value] : max,
        ['neutral', 0]
      )[0];
      
      setEmotion(dominantEmotion);
      
      // Store in localStorage if call is active
      if (isCallActive && userId) {
        localStorage.setItem('currentEmotion', dominantEmotion);
        localStorage.setItem('currentUserId', userId);
      }
    }

    requestAnimationFrame(detectEmotions);
  };

  // Start/stop emotion detection
  const toggleCall = () => {
    setIsCallActive(!isCallActive);
    if (!isCallActive) {
      detectEmotions();
    }
  };

  return (
    <div className="emotion-detection bg-black text-white min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6 font-bricolage bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">HR Emotion Detection</h1>
      
      <div className="video-container bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          width="720" 
          height="560"
          className="rounded-lg"
        />
        <canvas ref={canvasRef} width="720" height="560" className="rounded-lg" />
      </div>
      
      <div className="controls mt-6 bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <p className="text-lg font-inter mb-4">Detected Emotion: <strong className="text-blue-400">{emotion}</strong></p>
        <button 
          onClick={toggleCall}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-inter hover:bg-blue-700 transition"
        >
          {isCallActive ? 'End Call' : 'Start Call'}
        </button>
      </div>
      
      {/* Add user selection from localStorage */}
      <UserSelector setUserId={setUserId} />
      <Footer />
    </div>
  );
};

const UserSelector = ({ setUserId }) => {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    const fetchUsers = async () => {
      // Get users from localStorage or set default
      const storedUsers = JSON.parse(localStorage.getItem('hrUsers') || '[]');
      setUsers(storedUsers);
    };
    
    fetchUsers();
  }, []);

  return (
    <div className="mt-4 bg-zinc-900 rounded-lg p-4 border border-zinc-800">
      <label className="block text-sm font-medium text-neutral-300 font-inter mb-2">Select HR User:</label>
      <select 
        onChange={(e) => setUserId(e.target.value)}
        className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-inter"
      >
        <option value="">Select HR User</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default EmotionDetection;