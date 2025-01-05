// app/voting/page.tsx
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
import { db } from "@/firebase"; // Ensure this path is correct based on your project structure
import toast from "react-hot-toast";
import {
  FaSun,
  FaMoon,
  FaPoll,
  FaCheckCircle,
  FaSpinner,
} from "react-icons/fa";
import SHA256 from "crypto-js/sha256";

/** -----------------------------
 *  Block and Blockchain Classes
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
    if (this.chain.length === 0) {
      const genesisBlock = new Block(
        0,
        new Date().toISOString(),
        { isGenesis: true },
        "0",
        0
      );
      this.chain.push(genesisBlock);
    }
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  public addBlock(newData: any): void {
    const lastBlock = this.getLatestBlock();
    const newBlock = new Block(
      lastBlock.index + 1,
      new Date().toISOString(),
      newData,
      lastBlock.hash,
      0
    );
    this.chain.push(newBlock);
  }

  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Uncomment to enable hash validation
      // const recalculatedHash = currentBlock.calculateHash();
      // if (currentBlock.hash !== recalculatedHash) {
      //   console.error(
      //     `Block #${currentBlock.index} hash mismatch:
      //      Stored:      ${currentBlock.hash}
      //      Recalculated:${recalculatedHash}`
      //   );
      //   return false;
      // }

      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error(
          `Block #${currentBlock.index} previousHash mismatch:
           currentBlock.previousHash: ${currentBlock.previousHash}
           previousBlock.hash:       ${previousBlock.hash}`
        );
        return false;
      }
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
        setHasVoted(true);
        toast.success("You have already voted. Thank you!");
      } else {
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
      className="absolute top-4 right-4 p-3 rounded-full bg-indigo-600 text-white shadow-md cursor-pointer"
      onClick={toggleTheme}
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? <FaSun /> : <FaMoon />}
    </div>
  );

  return (
    <div className={containerClass}>
      <ThemeToggleButton />

      <div className={cardClass}>
        <h1 className={headingClass}>
          <FaPoll className="mr-2" /> Voting Page
        </h1>

        {hasVoted ? (
          <div className="text-center">
            <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-2" />
            <p className="text-lg font-semibold">You have already voted!</p>
          </div>
        ) : (
          <>
            <div className="text-lg font-semibold text-center mb-4">
              Blockchain Status:{" "}
              <span className={statusTextClass(blockchainValid)}>
                {blockchainValid === null
                  ? "Validating..."
                  : blockchainValid
                  ? "Valid"
                  : "Invalid"}
              </span>
            </div>

            {loading ? (
              <div className="text-center text-yellow-400">
                <FaSpinner className="animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : (
              candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  className={`${buttonCommon} bg-indigo-600 hover:bg-indigo-700 text-white`}
                  onClick={() => handleVote(candidate.id)}
                  disabled={loading}
                >
                  {candidate.name}
                </button>
              ))
            )}
          </>
        )}

        {loading && (
          <div className="text-center text-yellow-400">
            <FaSpinner className="animate-spin mx-auto mb-2" />
            Submitting vote...
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingPage;
