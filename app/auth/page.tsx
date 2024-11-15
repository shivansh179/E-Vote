"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase"; // Adjust the import based on your firebase config
import { useTheme } from "@/components/ThemeContext";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPatternLogin, setIsPatternLogin] = useState(false); // Toggle between login modes
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false); // Track if the user is drawing a pattern
  const router = useRouter();
  const { theme } = useTheme();

  // Define the correct pattern
  const correctPattern = [0, 1, 2, 5]; // Change this to any pattern you want

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

  // Handle pattern submission
  const handleSubmitPattern = () => {
    if (JSON.stringify(pattern) === JSON.stringify(correctPattern)) {
      router.push("/admin"); // Redirect to the admin page if pattern matches
    } else {
      setError("Incorrect pattern. Please try again.");
      setPattern([]); // Reset the pattern
    }
  };

  // Start drawing pattern
  const handleMouseDown = (dotIndex: number) => {
    setIsDrawing(true);
    setPattern([dotIndex]); // Start the pattern with the first dot
  };

  // Add dot to pattern while drawing
  const handleMouseEnter = (dotIndex: number) => {
    if (isDrawing && !pattern.includes(dotIndex)) {
      setPattern((prevPattern) => [...prevPattern, dotIndex]);
    }
  };

  // Stop drawing pattern
  const handleMouseUp = () => {
    setIsDrawing(false);
    handleSubmitPattern(); // Automatically submit pattern when drawing stops
  };

  // Styles for the dots
  const dotStyle = {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: theme === "light" ? "#007BFF" : "#FFFFFF",
    display: "inline-block",
    margin: "15px",
    cursor: "pointer",
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-gray-100" : "bg-gray-900 text-gray-200"}`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${theme === "light" ? "bg-white" : "bg-gray-800"}`}>
        <h1 className="text-2xl font-semibold text-center mb-6">Admin Login</h1>

        {/* Toggle between Email and Pattern Login */}
        <div className="mb-6 text-center">
          <button
            onClick={() => {
              setIsPatternLogin(false);
              setError(""); // Clear error on mode switch
            }}
            className={`mr-4 px-4 py-2 rounded ${!isPatternLogin ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"}`}
          >
            Email Login
          </button>
          <button
            onClick={() => {
              setIsPatternLogin(true);
              setError(""); // Clear error on mode switch
            }}
            className={`px-4 py-2 rounded ${isPatternLogin ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"}`}
          >
            Pattern Login
          </button>
        </div>

        {isPatternLogin ? (
          // Pattern-based login
          <div
            className="flex flex-col items-center"
            onMouseUp={handleMouseUp} // Handle mouse release to end drawing
            onTouchEnd={handleMouseUp} // For mobile devices
          >
            <div className="grid grid-cols-3 gap-4 mb-6">
              {Array.from({ length: 9 }, (_, index) => (
                <div
                  key={index}
                  style={{
                    ...dotStyle,
                    backgroundColor: pattern.includes(index) ? (theme === "light" ? "#0056b3" : "#BBBBBB") : dotStyle.backgroundColor,
                  }}
                  onMouseDown={() => handleMouseDown(index)} // Start drawing pattern
                  onMouseEnter={() => handleMouseEnter(index)} // Add dot while dragging over
                  onTouchStart={() => handleMouseDown(index)} // Mobile support
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                    const targetIndex = Number(targetElement?.getAttribute("data-index"));
                    if (targetIndex >= 0) handleMouseEnter(targetIndex);
                  }}
                  data-index={index}
                />
              ))}
            </div>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          </div>
        ) : (
          // Email/password login
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && <p className="text-red-500 text-center">{error}</p>}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border rounded-md focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border rounded-md focus:outline-none focus:border-blue-500"
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
