"use client";

import { useState, useEffect, AwaitedReactNode, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react";
import { db, auth } from "../../firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/components/ThemeContext"; // Import your theme context


interface AddVoterProps {
  setVoterEmail: (email: string) => void;
  setVoterPassword: (password: string) => void;
  handleAddVoter: () => void;
}

interface AddCandidateProps {
  candidateName: string;
  setCandidateName: (name: string) => void;
  handleAddCandidate: () => void;
}

interface DisplayCandidatesProps {
  candidates: { id: string ; name: string }[]; // Use array of objects
  handleDeleteCandidate: (id: string) => void; // This should be a function

}



// Component to add a temporary voter
const AddVoter: React.FC<AddVoterProps> = ({ setVoterEmail, setVoterPassword, handleAddVoter }) => {
 
  
  const { theme } = useTheme();

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-8 ${theme == 'light' ? 'bg-gray-100' : 'bg-gray-900 border-2 border-white'} `}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme == 'light' ? 'text-black' : 'text-white'}`}>Add Temporary Voter</h2>
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
  )
};

// Component to add a candidate
const AddCandidate: React.FC<AddCandidateProps> = ({ candidateName, setCandidateName, handleAddCandidate }) => {
  const { theme } = useTheme(); // Access theme and toggle function

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-8 ${theme == 'light' ? 'bg-gray-100':'bg-gray-900 border-2 border-white'}`}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-7001 ${theme == 'light' ? 'text-black' : 'text-white'} `}>Add Candidate</h2>
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
  )
};

// Component to display candidates
const DisplayCandidates: React.FC<DisplayCandidatesProps> = ({ candidates, handleDeleteCandidate }) => {
  const { theme } = useTheme();

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-8 ${theme == 'light' ? 'bg-gray-100' : 'bg-gray-900 border-2 border-white'} `}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme == 'light' ? 'text-black' : 'text-white'} `}>Candidates</h2>
      {candidates.length > 0 ? (
        <ul>
          {candidates.map((candidate) => (
            candidate.id ? (
              <li
                key={candidate.id}
                className="flex justify-between items-center p-4 border-b border-gray-200 mb-2"
              >
                <span className={`text-lg font-semibold ${theme == 'light' ? 'text-black' : 'text-white'} `}>{candidate.name}</span>
                <button
                  onClick={() => handleDeleteCandidate(candidate.id as string)}
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
  )
};

interface Vote {
  candidateId: string;
}

// Component to display votes
const DisplayVotes: React.FC<{ votes: Vote[] }> = ({ votes }) => {

  const { theme } = useTheme();
  return (
  
    <div className={`bg-white p-6 rounded-lg shadow-md  ${theme === "light" ? "bg-gray-100" : "bg-gray-900 border-2 border-white"}`}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme == 'light' ? 'text-black':'text-white'}`}>Vote Results</h2>
      <ul>
        {votes.length > 0 ? (
          votes.map((vote: { candidateId: any; }, index: Key | null | undefined) => (
            <li key={index} className={`p-2 border-b border-gray-200 mb-2 ${theme == 'light' ? 'text-black' : 'text-white'}`}>
              {`Candidate ID: ${vote.candidateId}`}
            </li>
          ))
        ) : (
          <p className="text-gray-500">No votes yet.</p>
        )}
      </ul>
    </div>
  )
};

// Admin page component
const AdminPage = () => {
  const [voterEmail, setVoterEmail] = useState("");
  const [voterPassword, setVoterPassword] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [voterDetails, setVoterDetails] = useState<any>(null);
  const [candidateIdForVoter, setCandidateIdForVoter] = useState("");
  const [userDetails, setUserDetails] = useState<any>(null);

  // Fetch candidates and votes when the component loads
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

  // Function to add a temporary voter
 // Function to add a temporary voter
const handleAddVoter = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, voterEmail, voterPassword);
    
    // Save email, password, and role in the "users" collection
    await addDoc(collection(db, "users"), {
      uid: userCredential.user.uid,
      email: voterEmail,
      password: voterPassword, // Storing the password directly (not recommended for production)
      role: "voter",
    });
    
    // Clear input fields after voter creation
    setVoterEmail("");
    setVoterPassword("");
    alert("Temporary voter created successfully.");
  } catch (error) {
    console.error("Error creating voter", error);
    alert("Error creating voter. Please try again.");
  }
};


  // Function to add a candidate
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

  // Function to delete a candidate
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

  // Function to get voter details based on candidate ID
  // import { doc, getDoc } from "firebase/firestore"; // Use getDoc, not getDocs
// 
// Function to get voter details based on candidate ID
 const handleGetVoterDetails = async () => {
    try {
      // 1. First, fetch the userId using the candidateId from the `votes` collection
      const votesQuery = query(
        collection(db, "votes"),
        where("candidateId", "==", candidateIdForVoter) // Find votes with the specific candidateId
      );
      const voteSnapshot = await getDocs(votesQuery);

      if (voteSnapshot.empty) {
        alert("No votes found for this candidate.");
        return;
      }

      // Assuming there will only be one vote record for each candidate, or you can adjust this logic
      const voteDoc = voteSnapshot.docs[0];
      const userId = voteDoc.data().userId;

      // 2. Now, fetch the user details using the userId from the `users` collection's document ID
      const userDocRef = doc(db, "users", userId); // Reference to the user document using the userId as the document ID
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        alert("User not found.");
        return;
      }

      // Get the user data from the document
      const userData = userDoc.data();

      // Set the user details in the state to display
      setUserDetails(userData);

    } catch (error) {
      console.error("Error fetching voter details", error);
      alert("Error fetching voter details. Please try again.");
    }
  };

  const { theme, toggleTheme } = useTheme(); // Access theme and toggle function

  return (
    <>
      
      <Navbar/>
      <div className={`bg-gray-100 min-h-screen p-8  ${theme === "light" ? "bg-gray-100" : "bg-gray-900"}`}>
      <h1 className="text-3xl font-semibold text-center text-indigo-600 mb-8">Admin Dashboard</h1>

      {/* Add Temporary Voter */}
      <AddVoter
        setVoterEmail={setVoterEmail}
        setVoterPassword={setVoterPassword}
        handleAddVoter={handleAddVoter}
      />

      {/* Add Candidate */}
      <AddCandidate
        candidateName={candidateName}
        setCandidateName={setCandidateName}
        handleAddCandidate={handleAddCandidate}
      />

      {/* Display Candidates */}
      <DisplayCandidates
        candidates={candidates}
        handleDeleteCandidate={handleDeleteCandidate}
      />

      {/* Display Votes */}
      <DisplayVotes votes={votes} />

      {/* Get Voter Details */}
      <div className={`bg-white p-6 mt-10 rounded-lg shadow-md mb-8 ${theme === "light" ? "bg-gray-100" : "bg-gray-900 border-2 border-white"} `}>
          <h2 className={`text-xl font-semibold mb-4 text-gray-700 ${theme == 'light' ? 'text-black':'text-white'} `}>Search Voter by Candidate ID</h2>
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
            {/* <p><strong>Name:</strong> {userDetails.name}</p> */}
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
