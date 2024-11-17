"use client";

import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, setDoc, doc } from "firebase/firestore";
import { Blockchain, BlockData } from "../../blockchain";
import { saveBlockchainToFirebase, loadBlockchainFromFirebase } from "@/firebaseHelpers";

const votingBlockchain = new Blockchain();

const UserPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
  const [hasVoted, setHasVoted] = useState(false);

  const handleSignIn = async () => {
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
    }
  };

  const fetchCandidates = async () => {
    const candidatesSnapshot = await getDocs(collection(db, "candidates"));
    const candidatesList = candidatesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || "Unnamed Candidate",
    }));
    setCandidates(candidatesList);
  };

  const handleVote = async (candidateId: string) => {
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

      setHasVoted(true);
      alert("Vote submitted successfully!");
    } catch (error) {
      console.error("Error submitting vote:", error);
    }
  };

  const loadBlockchain = async () => {
    await loadBlockchainFromFirebase(votingBlockchain);
    if (!votingBlockchain.isChainValid()) {
      console.error("Blockchain integrity compromised!");
      alert("Blockchain integrity check failed!");
    }
  };

  useEffect(() => {
    loadBlockchain();
  }, []);

  if (!isAuthenticated) {
    return (
      <div>
        <h1>Login</h1>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleSignIn}>Sign In</button>
      </div>
    );
  }

  return (
    <div>
      {hasVoted ? (
        <h1>Thank you for voting!</h1>
      ) : (
        <div>
          <h1>Select a Candidate</h1>
          {candidates.map((candidate) => (
            <div key={candidate.id}>
              <span>{candidate.name}</span>
              <button onClick={() => handleVote(candidate.id)}>Vote</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserPage;
