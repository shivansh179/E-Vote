"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";

const FaceValidation: React.FC = () => {
  const [status, setStatus] = useState<string>("Loading models...");
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const router = useRouter();

  // Load face detection and recognition models
  const loadModels = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      setStatus("Models loaded successfully.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error.";
      setStatus(`Error loading models: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Start video stream from the camera
  const startCamera = async (): Promise<void> => {
    setStatus("Requesting camera access...");
    const confirmPermission = confirm("This website wants to access your camera. Do you allow?");
    if (!confirmPermission) {
      setStatus("Camera access denied.");
      return;
    }

    try {
      setIsPermissionGranted(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
        setStatus("Camera ready. Please position your face in front of the camera.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred.";
      setStatus(`Camera error: ${errorMessage}`);
      setIsPermissionGranted(false);
    }
  };

  // Stop the video stream
  const stopCamera = (): void => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setIsCameraReady(false);
    setIsPermissionGranted(false);
    setStatus("Camera stopped.");
  };

  const validateFace = async (): Promise<void> => {
    if (!videoRef.current) {
      setStatus("Camera is not ready. Please start the camera and try again.");
      return;
    }

    setIsLoading(true);
    setStatus("Detecting face...");
    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setStatus("Face not detected. Please ensure your face is clearly visible and try again.");
        return;
      }

      const userEmbedding = detections.descriptor;

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
        router.push("/owner_check");
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred.";
      setStatus(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
    return stopCamera; // Stop the camera when the component unmounts
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 relative">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Face Validation</h1>
      <div className="bg-white shadow-lg rounded-lg p-6 w-96 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <video
          ref={videoRef}
          id="video"
          autoPlay
          muted
          width="320"
          height="240"
          className="border rounded mb-4"
        ></video>
        <div className="mb-4">
          <p
            className={`text-center text-sm ${
              status.includes("error") || status.includes("not")
                ? "text-red-500"
                : "text-green-500"
            }`}
          >
            {status}
          </p>
        </div>
        <button
          onClick={startCamera}
          disabled={isCameraReady || isPermissionGranted}
          className={`w-full py-2 px-4 rounded mb-2 ${
            isCameraReady
              ? "bg-gray-400 cursor-not-allowed text-gray-700"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          Start Camera
        </button>
        <button
          onClick={validateFace}
          disabled={!isCameraReady}
          className={`w-full py-2 px-4 rounded mb-2 ${
            isCameraReady
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-400 cursor-not-allowed text-gray-700"
          }`}
        >
          Validate Face
        </button>
        <button
          onClick={stopCamera}
          disabled={!isCameraReady}
          className={`w-full py-2 px-4 rounded ${
            isCameraReady
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-gray-400 cursor-not-allowed text-gray-700"
          }`}
        >
          Stop Camera
        </button>
      </div>
    </div>
  );
};

export default FaceValidation;
