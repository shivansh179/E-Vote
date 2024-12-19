"use client";

import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, setDoc, doc, deleteDoc } from "firebase/firestore";
import { Blockchain, BlockData } from "../../blockchain";
import { saveBlockchainToFirebase, loadBlockchainFromFirebase } from "@/firebaseHelpers";

const votingBlockchain = new Blockchain();

const UserPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const usersQuery = query(collection(db, "users"), where("email", "==", email));
      const userSnapshot = await getDocs(usersQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password === password) {
          setIsAuthenticated(true);
          fetchCandidates();
          loadBlockchain();
        } else {
          alert("Invalid password!");
        }
      } else {
        alert("Email not found!");
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
    } finally {
      setLoading(false);
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (candidateId: string) => {
    setLoading(true);
    try {
      const voteData: BlockData = {
        userId: email,
        candidateId,
        timestamp: new Date().toISOString(),
      };

      // Save vote to database
      const voteRef = doc(collection(db, "votes"));
      await setDoc(voteRef, voteData);

      // Add vote to blockchain
      votingBlockchain.addBlock(voteData);

      // Save blockchain to Firebase
      await saveBlockchainToFirebase(votingBlockchain);

      // Remove user credentials from "users" collection
      const usersQuery = query(collection(db, "users"), where("email", "==", email));
      const userSnapshot = await getDocs(usersQuery);
      if (!userSnapshot.empty) {
        const userDocId = userSnapshot.docs[0].id;
        await deleteDoc(doc(db, "users", userDocId));
      }

      setHasVoted(true);
      alert("Vote submitted successfully!");
    } catch (error) {
      console.error("Error submitting vote:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockchain = async () => {
    setLoading(true);
    try {
      await loadBlockchainFromFirebase(votingBlockchain);
      if (!votingBlockchain.isChainValid()) {
        console.error("Blockchain integrity compromised!");
        alert("Blockchain integrity check failed!");
      }
    } catch (error) {
      console.error("Error loading blockchain:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockchain();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white shadow-lg rounded-lg p-6 w-96">
          <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">Login</h1>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSignIn}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 w-96">
        {hasVoted ? (
          <h1 className="text-2xl font-bold text-center text-green-600">Thank you for voting!</h1>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Select a Candidate</h1>
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between mb-4">
                  <span className="text-gray-800">{candidate.name}</span>
                  <button
                    onClick={() => handleVote(candidate.id)}
                    className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
                  >
                    Vote
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserPage;
