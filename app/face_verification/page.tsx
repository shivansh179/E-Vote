"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";
import { FaMoon, FaSun, FaCamera, FaCheckCircle, FaTimesCircle, FaStop, FaSpinner, FaEnvelope } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

/** -----------------------------
 *  FaceValidation Component
 * -----------------------------
 */
const FaceValidation: React.FC = () => {
  const router = useRouter();

  // Default to dark mode
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // States
  const [email, setEmail] = useState("");
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

  // -----------------------------
  // LOAD MODELS (once on mount)
  // -----------------------------
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        setStatus("Loading face detection models...");
        toast.loading("Loading face detection models...", { id: "loadingModels" });

        await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

        setStatus("Models loaded successfully.");
        toast.success("Models loaded successfully!", { id: "loadingModels" });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error.";
        setStatus(`Error loading models: ${errorMessage}`);
        toast.error(`Error loading models: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadModels();

    // Stop camera on unmount
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // CAMERA HANDLERS
  // -----------------------------
  const startCamera = async () => {
    // Check if email is filled
    if (!email.trim()) {
      setStatus("Please enter an email before starting the camera.");
      toast.error("Please enter your email first.");
      return;
    }

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
      setIsLoading(true); // Show spinner while camera is initializing
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraReady(true);
      setStatus("Camera ready. Please position your face in front of the camera.");
      toast.success("Camera started successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred.";
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
  // VALIDATE EMAIL & FACE
  // -----------------------------
  const validateFace = async () => {
    if (!email.trim()) {
      setStatus("Please enter an email before validating.");
      toast.error("Please enter your email first.");
      return;
    }

    if (!videoRef.current || !isCameraReady) {
      setStatus("Camera is not ready. Please start the camera and try again.");
      toast.error("Camera is not ready. Please start the camera first.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Verifying email...");

    try {
      // 1. Check if email exists in the users collection
      const usersRef = collection(db, "users");
      const qUsers = query(usersRef, where("email", "==", email));
      const userSnapshot = await getDocs(qUsers);

      toast.dismiss(toastId); // Dismiss "Verifying email..."

      if (userSnapshot.empty) {
        setStatus("No user found with that email.");
        toast.error("Email not found. Access denied.");
        return;
      }

      // For simplicity, assume we only expect one user doc per email
      let userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();

      if (!userData.embedding) {
        setStatus("This user does not have a face embedding on file.");
        toast.error("Face embedding not found for this user.");
        return;
      }

      setStatus("Detecting face...");
      const detectingToastId = toast.loading("Detecting face...");

      // 2. Detect face from camera
      const detections = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      toast.dismiss(detectingToastId); // Dismiss "Detecting face..."

      if (!detections) {
        setStatus("Face not detected. Please ensure your face is clearly visible.");
        toast.error("Face not detected. Please try again.");
        return;
      }

      // 3. Compare face descriptor with user's embedding
      const matchingToastId = toast.loading("Matching face with user’s embedding...");
      setStatus("Matching face with user’s embedding...");

      const userEmbedding = detections.descriptor;
      const dbEmbedding = new Float32Array(userData.embedding);
      const distance = faceapi.euclideanDistance(userEmbedding, dbEmbedding);

      toast.dismiss(matchingToastId);

      // 4. Check threshold (0.6 is typical for face-api)
      if (distance < 0.6) {
        setStatus("Face recognized. Redirecting...");
        toast.success("Face recognized! Redirecting...");
        setTimeout(() => {
          router.push("/owner_check");
        }, 1500);
      } else {
        setStatus(
          `Face not recognized (distance = ${distance.toFixed(2)}). Access denied.`
        );
        toast.error("Face mismatch. Access denied.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred.";
      setStatus(`Face validation error: ${errorMessage}`);
      toast.error(`Face validation error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // THEMED CLASSES
  // -----------------------------
  const containerClass =
    theme === "dark"
      ? "min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 transition-all duration-300 relative"
      : "min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 text-gray-800 transition-all duration-300 relative";

  const cardClass =
    theme === "dark"
      ? "bg-gray-800 shadow-lg rounded-xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative"
      : "bg-white shadow-lg rounded-xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative";

  const headingClass = "text-3xl font-bold mb-6 text-center";

  const statusTextClass = (txt: string) =>
    txt.toLowerCase().includes("error") || txt.toLowerCase().includes("not")
      ? "text-red-500 flex items-center justify-center"
      : "text-green-500 flex items-center justify-center";

  const buttonCommon =
    "w-full py-3 px-4 rounded-lg mb-4 transition-all duration-300 flex items-center justify-center";

  // Theme Toggle Button
  const ThemeToggleButton = () => (
    <div
      className="absolute top-4 right-4 p-3 rounded-full bg-indigo-600 text-white shadow-lg cursor-pointer flex items-center justify-center transition-colors hover:bg-indigo-700"
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
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-xl z-10">
            <FaSpinner className="animate-spin text-4xl text-blue-500" />
          </div>
        )}

        {/* EMAIL Field */}
        <div className="mb-6">
          <label htmlFor="email" className="block text-lg font-semibold mb-2 items-center">
            <FaEnvelope className="mr-2" /> Enter Your Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="example@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={
              theme === "dark"
                ? "w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
                : "w-full p-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
            }
          />
        </div>

        {/* Video Element */}
        <div className="flex justify-center mb-6">
          <video
            ref={videoRef}
            autoPlay
            muted
            width="320"
            height="240"
            className="border-4 border-indigo-500 rounded-lg shadow-lg"
          ></video>
        </div>

        {/* Status Text */}
        <div className="mb-6">
          <p className={`text-center text-lg font-medium ${statusTextClass(status)}`}>
            {status.includes("recognized") && <FaCheckCircle className="mr-2" />}
            {status.includes("mismatch") && <FaTimesCircle className="mr-2" />}
            {status.includes("Loading") || status.includes("Detecting") ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : null}
            {status}
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          {/* Start Camera */}
          <button
            onClick={startCamera}
            disabled={isCameraReady || isPermissionGranted}
            className={
              isCameraReady || isPermissionGranted
                ? `${buttonCommon} bg-gray-400 cursor-not-allowed text-gray-700`
                : `${buttonCommon} bg-blue-500 hover:bg-blue-600 text-white`
            }
          >
            <FaCamera className="mr-2" /> Start Camera
          </button>

          {/* Validate Face */}
          <button
            onClick={validateFace}
            disabled={!isCameraReady}
            className={
              isCameraReady
                ? `${buttonCommon} bg-green-500 hover:bg-green-600 text-white`
                : `${buttonCommon} bg-gray-400 cursor-not-allowed text-gray-700`
            }
          >
            {isLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaCheckCircle className="mr-2" />}
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
            <FaStop className="mr-2" /> Stop Camera
          </button>
        </div>
      </div>

      {/* React Hot Toast Container */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          className: "",
          style: {
            borderRadius: "8px",
            background: theme === "dark" ? "#333" : "#fff",
            color: theme === "dark" ? "#fff" : "#333",
          },
        }}
      />
    </div>
  );
};

export default FaceValidation;
