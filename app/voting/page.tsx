"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import toast, { Toaster } from "react-hot-toast";
import {
  FaSun,
  FaMoon,
  FaPoll,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
} from "react-icons/fa";
import SHA256 from "crypto-js/sha256"; // Importing SHA256 from crypto-js

/** -----------------------------
 *  Blockchain Classes
 * -----------------------------
 */
interface BlockData {
  userId: string;
  candidateId: string;
  timestamp: string;
}

class Block {
  public index: number;
  public timestamp: string;
  public data: any;
  public previousHash: string;
  public hash: string;
  public nonce: number;

  constructor(
    index: number,
    timestamp: string,
    data: any,
    previousHash = "",
    nonce = 0
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.hash = this.calculateHash();
  }

  public calculateHash(): string {
    return SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.data) +
        this.nonce
    ).toString();
  }
}

class Blockchain {
  public chain: Block[];

  constructor() {
    this.chain = [];
    this.createGenesisBlock();
  }

  private createGenesisBlock() {
    const genesisBlock = new Block(
      0,
      new Date().toISOString(),
      { isGenesis: true },
      "0",
      0
    );
    this.chain.push(genesisBlock);
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  public addBlock(data: any): void {
    const lastBlock = this.getLatestBlock();
    const newBlock = new Block(
      lastBlock.index + 1,
      new Date().toISOString(),
      data,
      lastBlock.hash,
      0
    );
    this.chain.push(newBlock);
  }

  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }
    return true;
  }
}

/** -----------------------------
 *  Firestore Helpers
 * -----------------------------
 */
const votingBlockchain = new Blockchain();

async function saveBlockchainToFirebase(chain: Blockchain) {
  const chainCol = collection(db, "debugChain");
  for (const block of chain.chain) {
    const docRef = doc(chainCol, block.index.toString());
    await setDoc(docRef, {
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: block.nonce,
    });
  }
}

/** -----------------------------
 *  Voting Page Component
 * -----------------------------
 */
const VotingPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blockchainValid, setBlockchainValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!email) {
      toast.error("No email provided!");
      router.push("/login");
      return;
    }
    checkIfUserHasVoted(email);
    fetchCandidates();
    validateBlockchain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  /** Check if user has already voted */
  async function checkIfUserHasVoted(userEmail: string) {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // User has already voted
        setHasVoted(true);
        toast.success("You have already voted. Thank you!");
      } else {
        // User has not voted yet
        setHasVoted(false);
        toast.success("You can proceed to vote.");
      }
    } catch (error) {
      toast.error("Error checking voting status.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  /** Fetch Candidates from Firestore */
  async function fetchCandidates() {
    setLoading(true);
    try {
      const candidatesSnapshot = await getDocs(collection(db, "candidates"));
      const list = candidatesSnapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "Unnamed Candidate",
      }));
      setCandidates(list);
      toast.success("Candidates loaded successfully!");
    } catch (error) {
      toast.error("Unable to fetch candidates.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  /** Handle Voting */
  async function handleVote(candidateId: string) {
    if (!email) return;

    setLoading(true);
    toast.loading("Submitting your vote...", { id: "voteSubmission" });

    try {
      const voteData: BlockData = {
        userId: email,
        candidateId,
        timestamp: new Date().toISOString(),
      };
      const voteDocRef = doc(collection(db, "votes"));
      await setDoc(voteDocRef, voteData);

      votingBlockchain.addBlock(voteData);
      await saveBlockchainToFirebase(votingBlockchain);

      // Delete user document to prevent multiple voting
      await deleteUserDocument(email);

      setHasVoted(true);
      toast.success("Vote submitted successfully!", { id: "voteSubmission" });
    } catch (error) {
      toast.error("Error submitting vote.", { id: "voteSubmission" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  /** Delete User Document after Voting */
  async function deleteUserDocument(userEmail: string) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("User document not found.");
        return;
      }

      const deletePromises = querySnapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, "users", docSnap.id))
      );
      await Promise.all(deletePromises);
      toast.success("User document deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete user document.");
      console.error(error);
    }
  }

  /** Validate Blockchain Integrity */
  function validateBlockchain() {
    const isValid = votingBlockchain.isChainValid();
    setBlockchainValid(isValid);
    if (isValid) {
      toast.success("Vote is valid.");
    } else {
      toast.error("Vote integrity compromised!");
    }
  }

  /** Toggle Theme */
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  /** Themed Classes */
  const containerClass =
    theme === "dark"
      ? "min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-gray-100 relative px-4 transition-all duration-300"
      : "min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 text-gray-800 relative px-4 transition-all duration-300";

  const cardClass =
    theme === "dark"
      ? "relative bg-gray-800 shadow-xl rounded-lg p-6 w-full max-w-md text-gray-100 transform transition-transform duration-300 hover:scale-105 hover:ring-4 hover:ring-purple-400"
      : "relative bg-white shadow-xl rounded-lg p-6 w-full max-w-md text-gray-800 transform transition-transform duration-300 hover:scale-105 hover:ring-4 hover:ring-purple-200";

  const headingClass =
    "text-3xl md:text-4xl font-extrabold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-500 flex items-center justify-center";

  const statusTextClass = (valid: boolean | null) =>
    valid === null
      ? "text-yellow-500 flex items-center justify-center"
      : valid
      ? "text-green-400 flex items-center justify-center"
      : "text-red-400 flex items-center justify-center";

  const buttonCommon =
    "w-full py-3 px-4 rounded-lg mb-4 transition-all duration-300 flex items-center justify-center";

  /** Theme Toggle Button Component */
  const ThemeToggleButton = () => (
    <div
      className="absolute top-4 right-4 p-3 rounded-full bg-indigo-600 text-white shadow-lg cursor-pointer flex items-center justify-center transition-colors hover:bg-indigo-700"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <FaSun size={20} /> : <FaMoon size={20} />}
    </div>
  );

  return (
    <div className={containerClass}>
      {/* Theme Toggle Button */}
      <ThemeToggleButton />

      <div className={cardClass}>
        {/* Blockchain Status */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold flex items-center justify-center">
            <FaPoll className="mr-2" /> Voting Authenticity Status
          </h2>
          <p className={statusTextClass(blockchainValid)}>
            {blockchainValid === null && (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Checking...
              </>
            )}
            {blockchainValid === true && (
              <>
                <FaCheckCircle className="mr-2" /> Vote is Valid
              </>
            )}
            {blockchainValid === false && (
              <>
                <FaTimesCircle className="mr-2" /> Vote is Invalid
              </>
            )}
          </p>
        </div>

        {/* Voting Section */}
        {hasVoted ? (
          <h1 className="text-2xl font-extrabold text-center text-green-300 animate-pulse">
            Thank you for voting!
          </h1>
        ) : (
          <>
            <h1 className={headingClass}>Select a Candidate</h1>
            {loading ? (
              <div className="flex items-center justify-center">
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
                    className="bg-gradient-to-r from-green-400 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-500 hover:to-green-700 transition-transform transform hover:scale-105 flex items-center"
                  >
                    <FaCheckCircle className="mr-2" /> Vote
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* React Hot Toast Container */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          className: "",
          style: {
            borderRadius: "8px",
            background: theme === "dark" ? "#333" : "#fff",
            color: theme === "dark" ? "#fff" : "#333",
          },
        }}
      />
    </div>
  );
};

export default VotingPage;
