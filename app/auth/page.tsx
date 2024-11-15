"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase"; // Adjust the import based on your firebase config
import { useTheme } from "@/components/ThemeContext";
import PatternLock from "react-pattern-lock";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pattern, setPattern] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [isPatternLogin, setIsPatternLogin] = useState(false); // Toggle between login modes
  const router = useRouter();
  const { theme } = useTheme();

  // Define the correct pattern for pattern login
  const correctPattern: number[] = [0,1,2,5]; // Example pattern

  // Debugging log to check pattern generation
  useEffect(() => {
    console.log("Current pattern:", pattern);
  }, [pattern]);

  // Helper function to check if the drawn pattern matches the correct pattern
  const isPatternCorrect = (enteredPattern: number[], correctPattern: number[]) => {
    if (enteredPattern.length !== correctPattern.length) return false;
    for (let i = 0; i < enteredPattern.length; i++) {
      if (enteredPattern[i] !== correctPattern[i]) return false;
    }
    return true;
  };

  // Handle email/password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin"); // Redirect to the admin page on successful login
    } catch (error) {
      setError("Invalid email or password. Please try again.");
    }
  };

  // Handle pattern finish without any arguments
  const handlePatternFinish = () => {
    console.log("Pattern to compare:", pattern); // Log the pattern before comparison
    console.log("Correct pattern:", correctPattern); // Log the correct pattern for debugging

    if (isPatternCorrect(pattern, correctPattern)) {
      router.push("/admin"); // Redirect to the admin page if the pattern matches
    } else {
      setError("Incorrect pattern. Please try again.");
      setPattern([]); // Reset the pattern
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-gray-100" : "bg-gray-900 text-gray-200"}`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${theme === "light" ? "bg-white" : "bg-gray-800"}`}>
        <h1 className="text-2xl font-semibold text-center mb-6">Admin Login</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        
        {/* Toggle between login modes */}
        <div className="mb-6 text-center">
          <button
            onClick={() => {
              setIsPatternLogin(false);
              setError(""); // Clear error on mode switch
            }}
            className={`mr-4 px-4 py-2 rounded ${
              !isPatternLogin ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
            }`}
          >
            Email Login
          </button>
          <button
            onClick={() => {
              setIsPatternLogin(true);
              setError(""); // Clear error on mode switch
            }}
            className={`px-4 py-2 rounded ${
              isPatternLogin ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
            }`}
          >
            Pattern Login
          </button>
        </div>

        {isPatternLogin ? (
          // Pattern-based login
          <div className="flex items-center justify-center">
            <PatternLock
              width={300}
              size={3} // 3x3 grid
              onChange={setPattern}
              path={pattern}
              onFinish={handlePatternFinish} // Use onFinish to handle pattern completion without parameters
            />
          </div>
        ) : (
          // Email/password login
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full p-3 border rounded-md focus:outline-none focus:border-blue-500 ${
                theme === "light" ? "text-gray-900" : "text-black bg-white"
              }`}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full p-3 border rounded-md focus:outline-none focus:border-blue-500 ${
                theme === "light" ? "text-gray-900" : "text-black bg-white"
              }`}
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;
