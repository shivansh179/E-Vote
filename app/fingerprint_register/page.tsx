"use client";

import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/firebase";

const AdminRegister = () => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");

  const registerUser = async () => {
    try {
      if (!name) {
        setStatus("Please enter a name.");
        return;
      }

      // Step 1: Check if the device supports biometric authentication
      const compatible = !!window.PublicKeyCredential;
      if (!compatible) {
        setStatus("Your device does not support biometric authentication.");
        return;
      }

      // Step 2: Generate a WebAuthn credential (biometric ID)
      const publicKey = {
        challenge: new Uint8Array(32),
        rp: { name: "Voting App" },
        user: {
          id: new Uint8Array(16),
          name: name,
          displayName: name,
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      };

      const credentials = await navigator.credentials.create({ publicKey });
      if (!credentials) {
        setStatus("Biometric registration failed.");
        return;
      }

      const credentialId = credentials.id;

      // Step 3: Store the user data in Firebase
      const uniqueId = `user_${Date.now()}`;
      await addDoc(collection(db, "voters"), {
        user_id: uniqueId,
        name: name,
        credential_id: credentialId,
        voted: false,
      });

      setStatus(`User registered successfully! Unique ID: ${uniqueId}`);
      setName("");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Admin: Register Voter</h1>
      <input
        type="text"
        placeholder="Enter voter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={registerUser}>Register</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default AdminRegister;
