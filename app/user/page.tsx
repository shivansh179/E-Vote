"use client";

import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs, CollectionReference, DocumentData } from "firebase/firestore";
import { Blockchain } from "../../blockchain";
import { Block } from "../../blockchain";

const votingBlockchain = new Blockchain();

const UserPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [blockchainData, setBlockchainData] = useState<Block[]>([]);

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
          loadBlockchain();
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
    const candidatesList = candidatesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unnamed Candidate",
      };
    });
    setCandidates(candidatesList);
  };

  const checkIfVoted = async (uid: string) => {
    const voteQuery = query(collection(db, "votes"), where("userId", "==", uid));
    const voteSnapshot = await getDocs(voteQuery);
    if (!voteSnapshot.empty) {
      setHasVoted(true);
    }
  };

  const handleVote = async (candidateId: string) => {
    if (!userId) return;

    try {
      const voteQuery = query(collection(db, "votes"), where("userId", "==", userId));
      const voteSnapshot = await getDocs(voteQuery);

      if (!voteSnapshot.empty) {
        alert("You have already voted!");
        return;
      }

      const voteData = {
        userId,
        candidateId,
        timestamp: new Date().toISOString(),
      };

      votingBlockchain.addBlock(voteData);

      await addDoc(collection(db, "votes"), {
        userId,
        candidateId,
        timestamp: new Date().toISOString(),
      });

      setHasVoted(true);
      alert("Thank you for voting! Your vote is securely recorded.");
    } catch (error) {
      console.error("Error submitting vote", error);
      alert("Failed to vote. Please try again.");
    }
  };

  const loadBlockchain = async () => {
    try {
      const blockchainSnapshot = await getDocs(collection(db, "blockchain"));
      if (!blockchainSnapshot.empty) {
        const chain = blockchainSnapshot.docs[0].data()?.chain || [];
        votingBlockchain.loadChain(chain);
        setBlockchainData(votingBlockchain.getChain());
      }
    } catch (error) {
      console.error("Error loading blockchain data", error);
    }
  };

  useEffect(() => {
    loadBlockchain();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
      <div className="max-w-md w-full p-8 rounded-lg shadow-lg bg-white">
        {!isAuthenticated ? (
          <div>
            <h1 className="text-3xl font-bold text-center text-blue-600">User Login</h1>
            <p className="text-xl mb-6 text-red-300 text-center">
              Please provide your credentials provided by the election commission for voting.
            </p>
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
          <div className="text-center animate-fade-in">
            <div className="relative mx-auto w-64 h-64 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <h2 className="text-white text-4xl font-bold">🎉</h2>
            </div>
            <h2 className="text-2xl font-bold text-blue-600 mt-6">Thank You!</h2>
            <p className="text-gray-600 mt-4">You have successfully voted.</p>
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
function addDoc(arg0: CollectionReference<DocumentData, DocumentData>, arg1: { userId: string; candidateId: string; timestamp: string; }) {
  throw new Error("Function not implemented.");
}

