"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Branch = 'Karachi' | 'Lahore' | 'All';

interface BranchContextProps {
  selectedBranch: Branch;
  setSelectedBranch: (branch: Branch) => void;
}

const BranchContext = createContext<BranchContextProps | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBranch, setSelectedBranch] = useState<Branch>('All');

  // Persist selection in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedBranch') as Branch | null;
    if (saved) setSelectedBranch(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedBranch', selectedBranch);
  }, [selectedBranch]);

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = (): BranchContextProps => {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return ctx;
};
