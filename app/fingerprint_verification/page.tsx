"use client";

import React, { useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "@/firebase";

const Vote = () => {
  const [candidate, setCandidate] = useState("");
  const [status, setStatus] = useState("");

  const vote = async () => {
    try {
      if (!candidate) {
        setStatus("Please select a candidate.");
        return;
      }

      // Step 1: Check if the device supports biometric authentication
      const compatible = !!window.PublicKeyCredential;
      if (!compatible) {
        setStatus("Your device does not support biometric authentication.");
        return;
      }

      // Step 2: Authenticate the user via WebAuthn
      const publicKey = {
        challenge: new Uint8Array(32),
        rp: { name: "Voting App" },
        allowCredentials: [], // No specific credentials; the browser will handle it
      };

      const assertion = await navigator.credentials.get({ publicKey });
      if (!assertion) {
        setStatus("Fingerprint authentication failed.");
        return;
      }

      const credentialId = assertion.id;

      // Step 3: Verify the credential ID with the database
      const voterQuery = query(
        collection(db, "voters"),
        where("credential_id", "==", credentialId)
      );
      const voterSnapshot = await getDocs(voterQuery);

      if (voterSnapshot.empty) {
        setStatus("Invalid fingerprint. You are not registered.");
        return;
      }

      const voterDoc = voterSnapshot.docs[0];
      const voterData = voterDoc.data();

      if (voterData.voted) {
        setStatus("You have already voted.");
        return;
      }

      // Step 4: Record the vote
      await addDoc(collection(db, "votes"), {
        voter_id: voterData.user_id,
        candidate: candidate,
        timestamp: new Date().toISOString(),
      });

      // Step 5: Mark the user as voted
      await updateDoc(doc(db, "voters", voterDoc.id), { voted: true });

      setStatus("Vote submitted successfully!");
      setCandidate("");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Vote</h1>
      <select value={candidate} onChange={(e) => setCandidate(e.target.value)}>
        <option value="">Select a candidate</option>
        <option value="Candidate A">Candidate A</option>
        <option value="Candidate B">Candidate B</option>
        <option value="Candidate C">Candidate C</option>
      </select>
      <button onClick={vote}>Submit Vote</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default Vote;
