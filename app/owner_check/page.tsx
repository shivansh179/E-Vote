"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const PinCheckOnly: React.FC = () => {
  const [isUserValid, setIsUserValid] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [pin, setPin] = useState("");

  const router = useRouter();

  /**
   * 1) Check the user’s input PIN against Firestore.
   * 2) If valid, set isUserValid to true and redirect; otherwise, show error.
   */
  const handlePinCheck = async () => {
    try {
      setStatusMessage("Verifying PIN...");

      // Example Firestore check for a user doc with matching PIN
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("pin", "==", pin));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // PIN match
        setIsUserValid(true);
        setStatusMessage("PIN validated! You are authorized.");
        // Redirect to /user after a short delay
        setTimeout(() => {
          router.push("/user");
        }, 1000);
      } else {
        // No docs matched => invalid PIN
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
          PIN-Only Authentication
        </h1>

        {/* PIN Input & Verification Button */}
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
            className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition"
          >
            Verify PIN
          </button>
        </div>

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
        {isUserValid === null && statusMessage && (
          <div className="mt-6 py-2 px-4 text-gray-700">{statusMessage}</div>
        )}
      </div>
    </div>
  );
};

export default PinCheckOnly;
