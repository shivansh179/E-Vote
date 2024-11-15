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
  const [candidateIdForVoter, setCandidateIdForVoter] = useState("");
  const [userDetails, setUserDetails] = useState<any>(null);

  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === "prashansa.erica@gmail.com") {
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

  // Styling classes for light and dark themes
  const containerStyle = theme === "light" ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-gray-200";
  const boxStyle = theme === "light" ? "bg-white" : "bg-gray-800 border border-gray-700";
  const inputStyle = theme === "light" ? "text-gray-900" : "text-black bg-gray-100";
  const buttonStyle = theme === "light" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600";

  return (
    <>
      <Navbar />
      <div className={`min-h-screen p-8 ${containerStyle}`}>
        <h1 className="text-3xl font-semibold text-center text-indigo-600 mb-8">Admin Dashboard</h1>
        
        <div className={`${boxStyle} p-6 rounded-lg shadow-md mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Add Temporary Voter</h2>
          <input
            type="email"
            placeholder="Voter Email"
            onChange={(e) => setVoterEmail(e.target.value)}
            className={`w-full p-3 border rounded-md mb-4 ${inputStyle}`}
          />
          <input
            type="password"
            placeholder="Voter Password"
            onChange={(e) => setVoterPassword(e.target.value)}
            className={`w-full p-3 border rounded-md mb-4 ${inputStyle}`}
          />
          <button
            onClick={handleAddVoter}
            className={`w-full ${buttonStyle} text-white p-3 rounded-md transition`}
          >
            Add Voter
          </button>
        </div>

        <div className={`${boxStyle} p-6 rounded-lg shadow-md mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Add Candidate</h2>
          <input
            type="text"
            placeholder="Candidate Name"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            className={`w-full p-3 border rounded-md mb-4 ${inputStyle}`}
          />
          <button
            onClick={handleAddCandidate}
            className={`w-full ${buttonStyle} text-white p-3 rounded-md transition`}
          >
            Add Candidate
          </button>
        </div>

        <div className={`${boxStyle} p-6 rounded-lg shadow-md mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Candidates</h2>
          {candidates.length > 0 ? (
            <ul>
              {candidates.map((candidate) => (
                candidate.id ? (
                  <li key={candidate.id} className="flex justify-between items-center p-4 border-b border-gray-200 mb-2">
                    <span className={`${theme === "light" ? "text-black" : "text-white"}`}>{candidate.name}</span>
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

        <div className={`${boxStyle} p-6 rounded-lg shadow-md mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Vote Results</h2>
          {votes.length > 0 ? (
            <ul>
              {votes.map((vote, index) => (
                <li key={index} className="p-2 border-b border-gray-200 mb-2">
                  {`Candidate ID: ${vote.candidateId}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No votes yet.</p>
          )}
        </div>

        <div className={`${boxStyle} p-6 rounded-lg shadow-md`}>
          <h2 className="text-xl font-semibold mb-4">Search Voter by Candidate ID</h2>
          <input
            type="text"
            placeholder="Enter Candidate ID"
            onChange={(e) => setCandidateIdForVoter(e.target.value)}
            className={`w-full p-3 border rounded-md mb-4 ${inputStyle}`}
          />
          <button
            onClick={handleGetVoterDetails}
            className={`w-full ${buttonStyle} text-white p-3 rounded-md transition`}
          >
            Get Voter Details
          </button>
          {userDetails && (
            <div className="mt-4 text-left">
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
