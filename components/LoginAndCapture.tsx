"use client";

import React, { useState, useRef, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import { auth } from "../firebase";

const LoginAndCapture: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [capturePhoto, setCapturePhoto] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    // Auto-capture photo once logged in or after unsuccessful login attempt
    if (isLoggedIn || email || password) {
      handleCapture();
    }
  }, [isLoggedIn, email, password]);

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      if (userCredential.user) {
        alert("Login successful!");
        setIsLoggedIn(true);
        setCapturePhoto(true); // Enable camera after login
      }
    } catch (error) {
      setCapturePhoto(true); // Do not allow photo capture on failed login
      alert("Login failed. Check your credentials.");
      console.error("Login error:", error);
    }
  };

  const handleCapture = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      console.log("Captured Image:", imageSrc); // Debugging line to check if screenshot is captured
      if (imageSrc) {
        // Convert the image string to a Blob
        const blob = await fetch(imageSrc).then(res => res.blob());

        // Create a link to download the image
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${auth.currentUser?.uid}_profile.jpg`;  // File name for the downloaded image
        document.body.appendChild(link); // Append the link to the DOM (required for it to work in some browsers)
        link.click();  // Programmatically click the link to trigger the download
        document.body.removeChild(link); // Clean up by removing the link

        alert("Photo captured and saved to your computer!");
        router.push("/admin"); // Redirect after capturing
      } else {
        alert("Failed to capture the image.");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {!isLoggedIn ? (
        <div className="bg-white p-8 rounded shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-6 border rounded"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600"
          >
            Login
          </button>
        </div>
      ) : (
        capturePhoto && (
          <div className="flex flex-col items-center">
            <h2 className="text-xl mb-4">Capture Your Photo</h2>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded-lg border-2 border-gray-500"
            />
            <button
              onClick={handleCapture}
              className="mt-4 bg-green-500 text-white py-3 px-6 rounded hover:bg-green-600"
            >
              Capture & Continue
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default LoginAndCapture;
