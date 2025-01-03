"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";
import { FaMoon, FaSun } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const FaceValidation: React.FC = () => {
  const router = useRouter();

  // Default to dark mode
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // States
  const [status, setStatus] = useState("Loading models...");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // -----------------------------
  // THEME TOGGLING
  // -----------------------------
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Optionally, sync theme with localStorage:
  // useEffect(() => {
  //   const savedTheme = localStorage.getItem("faceValidationTheme");
  //   if (savedTheme === "dark" || savedTheme === "light") {
  //     setTheme(savedTheme);
  //   }
  // }, []);
  //
  // useEffect(() => {
  //   localStorage.setItem("faceValidationTheme", theme);
  // }, [theme]);

  // -----------------------------
  // LOAD MODELS
  // -----------------------------
  const loadModels = async () => {
    setIsLoading(true);
    setStatus("Loading face detection models...");
    toast("Loading face detection models...");

    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      setStatus("Models loaded successfully.");
      toast.success("Models loaded successfully.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error.";
      setStatus(`Error loading models: ${errorMessage}`);
      toast.error(`Error loading models: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // CAMERA HANDLERS
  // -----------------------------
  const startCamera = async () => {
    setStatus("Requesting camera access...");
    const confirmPermission = confirm(
      "This website wants to access your camera. Do you allow?"
    );
    if (!confirmPermission) {
      setStatus("Camera access denied.");
      toast.error("Camera access denied.");
      return;
    }

    try {
      setIsPermissionGranted(true);
      setIsLoading(true); // show spinner while camera is initializing
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraReady(true);
      setStatus("Camera ready. Please position your face in front of the camera.");
      toast.success("Camera started successfully.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred.";
      setStatus(`Camera error: ${errorMessage}`);
      toast.error(`Camera error: ${errorMessage}`);
      setIsPermissionGranted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setIsCameraReady(false);
    setIsPermissionGranted(false);
    setStatus("Camera stopped.");
    toast("Camera stopped.");
  };

  // -----------------------------
  // VALIDATE FACE
  // -----------------------------
  const validateFace = async () => {
    if (!videoRef.current || !isCameraReady) {
      setStatus("Camera is not ready. Please start the camera and try again.");
      toast.error("Camera is not ready. Please start the camera first.");
      return;
    }

    setIsLoading(true);
    setStatus("Detecting face...");
    toast.loading("Detecting face...");

    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setStatus("Face not detected. Please ensure your face is clearly visible and try again.");
        toast.dismiss();
        toast.error("Face not detected. Please try again.");
        return;
      }

      const userEmbedding = detections.descriptor;

      toast.dismiss();
      toast.loading("Matching face with registered users...");
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

      toast.dismiss();

      if (!matchedVoter) {
        setStatus("Face not recognized. You are not authorized to proceed.");
        toast.error("Face not recognized. Access denied.");
        return;
      }

      setStatus("Face recognized. Redirecting...");
      toast.success("Face recognized! Redirecting...");
      setTimeout(() => {
        router.push("/owner_check");
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred.";
      setStatus(`Error: ${errorMessage}`);
      toast.dismiss();
      toast.error(`Face validation error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // EFFECTS
  // -----------------------------
  useEffect(() => {
    loadModels();
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // THEMED CLASSES
  // -----------------------------
  const containerClass =
    theme === "dark"
      ? "min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 transition-all duration-300 relative"
      : "min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 text-gray-800 transition-all duration-300 relative";

  const cardClass =
    theme === "dark"
      ? "bg-gray-800 shadow-lg rounded-lg p-6 w-96 relative text-gray-100"
      : "bg-white shadow-lg rounded-lg p-6 w-96 relative text-gray-800";

  const headingClass = "text-4xl font-bold mb-6 text-center";

  const statusTextClass = (txt: string) =>
    txt.toLowerCase().includes("error") || txt.toLowerCase().includes("not")
      ? "text-red-500"
      : "text-green-500";

  const buttonCommon =
    "w-full py-2 px-4 rounded mb-2 transition-all duration-300 focus:outline-none";

  // Theme Toggle Button
  const ThemeToggleButton = () => (
    <div
      className="absolute top-2 left-2 p-2 rounded-full bg-gray-700 text-white shadow-md cursor-pointer flex items-center justify-center transition-colors hover:bg-gray-600"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <FaSun size={20} /> : <FaMoon size={20} />}
    </div>
  );

  return (
    <div className={containerClass}>
      {/* Theme Toggle Button */}
      <ThemeToggleButton />

      <h1 className={headingClass}>Face Validation</h1>

      <div className={cardClass}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          width="320"
          height="240"
          className="border rounded mb-4"
        ></video>

        {/* Status Text */}
        <div className="mb-4">
          <p className={`text-center text-sm font-medium ${statusTextClass(status)}`}>
            {status}
          </p>
        </div>

        {/* Start Camera */}
        <button
          onClick={startCamera}
          disabled={isCameraReady || isPermissionGranted}
          className={
            isCameraReady
              ? `${buttonCommon} bg-gray-400 cursor-not-allowed text-gray-700`
              : `${buttonCommon} bg-blue-500 hover:bg-blue-600 text-white`
          }
        >
          Start Camera
        </button>

        {/* Validate Face */}
        <button
          onClick={validateFace}
          disabled={!isCameraReady}
          className={
            isCameraReady
              ? `${buttonCommon} bg-blue-500 hover:bg-blue-600 text-white`
              : `${buttonCommon} bg-gray-400 cursor-not-allowed text-gray-700`
          }
        >
          Validate Face
        </button>

        {/* Stop Camera */}
        <button
          onClick={stopCamera}
          disabled={!isCameraReady}
          className={
            isCameraReady
              ? `${buttonCommon} bg-red-500 hover:bg-red-600 text-white`
              : `${buttonCommon} bg-gray-400 cursor-not-allowed text-gray-700`
          }
        >
          Stop Camera
        </button>
      </div>

      {/* React Hot Toast Container */}
      <Toaster />
    </div>
  );
};

export default FaceValidation;
