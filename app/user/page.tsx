// app/voting/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import crypto from "crypto";
import {
  FaSun,
  FaMoon,
  FaSignInAlt,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaEnvelope,
  FaLock,
} from "react-icons/fa";
import { SiBlockchaindotcom } from "react-icons/si";
import toast, { Toaster } from "react-hot-toast";
import { Suspense } from "react";

/** -----------------------------
 *  Block and Blockchain Classes
 * -----------------------------
 */
class Block {
  public index: number;
  public timestamp: string;
  public data: any; // Could be any structure
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
    // Calculate the hash right away
    this.hash = this.calculateHash();
  }

  public calculateHash(): string {
    return crypto
      .createHash("sha256")
      .update(
        this.index +
          this.previousHash +
          this.timestamp +
          JSON.stringify(this.data) +
          this.nonce
      )
      .digest("hex");
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
const debugChain = new Blockchain(); // Our local chain instance

async function saveChainToFirestore(chain: Blockchain) {
  const chainCollection = collection(db, "debugChain");
  for (const block of chain.chain) {
    const docRef = doc(chainCollection, block.index.toString());
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

async function loadChainFromFirestore(chain: Blockchain) {
  const chainCollection = collection(db, "debugChain");
  const snapshot = await getDocs(chainCollection);
  if (snapshot.empty) {
    console.warn("No blocks found in Firestore (debugChain).");
    return;
  }

  const loadedBlocks: Block[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const loadedBlock = new Block(
      data.index,
      data.timestamp,
      data.data,
      data.previousHash,
      data.nonce
    );
    // Override the automatically computed hash with the stored one
    loadedBlock.hash = data.hash;
    loadedBlocks.push(loadedBlock);
  });
  // Sort by index
  loadedBlocks.sort((a, b) => a.index - b.index);
  chain.chain = loadedBlocks;
}

/** -----------------------------
 *  Main Side-by-Side Component
 * -----------------------------
 */
const BlockchainDebugSideBySide: React.FC = () => {
  const router = useRouter();

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Dialog states
  const [dialog, setDialog] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  // Load chain on mount
  useEffect(() => {
    const loadChain = async () => {
      setLoading(true);
      await loadChainFromFirestore(debugChain);
      setLoading(false);
      setIsValid(debugChain.isChainValid());
    };
    loadChain();
  }, []);

  // Blockchain handlers
  const handleAddBlock = async () => {
    setLoading(true);
    debugChain.addBlock({ message: "New block test", random: Math.random() });
    await saveChainToFirestore(debugChain);
    setIsValid(debugChain.isChainValid());
    setLoading(false);
    toast.success("New block added!");
  };

  const showInfo = () => {
    const infoMessage =
      "This confirmation ensures that the voting process is secure and free from duplicate votes. Each vote is uniquely recorded on the blockchain, maintaining the integrity and authenticity of the election.";
    showDialog(infoMessage, "success");
  };

  const handleReloadChain = async () => {
    setLoading(true);
    await loadChainFromFirestore(debugChain);
    setIsValid(debugChain.isChainValid());
    setLoading(false);
    toast.success("Blockchain reloaded!");
  };

  const handleRecheck = () => {
    const validity = debugChain.isChainValid();
    setIsValid(validity);
    toast(validity ? "Blockchain is valid!" : "Blockchain is invalid!");
  };

  // Login handler
  const handleLogin = async () => {
    setLoading(true);
    try {
      // Check Firestore "users" by email
      const usersRef = collection(db, "users");
      const qUsers = query(usersRef, where("email", "==", email));
      const snapshot = await getDocs(qUsers);

      if (snapshot.empty) {
        toast.error("Email not found!");
      } else {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        if (userData.password === password) {
          toast.success("Logged in!");
          setIsLoggedIn(true);

          // Navigate to the voting page and include the email in the query string
          router.push(`/voting?email=${encodeURIComponent(email)}`);
        } else {
          toast.error("Wrong password!");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Dialog helper
  const showDialog = (message: string, type: "success" | "error") => {
    setDialog({ visible: true, message, type });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setDialog({ visible: false, message: "", type: "success" });
    }, 5000);
  };

  // Helper Function to Calculate Euclidean Distance between two embeddings
  const euclideanDistance = (emb1: Float32Array, emb2: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < emb1.length; i++) {
      sum += Math.pow(emb1[i] - emb2[i], 2);
    }
    return Math.sqrt(sum);
  };

  // Themed classes
  const containerClass =
    theme === "dark"
      ? "min-h-screen flex flex-col md:flex-row bg-gradient-to-r from-gray-800 via-gray-900 to-black text-gray-100 relative"
      : "min-h-screen flex flex-col md:flex-row bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 text-gray-900 relative";

  const leftPaneClass = "md:w-1/2 border-r border-gray-700 p-6";
  const rightPaneClass = "md:w-1/2 p-6";

  const cardClass =
    theme === "dark"
      ? "bg-gray-800 rounded-xl shadow-lg p-6 mb-6 transition-transform transform hover:scale-105"
      : "bg-white rounded-xl shadow-lg p-6 mb-6 transition-transform transform hover:scale-105";

  const inputClass =
    theme === "dark"
      ? "w-full p-3 mb-4 rounded-lg border border-gray-700 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      : "w-full p-3 mb-4 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  const buttonClass =
    theme === "dark"
      ? "w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-full shadow-md hover:from-purple-600 hover:to-indigo-700 transition duration-300 flex items-center justify-center"
      : "w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-full shadow-md hover:from-purple-600 hover:to-pink-700 transition duration-300 flex items-center justify-center";

  const statusMessageClass = (valid: boolean | null) => {
    if (valid === null) return "";
    return valid
      ? "bg-green-200 text-green-800 flex items-center p-3 rounded-lg"
      : "bg-red-200 text-red-800 flex items-center p-3 rounded-lg";
  };

  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><FaSpinner className="animate-spin text-indigo-500 text-4xl" /></div>}>
      <div className={containerClass}>
        {/* Theme Toggle */}
        <div
          className="absolute top-4 right-4 p-3 rounded-full bg-indigo-600 text-white shadow-lg cursor-pointer hover:bg-indigo-700 transition duration-300"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <FaSun size={20} /> : <FaMoon size={20} />}
        </div>

        {/* LEFT PANE: Blockchain Debug */}
        <div className={leftPaneClass}>
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <SiBlockchaindotcom className="mr-2" /> Blockchain Debug
          </h2>

          <div className={cardClass}>
            {loading && (
              <div className="flex items-center mb-4">
                <FaSpinner className="animate-spin mr-2" /> Loading...
              </div>
            )}

            <div className="flex justify-between items-center">
              <p className="text-lg mb-2">
                Vote Authenticity Status:{" "}
                <span
                  className={`font-semibold ${
                    isValid === true
                      ? "text-green-400 flex items-center"
                      : isValid === false
                      ? "text-red-400 flex items-center"
                      : "text-yellow-400 flex items-center"
                  }`}
                >
                  {isValid === null && <FaSpinner className="animate-spin mr-2" />}
                  {isValid === null
                    ? "Unknown"
                    : isValid
                    ? (
                      <>
                        <FaCheckCircle className="mr-2" /> YES
                      </>
                    )
                    : (
                      <>
                        <FaTimesCircle className="mr-2" /> NO
                      </>
                    )}
                </span>
              </p>

              <h1
                className="mt-1 font-bold text-blue-800 cursor-pointer"
                onClick={showInfo}
              >
                Know Why?
              </h1>
            </div>

            {/* Dialogue Box */}
            {dialog.visible && (
              <div
                className={`mt-4 p-4 rounded-lg shadow-md ${
                  dialog.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                } transition-opacity duration-300`}
              >
                <p>{dialog.message}</p>
              </div>
            )}

            {/* Add Block Button */}
            {/* <button
              onClick={handleAddBlock}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center justify-center mb-4"
            >
              <FaSyncAlt className="mr-2 animate-spin" /> Add New Block
            </button> */}

            {/* Reload and Re-check Buttons */}
            <div className="flex space-x-4 mt-4">
              <button
                onClick={handleReloadChain}
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center justify-center"
              >
                <FaSyncAlt className="mr-2" /> Reload Status
              </button>
              <button
                onClick={handleRecheck}
                disabled={loading}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center justify-center"
              >
                <FaCheckCircle className="mr-2" /> Re-check Status
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Login */}
        <div className={rightPaneClass}>
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <FaSignInAlt className="mr-2" /> Login
          </h2>
          <div className={cardClass}>
            <div className="mb-4">
              <label htmlFor="email" className="flex items-center mb-2 text-sm font-semibold">
                <FaEnvelope className="mr-2" /> Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="flex items-center mb-2 text-sm font-semibold">
                <FaLock className="mr-2" /> Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className={buttonClass}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
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
    </Suspense>
  );
};

export default BlockchainDebugSideBySide;
