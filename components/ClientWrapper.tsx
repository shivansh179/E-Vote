// components/ClientWrapper.tsx
"use client";

import React, { Suspense } from "react";

interface ClientWrapperProps {
  children: React.ReactNode;
}

const ClientWrapper: React.FC<ClientWrapperProps> = ({ children }) => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      {children}
    </Suspense>
  );
};

export default ClientWrapper;
