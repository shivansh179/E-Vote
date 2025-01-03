"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const FingerprintCheck: React.FC = () => {
  const [isUserValid, setIsUserValid] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Additional states for PIN flow
  const [pin, setPin] = useState("");
  const [isPinPromptVisible, setIsPinPromptVisible] = useState(false);

  const router = useRouter();

  /**
   * 1) Trigger device/biometric auth via WebAuthn.
   * 2) If successful, reveal the PIN input.
   */
  const handleBiometricAuthentication = async () => {
    try {
      setStatusMessage("Initializing biometric authentication...");

      // Example minimal WebAuthn PublicKey Credential Request Options
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: new Uint8Array(32), // Replace with a real server-generated challenge
        allowCredentials: [],
        userVerification: "required",
      };

      // Attempt device/biometric auth
      const credential = await navigator.credentials.get({ publicKey });

      // If user cancels or biometrics fail, credential is null
      if (!credential) {
        setIsUserValid(false);
        setStatusMessage("Biometric authentication failed or cancelled.");
        return;
      }

      // Biometric/device unlock success
      setStatusMessage("Biometric authentication successful!");
      setIsUserValid(null); // Reset validity for next check
      setIsPinPromptVisible(true); // Show the PIN input next

    } catch (error) {
      console.error("Biometric authentication error:", error);
      setIsUserValid(false);
      setStatusMessage("Error: Unable to authenticate biometrically.");
    }
  };

  /**
   * Check the user’s input PIN against Firestore.
   * If valid, finalize user validation; otherwise, show error.
   */
  const handlePinCheck = async () => {
    try {
      setStatusMessage("Verifying PIN...");

      // Example: Assume user doc is stored in "users" collection
      // and there's exactly one doc with a field "pin" that we match against
      // for demonstration. Adjust query logic to match your real scenario
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("pin", "==", pin));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Pin is correct
        setIsUserValid(true);
        setStatusMessage("PIN validated! You are authorized.");
        // Redirect to /user after a short delay
        setTimeout(() => {
          router.push("/user");
        }, 1000);
      } else {
        // Pin mismatch
        setIsUserValid(false);
        setStatusMessage("Invalid PIN. Access denied.");
      }
    } catch (error) {
      console.error("Error verifying PIN:", error);
      setIsUserValid(false);
      setStatusMessage("Error verifying PIN. Access denied.");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center
                 bg-gradient-to-br from-gray-100 to-gray-200 px-4"
    >
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Biometric + PIN Authentication
        </h1>

        {/* STEP 1: Device / Biometric Auth Button */}
        {!isPinPromptVisible && (
          <button
            onClick={handleBiometricAuthentication}
            className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition mb-4"
          >
            Authenticate via Device
          </button>
        )}

        {/* STEP 2: PIN Prompt (Visible only if Biometric is successful) */}
        {isPinPromptVisible && (
          <div className="mt-4">
            <p className="mb-2 text-gray-700">
              Please enter your secret PIN to confirm your identity:
            </p>
            <input
              type="password"
              placeholder="Enter your PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full mb-4 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePinCheck}
              className="w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition"
            >
              Verify PIN
            </button>
          </div>
        )}

        {/* Status / Result Message */}
        {isUserValid !== null && (
          <div
            className={`mt-6 py-2 px-4 rounded-lg ${
              isUserValid
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {statusMessage}
          </div>
        )}
        {/* If "isUserValid" is null but we have a statusMessage, it's an in-progress or post-biometrics message */}
        {isUserValid === null && statusMessage && (
          <div className="mt-6 py-2 px-4 text-gray-700">{statusMessage}</div>
        )}
      </div>
    </div>
  );
};

export default FingerprintCheck;
