"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";

const FaceValidation = () => {
  const [status, setStatus] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const videoRef = React.useRef(null);
  const router = useRouter();

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

  const validateFace = async () => {
    try {
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
      setStatus("Matching face with registered users...");
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
        setStatus("Face not recognized. You are not authorized to proceed.");
        return;
      }

      setStatus("Face recognized. Redirecting...");
      setTimeout(() => {
        router.push("/user"); // Redirect to the user page
      }, 1500);
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
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Face Validation</h1>
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
        <button
          onClick={validateFace}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 mb-2"
        >
          Validate Face
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

export default FaceValidation;
