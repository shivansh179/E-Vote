"use client"

import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const UserPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [userId, setUserId] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const router = useRouter();

  const handleSignIn = async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password === password) {
          setIsAuthenticated(true);
          setUserId(userDoc.id);
          checkIfVoted(userDoc.id);
          fetchCandidates();
        } else {
          alert("Invalid password. Please try again.");
        }
      } else {
        alert("Email not found. Please check your email and try again.");
      }
    } catch (error) {
      console.error("Error during sign in", error);
      alert("Failed to sign in. Please try again.");
    }
  };

  const fetchCandidates = async () => {
    const candidatesSnapshot = await getDocs(collection(db, "candidates"));
    setCandidates(candidatesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const checkIfVoted = async (uid) => {
    const voteQuery = query(collection(db, "votes"), where("userId", "==", uid));
    const voteSnapshot = await getDocs(voteQuery);
    if (!voteSnapshot.empty) {
      setHasVoted(true);
    }
  };

  const handleVote = async (candidateId) => {
    if (!userId) return;
    try {
      await addDoc(collection(db, "votes"), {
        userId,
        candidateId,
      });
      setHasVoted(true);
      alert("Thank you for voting!");
    } catch (error) {
      console.error("Error submitting vote", error);
      alert("Failed to vote. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
      <div className="max-w-md w-full p-8 rounded-lg shadow-lg bg-white">
        {!isAuthenticated ? (
          <div>
            <h1 className="text-3xl font-bold text-center text-blue-600 ">User Login</h1>
            <p className="text-1xl mb-6 text-red-300 text-center">Please provide your credential provided by election commission for temporary voting</p>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleSignIn}
                className="w-full bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Sign In
              </button>
            </div>
          </div>
        ) : hasVoted ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800">You have already voted. Thank you!</h2>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">Vote for a Candidate</h1>
            <div className="space-y-4">
              {candidates.length > 0 ? (
                candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-4 bg-blue-50 rounded-lg shadow hover:shadow-lg transition border border-blue-200"
                  >
                    <h3 className="font-semibold text-gray-800">{candidate.name}</h3>
                    <button
                      onClick={() => handleVote(candidate.id)}
                      className="mt-2 bg-green-500 text-white font-semibold py-1 px-4 rounded-lg hover:bg-green-600 transition"
                    >
                      Vote
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">Loading candidates...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPage;
