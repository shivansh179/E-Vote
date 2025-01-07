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
import toast, { Toaster } from "react-hot-toast";
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
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>(
    []
  );
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [voteLoading, setVoteLoading] = useState(false); // Loading for vote submission
  const [blockchainValid, setBlockchainValid] = useState<boolean | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (!email) {
        toast.error("No email provided!");
        router.push("/login");
        return;
      }

      try {
        const canVote = await checkIfUserCanVote(email);
        if (canVote) {
          await fetchCandidates();
          await validateBlockchain();
        }
      } catch (error) {
        toast.error("An unexpected error occurred.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  /** Check if user has already voted and verify password_validated */
  async function checkIfUserCanVote(userEmail: string): Promise<boolean> {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // No user doc found; assume user has voted
        setHasVoted(true);
        toast.success("Your vote has been recorded. Thank you!");
        setTimeout(() => {
          router.push("/");
        }, 3000);
        return false;
      } else {
        // User document exists; check checkpoints
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        const checkpoints: string[] = userData.checkpoints || [];

        if (
          Array.isArray(checkpoints) &&
          checkpoints.length > 2 &&
          checkpoints[2] === "password_validated"
        ) {
          // User has passed the password validation checkpoint
          setHasVoted(false);
          toast.success("You can proceed to vote.");
          return true;
        } else {
          // User hasn't completed password validation; redirect to /user
          // toast.error("go")
          toast.error(
            "Please complete prior steps before accessing the voting page. Redirecting..."
          );
          setTimeout(() => {
            router.push("/user");
          }, 1000); // Added delay for user to read the toast
          return false;
        }
      }
    } catch (error) {
      toast.error("Error checking voting status.");
      console.error(error);
      return false;
    }
  }

  /** Fetch Candidates from Firestore */
  async function fetchCandidates() {
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
    }
  }

  /** Handle Voting */
  async function handleVote(candidateId: string) {
    if (!email) return;

    setVoteLoading(true);
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

      // Transfer embedding and delete user document
      await transferEmbeddingAndDeleteUser(email);

      setHasVoted(true);
      toast.success("Vote submitted successfully!", { id: "voteSubmission" });
    } catch (error) {
      toast.error("Error submitting vote.", { id: "voteSubmission" });
      console.error(error);
    } finally {
      setVoteLoading(false);
    }
  }

  /** Transfer Embedding to New Collection and Delete User Document */
  async function transferEmbeddingAndDeleteUser(userEmail: string) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("User document not found.");
        return;
      }

      const transferPromises = querySnapshot.docs.map(async (docSnap) => {
        const userData = docSnap.data();
        const embedding = userData.embedding;

        if (embedding) {
          // Add to 'userEmbeddings' collection
          await setDoc(doc(collection(db, "userEmbeddings")), {
            email: userEmail,
            embedding: embedding,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.warn(`No embedding found for user ${userEmail}.`);
        }

        // Delete the user document
        await deleteDoc(doc(db, "users", docSnap.id));
      });

      await Promise.all(transferPromises);
      toast.success("User data transferred and document deleted successfully.");
    } catch (error) {
      toast.error("Failed to transfer embedding and delete user document.");
      console.error(error);
    }
  }

  /** Validate Blockchain Integrity */
  async function validateBlockchain() {
    try {
      const isValid = votingBlockchain.isChainValid();
      setBlockchainValid(isValid);
      if (isValid) {
        toast.success("Blockchain is valid.");
      } else {
        toast.error("Blockchain integrity compromised!");
      }
    } catch (error) {
      toast.error("Error validating blockchain.");
      console.error(error);
      setBlockchainValid(false);
    }
  }

  /** Toggle Theme */
  const toggleThemeMode = () => {
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
      onClick={toggleThemeMode}
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? <FaSun /> : <FaMoon />}
    </div>
  );

  /** Full-Screen Loading Spinner Component */
  const FullScreenLoading = () => (
    <div
      className={
        theme === "dark"
          ? "flex justify-center items-center h-screen bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900"
          : "flex justify-center items-center h-screen bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50"
      }
    >
      <FaSpinner className="animate-spin text-indigo-500 text-6xl" />
    </div>
  );

  /** Voting Submission Spinner Component */
  const VoteLoadingSpinner = () => (
    <div className="flex justify-center items-center">
      <FaSpinner className="animate-spin text-indigo-500 text-4xl mr-2" />
      <span>Submitting your vote...</span>
    </div>
  );

  /** Main Render Logic */
  if (isLoading) {
    // While checking authentication and loading data, show full-screen loading spinner
    return <FullScreenLoading />;
  }

  return (
    <div className={containerClass}>
      <ThemeToggleButton />

      <div className={cardClass}>
        <h1 className={headingClass}>
          <FaPoll className="mr-2" /> Voting Page
        </h1>

        {hasVoted ? (
          <div className="flex flex-col text-center">
            <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-2" />
            <p className="text-lg font-semibold">Your vote has been recorded.</p>
            <p className="text-lg font-semibold">Thank You!</p>
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

            {blockchainValid === false ? (
              <div className="text-center text-red-400">
                <FaCheckCircle className="text-red-500 text-5xl mx-auto mb-2" />
                <p className="text-lg font-semibold">
                  Blockchain Integrity Compromised!
                </p>
              </div>
            ) : (
              <>
                {candidates.length === 0 ? (
                  <div className="text-center text-yellow-400">
                    <FaSpinner className="animate-spin mx-auto mb-2" />
                    No candidates available.
                  </div>
                ) : (
                  candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      className={`${buttonCommon} bg-indigo-600 hover:bg-indigo-700 text-white`}
                      onClick={() => handleVote(candidate.id)}
                      disabled={voteLoading}
                    >
                      {candidate.name}
                    </button>
                  ))
                )}
              </>
            )}
          </>
        )}

        {/* Vote Submission Loading Indicator */}
        {voteLoading && (
          <div className="mt-4 flex justify-center items-center">
            <VoteLoadingSpinner />
          </div>
        )}
      </div>

      {/* Toast Container */}
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
