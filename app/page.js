"use client";

import { useEffect, useState } from "react";
import Features from "./components/landing/Features";
import Hero from "./components/landing/Hero";

import { useAuthStore } from "./stores/authStore";
import DashboardPage from "./components/Dashboard";

export default function HomePage() {
  const {
    getCurrentUser,
    current,
    loading: storeLoading,
  } = useAuthStore((state) => state);

  // Local states for the animated UI loader
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [fetchProgress, setFetchProgress] = useState(0);

  // Fetch user on mount with smooth progress animation
  useEffect(() => {
    const initAuth = async () => {
      setIsInitialLoading(true);
      setFetchProgress(10);

      const interval = setInterval(() => {
        setFetchProgress((prev) => (prev >= 95 ? 95 : Math.min(prev + 15, 95)));
      }, 150);

      await getCurrentUser();

      clearInterval(interval);
      setFetchProgress(100);

      // Slight delay to ensure the user sees "100%" before it vanishes
      setTimeout(() => {
        setIsInitialLoading(false);
      }, 500);
    };

    initAuth();
  }, [getCurrentUser]);

  // Show the high-end loader while local animation or store fetching is active
  if (isInitialLoading || storeLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center max-w-xs w-full p-8 text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 border-4 border-zinc-100 dark:border-zinc-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-emerald-500">
              {fetchProgress}%
            </div>
          </div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-200 mb-2">
            Authenticating
          </h2>
          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-linear-to-r from-emerald-500 to-lime-400 transition-all duration-500 ease-out"
              style={{ width: `${fetchProgress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // If logged in → show dashboard
  if (current) {
    return <DashboardPage user={current} />;
  }

  // Else → show landing page
  return (
    <>
      <Hero />
    </>
  );
}
