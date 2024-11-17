"use client";

import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/firebase";
import * as faceapi from "face-api.js";

const AdminRegister = () => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [image, setImage] = useState(null);
  const [useCamera, setUseCamera] = useState(false);

  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // Load models for face detection and recognition
  const loadModels = async () => {
    setStatus("Loading face detection models...");
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    setStatus("Face detection models loaded successfully.");
  };

  const handleImageUpload = (e: { target: { files: React.SetStateAction<null>[]; }; }) => {
    setImage(e.target.files[0]);
  };

  const startCamera = async () => {
    setUseCamera(true);
    await loadModels();

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }
  };

  const stopCamera = () => {
    setUseCamera(false);
    const stream = videoRef.current?.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const detectFaceFromCamera = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      setStatus("Face not detected. Please adjust your position.");
      return;
    }

    await registerUser(detections.descriptor);
  };

  const detectFaceFromImage = async () => {
    if (!image) {
      setStatus("Please upload an image.");
      return;
    }

    await loadModels();

    const img = await faceapi.bufferToImage(image);
    const detections = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      setStatus("Face not detected in the image. Please try again.");
      return;
    }

    await registerUser(detections.descriptor);
  };

  const registerUser = async (embedding: Iterable<unknown> | ArrayLike<unknown>) => {
    try {
      if (!name) {
        setStatus("Please enter the user's name.");
        return;
      }

      // Generate a unique ID for the user
      const userId = `user_${Date.now()}`;

      // Store user information and embedding in Firebase
      await addDoc(collection(db, "voters"), {
        user_id: userId,
        name,
        embedding: Array.from(embedding), // Convert Float32Array to regular array
        voted: false, // Initialize voted flag
      });

      setStatus(`User registered successfully! ID: ${userId}`);
      setName("");
      setImage(null);
    } catch (error) {
      setStatus(`Error during registration: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Admin: Register User</h1>
      <input
        type="text"
        placeholder="Enter user name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div>
        <button onClick={startCamera}>Use Camera</button>
        <button onClick={stopCamera} disabled={!useCamera}>
          Stop Camera
        </button>
        {useCamera && (
          <>
            <video ref={videoRef} autoPlay muted width="640" height="480" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <button onClick={detectFaceFromCamera}>Register with Camera</button>
          </>
        )}
      </div>
      <div>
        <input type="file" onChange={handleImageUpload} accept="image/*" />
        <button onClick={detectFaceFromImage}>Register with Image</button>
      </div>
      {status && <p>{status}</p>}
    </div>
  );
};

export default AdminRegister;
