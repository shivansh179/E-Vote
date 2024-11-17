"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";


const FingerprintCheck: React.FC = () => {
  const [isUserValid, setIsUserValid] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const router = useRouter();


  const handleBiometricAuthentication = async () => {
    try {
      setStatusMessage("Initializing biometric authentication...");

      // WebAuthn PublicKey Credential Request Options
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: new Uint8Array(32), // Replace with server-generated challenge
        allowCredentials: [],
        userVerification: "required",
      };

      // Trigger biometric authentication
      const credential = await navigator.credentials.get({ publicKey });

      if (credential) {
        setIsUserValid(true);
        setStatusMessage("Authentication successful! You are a valid user.");
        router.push("/user");
      } else {
        setIsUserValid(false);
        setStatusMessage("Authentication failed. You are not a valid user.");
        router.push("/");
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      setIsUserValid(false);
      setStatusMessage("Error: Unable to authenticate. You are not a valid user.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Fingerprint Authentication</h1>
        <button
          onClick={handleBiometricAuthentication}
          className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition mb-4"
        >
          Authenticate
        </button>

        {isUserValid !== null && (
          <div
            className={`mt-6 py-2 px-4 rounded-lg ${
              isUserValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default FingerprintCheck;
