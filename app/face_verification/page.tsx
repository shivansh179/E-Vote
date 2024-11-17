"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";

const FaceValidation: React.FC = () => {
  const [status, setStatus] = useState<string>("");
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const router = useRouter();

  // Load face detection and recognition models
  const loadModels = async (): Promise<void> => {
    setStatus("Loading face recognition models...");
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    setStatus("Models loaded successfully.");
  };

  // Start video stream from the camera
  const startCamera = async (): Promise<void> => {
    setStatus("Initializing camera...");
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          (videoRef.current as HTMLVideoElement).srcObject = stream;
          setIsCameraReady(true);
          setStatus("Camera ready. Please position your face in front of the camera.");
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred.";
      setStatus(`Camera error: ${errorMessage}`);
    }
  };

  // Stop the video stream
  const stopCamera = (): void => {
    const stream = (videoRef.current?.srcObject as MediaStream | null);
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track: MediaStreamTrack) => track.stop());
    }
    setIsCameraReady(false);
    setStatus("Camera stopped.");
  };

  const validateFace = async (): Promise<void> => {
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

      let matchedVoter: any = null;

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
        router.push("/owner_check"); // Redirect to the user page
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred.";
      setStatus(`Error: ${errorMessage}`);
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
      <div className="bg-white shadow-lg rounded-lg p-6 w-96 relative">
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
