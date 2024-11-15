"use client";

import { useState } from "react";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false); // Toggle between sign-in and sign-up
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleAuth = async () => {
    try {
      if (isNewUser) {
        // Sign up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User signed up:", userCredential.user);
        alert("Account created successfully. You can now log in.");
        setIsNewUser(false);
      } else {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User signed in:", userCredential.user);
        router.push("/user"); // Redirect to the user page on successful login
      }
    } catch (error) {
      console.error("Error with authentication", error);
      setError("Authentication failed. Please check your email and password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
      <div className="max-w-md w-full p-8 rounded-lg shadow-lg bg-white">
        <h1 className="text-3xl font-bold text-center text-blue-600">
          {isNewUser ? "Sign Up" : "Sign In"}
        </h1>
        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
        <div className="space-y-4 mt-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleAuth}
            className="w-full bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 transition"
          >
            {isNewUser ? "Sign Up" : "Sign In"}
          </button>
        </div>
        <p
          className="text-center mt-4 text-blue-600 cursor-pointer hover:underline"
          onClick={() => {
            setIsNewUser(!isNewUser);
            setError(null);
          }}
        >
          {isNewUser ? "Already have an account? Sign In" : "New user? Sign Up"}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
