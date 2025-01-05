"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { FaEnvelope, FaLock, FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";

const PinCheckOnly: React.FC = () => {
  const [isUserValid, setIsUserValid] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Additional fields
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const router = useRouter();

  /**
   * 1) Check the user’s email against Firestore.
   * 2) If doc is found, compare the stored pin with the user-entered pin.
   * 3) If matches => redirect; otherwise => error.
   */
  const handlePinCheck = async () => {
    try {
      setStatusMessage("Verifying email and PIN...");
      setIsUserValid(null); // Reset validation state

      // Firestore reference
      const usersRef = collection(db, "users");
      // Query for a doc with matching email
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // No user doc for this email
        setIsUserValid(false);
        setStatusMessage("No user found with that email. Access denied.");
        return;
      }

      // For simplicity, assume only one doc per email
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Check if the pin matches
      if (userData.pin === pin) {
        // PIN match
        setIsUserValid(true);
        setStatusMessage("PIN validated! You are authorized.");
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/user");
        }, 1500);
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
                 bg-gradient-to-r from-gray-800 via-gray-900 to-black px-4"
    >
      <div className="w-full max-w-md p-10 bg-white bg-opacity-90 shadow-2xl rounded-3xl">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-indigo-600">
          🔒 PIN Authentication
        </h1>

        {/* Email Input */}
        <div className="mb-6">
          <label htmlFor="email" className="text-indigo-700 text-sm font-medium mb-2 flex items-center">
            <FaEnvelope className="mr-2" /> Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-200 transition duration-300"
          />
        </div>

        {/* PIN Input */}
        <div className="mb-6">
          <label htmlFor="pin" className="text-indigo-700 text-sm font-medium mb-2 flex items-center">
            <FaLock className="mr-2" /> PIN
          </label>
          <input
            id="pin"
            type="password"
            placeholder="Enter your PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-200 transition duration-300"
          />
        </div>

        {/* Verify Button */}
        <button
          onClick={handlePinCheck}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:from-purple-600 hover:to-indigo-700 transition duration-300 flex items-center justify-center"
        >
          {isUserValid === null && statusMessage && (
            <>
              <FaSpinner className="animate-spin mr-2" /> Verifying...
            </>
          )}
          {isUserValid !== null && isUserValid && (
            <>
              <FaCheckCircle className="mr-2" /> Verified
            </>
          )}
          {isUserValid !== null && isUserValid === false && (
            <>
              <FaTimesCircle className="mr-2" /> Verify PIN
            </>
          )}
          {isUserValid === null && !statusMessage && "Verify"}
        </button>

        {/* Status / Result Message */}
        {statusMessage && (
          <div
            className={`mt-6 py-3 px-4 rounded-lg flex items-center justify-center ${
              isUserValid
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isUserValid ? <FaCheckCircle className="mr-2" /> : <FaTimesCircle className="mr-2" />}
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinCheckOnly;
