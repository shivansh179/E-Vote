"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/components/ThemeContext";

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [voterEmail, setVoterEmail] = useState("");
  const [voterPassword, setVoterPassword] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [voterDetails, setVoterDetails] = useState<any>(null);
  const [candidateIdForVoter, setCandidateIdForVoter] = useState("");
  const [userDetails, setUserDetails] = useState<any>(null);

  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push("/auth");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchCandidates = async () => {
      const candidatesSnapshot = await getDocs(collection(db, "candidates"));
      setCandidates(candidatesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    const fetchVotes = async () => {
      const voteSnapshot = await getDocs(collection(db, "votes"));
      setVotes(voteSnapshot.docs.map((doc) => doc.data()));
    };

    fetchCandidates();
    fetchVotes();
  }, []);

  const handleAddVoter = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, voterEmail, voterPassword);
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        email: voterEmail,
        password: voterPassword,
        role: "voter",
      });
      setVoterEmail("");
      setVoterPassword("");
      alert("Temporary voter created successfully.");
    } catch (error) {
      console.error("Error creating voter", error);
      alert("Error creating voter. Please try again.");
    }
  };

  const handleAddCandidate = async () => {
    try {
      if (candidateName.trim() === "") {
        alert("Please provide a valid candidate name.");
        return;
      }
      await addDoc(collection(db, "candidates"), { name: candidateName });
      setCandidateName("");
      alert("Candidate added successfully.");
    } catch (error) {
      console.error("Error adding candidate", error);
      alert("Error adding candidate. Please try again.");
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      await deleteDoc(doc(db, "candidates", candidateId));
      alert("Candidate deleted successfully.");
      setCandidates(candidates.filter((candidate) => candidate.id !== candidateId));
    } catch (error) {
      console.error("Error deleting candidate", error);
      alert("Error deleting candidate. Please try again.");
    }
  };

  const handleGetVoterDetails = async () => {
    try {
      const votesQuery = query(
        collection(db, "votes"),
        where("candidateId", "==", candidateIdForVoter)
      );
      const voteSnapshot = await getDocs(votesQuery);

      if (voteSnapshot.empty) {
        alert("No votes found for this candidate.");
        return;
      }

      const voteDoc = voteSnapshot.docs[0];
      const userId = voteDoc.data().userId;

      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        alert("User not found.");
        return;
      }

      const userData = userDoc.data();
      setUserDetails(userData);
    } catch (error) {
      console.error("Error fetching voter details", error);
      alert("Error fetching voter details. Please try again.");
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // Inline AddVoter component
  const AddVoter = () => (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-8 ${theme === "light" ? "bg-gray-100" : "bg-gray-900 border-2 border-white"}`}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme === "light" ? "text-black" : "text-white"}`}>Add Temporary Voter</h2>
      <input
        type="email"
        placeholder="Voter Email"
        onChange={(e) => setVoterEmail(e.target.value)}
        className="p-3 border border-gray-300 rounded-md mb-4 w-full"
      />
      <input
        type="password"
        placeholder="Voter Password"
        onChange={(e) => setVoterPassword(e.target.value)}
        className="p-3 border border-gray-300 rounded-md mb-4 w-full"
      />
      <button
        onClick={handleAddVoter}
        className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition"
      >
        Add Voter
      </button>
    </div>
  );

  // Inline AddCandidate component
  const AddCandidate = () => (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-8 ${theme === "light" ? "bg-gray-100" : "bg-gray-900 border-2 border-white"}`}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme === "light" ? "text-black" : "text-white"}`}>Add Candidate</h2>
      <input
        type="text"
        placeholder="Candidate Name"
        value={candidateName}
        onChange={(e) => setCandidateName(e.target.value)}
        className="p-3 border border-gray-300 rounded-md mb-4 w-full"
      />
      <button
        onClick={handleAddCandidate}
        className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition"
      >
        Add Candidate
      </button>
    </div>
  );

  // Inline DisplayCandidates component
  const DisplayCandidates = () => (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-8 ${theme === "light" ? "bg-gray-100" : "bg-gray-900 border-2 border-white"}`}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme === "light" ? "text-black" : "text-white"}`}>Candidates</h2>
      {candidates.length > 0 ? (
        <ul>
          {candidates.map((candidate) => (
            candidate.id ? (
              <li
                key={candidate.id}
                className="flex justify-between items-center p-4 border-b border-gray-200 mb-2"
              >
                <span className={`text-lg font-semibold ${theme === "light" ? "text-black" : "text-white"}`}>{candidate.name}</span>
                <button
                  onClick={() => handleDeleteCandidate(candidate.id)}
                  className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </li>
            ) : null
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No candidates added yet.</p>
      )}
    </div>
  );

  // Inline DisplayVotes component
  const DisplayVotes = () => (
    <div className={`bg-white p-6 rounded-lg shadow-md ${theme === "light" ? "bg-gray-100" : "bg-gray-900 border-2 border-white"}`}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme === "light" ? "text-black" : "text-white"}`}>Vote Results</h2>
      <ul>
        {votes.length > 0 ? (
          votes.map((vote, index) => (
            <li key={index} className={`p-2 border-b border-gray-200 mb-2 ${theme === "light" ? "text-black" : "text-white"}`}>
              {`Candidate ID: ${vote.candidateId}`}
            </li>
          ))
        ) : (
          <p className="text-gray-500">No votes yet.</p>
        )}
      </ul>
    </div>
  );

  return (
    <>
      <Navbar />
      <div className={`bg-gray-100 min-h-screen p-8 ${theme === "light" ? "bg-gray-100" : "bg-gray-900"}`}>
        <h1 className="text-3xl font-semibold text-center text-indigo-600 mb-8">Admin Dashboard</h1>
        <AddVoter />
        <AddCandidate />
        <DisplayCandidates />
        <DisplayVotes />
        {/* Get Voter Details */}
        <div className={`bg-white p-6 mt-10 rounded-lg shadow-md mb-8 ${theme === "light" ? "bg-gray-100" : "bg-gray-900 border-2 border-white"}`}>
          <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme === "light" ? "text-black" : "text-white"}`}>Search Voter by Candidate ID</h2>
          <input
            type="text"
            placeholder="Enter Candidate ID"
            onChange={(e) => setCandidateIdForVoter(e.target.value)}
            className="p-3 border border-gray-300 rounded-md mb-4 w-full"
          />
          <button
            onClick={handleGetVoterDetails}
            className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition"
          >
            Get Voter Details
          </button>
          {userDetails && (
            <div className="mt-4">
              <h3 className="font-semibold">Voter Details:</h3>
              <p><strong>Email:</strong> {userDetails.email}</p>
              <p><strong>Role:</strong> {userDetails.role}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminPage;
