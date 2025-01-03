"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { Blockchain, BlockData } from "../../blockchain";
import {
  saveBlockchainToFirebase,
  loadBlockchainFromFirebase,
} from "@/firebaseHelpers";
import { FaSun, FaMoon } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const votingBlockchain = new Blockchain();

const UserPage: React.FC = () => {
  const router = useRouter();

  // Default to dark mode
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Theme toggler
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Login & voting states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // THEMED TAILWIND CLASSES
  // -----------------------------
  const containerStyle =
    theme === "dark"
      ? // Dark Mode: Vibrant gradient background
        "min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-gray-100 relative px-4 transition-all duration-300"
      : // Light Mode: Softer gradient background
        "min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 text-gray-800 relative px-4 transition-all duration-300";

  const cardStyle =
    theme === "dark"
      ? // Dark Mode card with colorful border on hover
        "relative bg-gray-800 shadow-xl rounded-lg p-6 w-full max-w-md text-gray-100 transform transition-transform duration-300 hover:scale-105 hover:ring-4 hover:ring-purple-400"
      : // Light Mode card with colorful border on hover
        "relative bg-white shadow-xl rounded-lg p-6 w-full max-w-md text-gray-800 transform transition-transform duration-300 hover:scale-105 hover:ring-4 hover:ring-purple-200";

  const headingStyle =
    "text-3xl md:text-4xl font-extrabold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-500";

  const inputStyle =
    theme === "dark"
      ? "w-full p-3 mb-4 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
      : "w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400";

  const buttonCommon =
    "w-full py-3 px-4 rounded-lg font-semibold transform transition-colors duration-300";

  const buttonDisabled = "cursor-not-allowed opacity-70";
  const buttonEnabled =
    "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2";

  // Theme Toggle Button
  const ThemeToggleButton = () => (
    <div
      className="absolute top-2 left-2 p-2 rounded-full bg-gray-700 text-white shadow-md cursor-pointer flex items-center justify-center hover:bg-gray-600 transition-colors"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <FaSun size={20} /> : <FaMoon size={20} />}
    </div>
  );

  // -----------------------------
  // SIGN-IN LOGIC
  // -----------------------------
  const handleSignIn = async () => {
    setLoading(true);
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", email)
      );
      const userSnapshot = await getDocs(usersQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password === password) {
          setIsAuthenticated(true);
          fetchCandidates();
          loadBlockchain();
          toast.success("Signed in successfully!");
        } else {
          toast.error("Invalid password!");
        }
      } else {
        toast.error("Email not found!");
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
      toast.error("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // FETCH CANDIDATES
  // -----------------------------
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const candidatesSnapshot = await getDocs(collection(db, "candidates"));
      const candidatesList = candidatesSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unnamed Candidate",
      }));
      setCandidates(candidatesList);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Unable to fetch candidates.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // VOTE SUBMISSION
  // -----------------------------
  const handleVote = async (candidateId: string) => {
    setLoading(true);
    try {
      const voteData: BlockData = {
        userId: email,
        candidateId,
        timestamp: new Date().toISOString(),
      };

      // Save vote to Firestore
      const newVoteDoc = doc(collection(db, "votes"));
      await setDoc(newVoteDoc, voteData);

      // Add vote to blockchain
      votingBlockchain.addBlock(voteData);
      // Save blockchain to Firebase
      await saveBlockchainToFirebase(votingBlockchain);

      // Remove user credentials after voting
      const usersQueryRef = query(
        collection(db, "users"),
        where("email", "==", email)
      );
      const userSnapshot = await getDocs(usersQueryRef);
      if (!userSnapshot.empty) {
        const userDocId = userSnapshot.docs[0].id;
        await deleteDoc(doc(db, "users", userDocId));
      }

      setHasVoted(true);
      toast.success("Vote submitted successfully!");
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error("Error submitting vote.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // LOAD BLOCKCHAIN
  // -----------------------------
  const loadBlockchain = async () => {
    setLoading(true);
    try {
      await loadBlockchainFromFirebase(votingBlockchain);
      if (!votingBlockchain.isChainValid()) {
        console.error("Blockchain integrity compromised!");
        toast.error("Blockchain integrity check failed!");
      }
    } catch (error) {
      console.error("Error loading blockchain:", error);
      toast.error("Failed to load blockchain.");
    } finally {
      setLoading(false);
    }
  };

  // On mount, load blockchain
  useEffect(() => {
    loadBlockchain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // RENDER: AUTH NOT COMPLETE
  // -----------------------------
  if (!isAuthenticated) {
    return (
      <div className={containerStyle}>
        <ThemeToggleButton />

        <div className={cardStyle}>
          <h1 className="text-2xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500">
            Login
          </h1>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputStyle}
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // Extra margin on the last input
            className={inputStyle.replace("mb-4", "mb-6")}
          />
          <button
            onClick={handleSignIn}
            disabled={loading}
            className={
              loading
                ? `${buttonCommon} ${buttonDisabled} bg-pink-500 text-white`
                : `${buttonCommon} ${buttonEnabled} bg-pink-500 hover:bg-pink-600 text-white`
            }
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </div>

        {/* Toast Container */}
        <Toaster />
      </div>
    );
  }

  // -----------------------------
  // RENDER: AUTH COMPLETE
  // -----------------------------
  return (
    <div className={containerStyle}>
      <ThemeToggleButton />

      <div className={cardStyle}>
        {hasVoted ? (
          <h1 className="text-2xl font-extrabold text-center text-green-300 animate-pulse">
            Thank you for voting!
          </h1>
        ) : (
          <>
            <h1 className={headingStyle}>Select a Candidate</h1>
            {loading ? (
              <div className="flex items-center justify-center">
                {/* Animated spinner with pink accent */}
                <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between mb-4"
                >
                  <span className="font-semibold">{candidate.name}</span>
                  <button
                    onClick={() => handleVote(candidate.id)}
                    className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    Vote
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Toast Container */}
      <Toaster />
    </div>
  );
};

export default UserPage;
