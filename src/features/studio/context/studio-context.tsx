"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppState, GenerationResult, StudioContextType } from '../types';

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>({
    credits: 1240,
    history: [],
    creditHistory: [
      {
        id: 'init-1',
        type: 'addition',
        amount: 1240,
        reason: 'Monthly Plan Deposit',
        date: new Date(Date.now() - 86400000 * 2)
      }
    ]
  });

  const deductCredits = (amount: number, reason: string = 'Service Usage') => {
    setAppState(prev => ({
      ...prev,
      credits: Math.max(0, prev.credits - amount),
      creditHistory: [{
        id: Date.now().toString(),
        type: 'deduction',
        amount,
        reason,
        date: new Date()
      }, ...prev.creditHistory]
    }));
  };

  const addCredits = (amount: number, reason: string = 'Recharge') => {
    setAppState(prev => ({
      ...prev,
      credits: prev.credits + amount,
      creditHistory: [{
        id: Date.now().toString(),
        type: 'addition',
        amount,
        reason,
        date: new Date()
      }, ...prev.creditHistory]
    }));
  };

  const addToHistory = (item: GenerationResult) => {
    setAppState(prev => ({
      ...prev,
      history: [item, ...prev.history]
    }));
  };

  return (
    <StudioContext.Provider value={{ state: appState, deductCredits, addCredits, addToHistory }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}
