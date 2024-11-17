"use client";

import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";

const UserVote = () => {
  const [candidate, setCandidate] = useState("");
  const [status, setStatus] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const videoRef = React.useRef(null);

  // Load face detection and recognition models
  const loadModels = async () => {
    setStatus("Loading face recognition models...");
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    setStatus("Models loaded successfully.");
  };

  // Start video stream from the camera
  const startCamera = async () => {
    setStatus("Initializing camera...");
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraReady(true);
          setStatus("Camera ready. Please position your face in front of the camera.");
        }
      }
    } catch (error) {
      setStatus(`Camera error: ${error.message}`);
    }
  };

  // Stop the video stream
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setIsCameraReady(false);
    setStatus("Camera stopped.");
  };

  const vote = async () => {
    try {
      if (!candidate) {
        setStatus("Please select a candidate.");
        return;
      }

      if (!videoRef.current) {
        setStatus("Camera is not ready. Please refresh the page and try again.");
        return;
      }

      setStatus("Detecting face...");
      const detections = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setStatus("Face not detected. Please ensure your face is clearly visible and try again.");
        return;
      }

      const userEmbedding = detections.descriptor;

      // Fetch all registered voters from Firebase
      setStatus("Matching face with registered voters...");
      const votersQuery = query(collection(db, "voters"));
      const votersSnapshot = await getDocs(votersQuery);

      let matchedVoter = null;

      votersSnapshot.forEach((doc) => {
        const voterData = doc.data();
        const dbEmbedding = new Float32Array(voterData.embedding);
        const distance = faceapi.euclideanDistance(userEmbedding, dbEmbedding);

        if (distance < 0.6) {
          matchedVoter = { id: doc.id, ...voterData };
        }
      });

      if (!matchedVoter) {
        setStatus("Face not recognized. You are not registered to vote.");
        return;
      }

      if (matchedVoter.voted) {
        setStatus("You have already voted. Duplicate voting is not allowed.");
        return;
      }

      // Record the vote
      setStatus("Submitting your vote...");
      await addDoc(collection(db, "votes"), {
        voter_id: matchedVoter.user_id,
        candidate: candidate,
        timestamp: new Date().toISOString(),
      });

      // Mark the user as voted
      await updateDoc(doc(db, "voters", matchedVoter.id), { voted: true });

      setStatus("Vote submitted successfully! Thank you for voting.");
      setCandidate("");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  useEffect(() => {
    loadModels();
    startCamera();
    return stopCamera; // Stop the camera when the component unmounts
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Vote</h1>
      <div className="bg-white shadow-lg rounded-lg p-6 w-96">
        <video
          ref={videoRef}
          id="video"
          autoPlay
          muted
          width="320"
          height="240"
          className="border rounded mb-4"
        ></video>
        {isCameraReady && (
          <p className="text-sm text-green-500 mb-4">
            Camera is active. Please ensure your face is centered in the frame.
          </p>
        )}
        <select
          className="block w-full p-2 mb-4 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={candidate}
          onChange={(e) => setCandidate(e.target.value)}
        >
          <option value="">Select a candidate</option>
          <option value="Candidate A">Candidate A</option>
          <option value="Candidate B">Candidate B</option>
          <option value="Candidate C">Candidate C</option>
        </select>
        <button
          onClick={vote}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 mb-2"
        >
          Submit Vote
        </button>
        <button
          onClick={stopCamera}
          disabled={!isCameraReady}
          className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
        >
          Stop Camera
        </button>
        {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}
      </div>
    </div>
  );
};

export default UserVote;
