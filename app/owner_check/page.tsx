"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore"; // Import updateDoc, doc, arrayUnion
import { FaEnvelope, FaLock, FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";

const PinCheckOnly: React.FC = () => {
  const [isUserValid, setIsUserValid] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const router = useRouter();

  /**
   * Step 1: Handle Email Submission and Checkpoints
   */
  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setIsUserValid(false);
      setStatusMessage("Please enter your email.");
      return;
    }

    try {
      setStatusMessage("Verifying prior steps...");
      setIsUserValid(null); // Reset validation state
      setIsLoading(true); // Start loading

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

      // Check if 'checkpoints' exists and is an array
      if (!Array.isArray(userData.checkpoints) || userData.checkpoints.length === 0) {
        setIsUserValid(false);
        setStatusMessage("Incomplete setup. Please complete face verification first.");
        // Redirect to face verification
        setTimeout(() => {
          router.push("/face_verification");
        }, 2000);
        return;
      }

      // Get the first element of checkpoints
      const firstCheckpoint = userData.checkpoints[0];

      if (firstCheckpoint !== "face_detected") {
        setIsUserValid(false);
        setStatusMessage("Please complete prior steps before verifying PIN.");
        // Redirect to face verification
        setTimeout(() => {
          router.push("/face_verification");
        }, 2000);
        return;
      }

      // If all checks pass
      setIsUserValid(true);
      setStatusMessage("All prior steps completed. Please enter your PIN.");
    } catch (error) {
      console.error("Error verifying checkpoints:", error);
      setIsUserValid(false);
      setStatusMessage("Error verifying checkpoints. Please try again.");
    } finally {
      setIsLoading(false); // End loading
    }
  };

  /**
   * Step 2: Handle PIN Verification
   */
  const handlePinCheck = async () => {
    if (!pin.trim()) {
      setIsUserValid(false);
      setStatusMessage("Please enter your PIN.");
      return;
    }

    try {
      setStatusMessage("Verifying PIN...");
      setIsUserValid(null); // Reset validation state
      setIsLoading(true); // Start loading

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
      const userDocSnapshot = querySnapshot.docs[0];
      const userData = userDocSnapshot.data();

      // Check if the pin matches
      if (userData.pin === pin) {
        // PIN match
        setIsUserValid(true);
        setStatusMessage("PIN validated! You are authorized.");

        // Update checkpoints with 'pin_validated'
        try {
          const userDocRef = doc(db, "users", userDocSnapshot.id);
          await updateDoc(userDocRef, {
            checkpoints: arrayUnion("pin_validated"),
          });
          console.log("Checkpoint 'pin_validated' added successfully.");
        } catch (updateError) {
          console.error("Error updating checkpoints:", updateError);
          // Optionally, you can handle this error (e.g., notify the user)
          setStatusMessage("PIN validated, but failed to update checkpoints.");
        }

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
    } finally {
      setIsLoading(false); // End loading
    }
  };

  /**
   * Automatically check checkpoints on page load
   */
  useEffect(() => {
    // If email is already provided, verify checkpoints
    if (email.trim()) {
      handleEmailSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center
                 bg-gradient-to-r from-gray-800 via-gray-900 to-black px-4"
    >
      <div className="w-full max-w-md p-10 bg-white bg-opacity-90 shadow-2xl rounded-3xl relative">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-indigo-600">
          🔒 PIN Authentication
        </h1>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-75 rounded-3xl z-10">
            <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4" />
            <p className="text-indigo-600">Processing...</p>
          </div>
        )}

        {/* Step 1: Email Submission */}
        {!isLoading && isUserValid === null && (
          <>
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

            {/* Verify Email Button */}
            <button
              onClick={handleEmailSubmit}
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:from-purple-600 hover:to-indigo-700 transition duration-300 flex items-center justify-center ${
                isLoading ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </button>
          </>
        )}

        {/* Step 2: PIN Input Form - Shown only if prior steps are completed */}
        {!isLoading && isUserValid && (
          <>
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

            {/* Verify PIN Button */}
            <button
              onClick={handlePinCheck}
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:from-purple-600 hover:to-indigo-700 transition duration-300 flex items-center justify-center ${
                isLoading ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Verifying...
                </>
              ) : (
                <>
                  <FaCheckCircle className="mr-2" /> Verify PIN
                </>
              )}
            </button>
          </>
        )}

        {/* Status / Result Message */}
        {!isLoading && statusMessage && (
          <div
            className={`mt-6 py-3 px-4 rounded-lg flex flex-col items-center justify-center ${
              isUserValid
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isUserValid ? (
              <FaCheckCircle className="mr-2 text-2xl" />
            ) : (
              <FaTimesCircle className="mr-2 text-2xl" />
            )}
            <p className="text-center">{statusMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinCheckOnly;
