"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FiUserPlus,
  FiSearch,
  FiEye,
  FiTrash2,
  FiCalendar,
  FiClock,
  FiType,
  FiChevronDown,
  FiChevronUp,
  FiActivity,
} from "react-icons/fi";
import { notify } from "@/app/lib/notify";
import AddPatientModal from "../helper/AddPatientModal";
import ViewPatientDetailsModal from "../helper/ViewPatientDetailsModal";
import { usePatientStore } from "@/app/stores/usePatientStore";
import { useTransactionsStore } from "@/app/stores/useTransactionsStore";

export default function PatientsSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    patient: null,
  });

  const { patients, fetchPatients, addPatient, deletePatient } =
    usePatientStore();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting States
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const { withBalancePatients, getWithBalancePatients, fetchAllPayments } =
    useTransactionsStore();

  // Helper to calculate age based on 2026
  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date(); // Current date in 2026
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      // 0. Check cache: If data exists, skip the loader and fetch silently
      if (patients.length > 0) {
        setIsInitialLoading(false);
        try {
          await Promise.all([
            fetchAllPayments(),
            fetchPatients(),
            getWithBalancePatients(),
          ]);
        } catch (error) {
          console.error("Background sync failed:", error);
        }
        return;
      }

      // 1. Explicitly reset state on every mount if no cache exists
      setIsInitialLoading(true);
      setFetchProgress(0);

      // 2. Start the smooth progress ticker
      const interval = setInterval(() => {
        if (isMounted) {
          setFetchProgress((prev) =>
            prev >= 92 ? 92 : Math.min(prev + 15, 92),
          );
        }
      }, 150);

      // 3. Minimum delay to ensure the animation is visible on first load
      const minimumAnimationTime = new Promise((resolve) =>
        setTimeout(resolve, 800),
      );

      try {
        await Promise.all([
          fetchAllPayments(),
          fetchPatients(),
          getWithBalancePatients(),
          minimumAnimationTime, // Forces the loader to wait for at least 800ms
        ]);
      } catch (error) {
        console.error("Sync failed:", error);
      } finally {
        if (isMounted) {
          clearInterval(interval);
          setFetchProgress(100);
          setTimeout(() => {
            if (isMounted) setIsInitialLoading(false);
          }, 400); // Pause briefly at 100% before vanishing
        }
      }
    };

    initData();

    // 4. Cleanup on unmount
    return () => {
      isMounted = false;
    };
    // Note: Kept patients out of dependency array to prevent loops if background fetch updates it
  }, [fetchPatients, fetchAllPayments, getWithBalancePatients]);

  // Enhanced Sort Toggle with Loading UX
  const handleSortToggle = (targetSort) => {
    setIsProcessing(true);
    // Artificial delay to show "Refining View" for better tactile feel
    setTimeout(() => {
      if (sortBy === targetSort) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(targetSort);
        setSortOrder("asc");
      }
      setIsProcessing(false);
    }, 400);
  };

  const processedPatients = useMemo(() => {
    let result = patients.filter((p) =>
      p.patientName.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.patientName.localeCompare(b.patientName);
      } else if (sortBy === "date") {
        comparison = new Date(a.$createdAt) - new Date(b.$createdAt);
      } else if (sortBy === "age") {
        const ageA = calculateAge(a.birthdate) || 0;
        const ageB = calculateAge(b.birthdate) || 0;
        comparison = ageA - ageB;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [patients, searchTerm, sortBy, sortOrder]);

  const handleSavePatient = async (newData) => {
    try {
      setLoading(true);
      await addPatient(newData);
      notify.success("New patient registered.");
      setIsOpen(false);
      fetchPatients();
    } catch (err) {
      notify.error("Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await deletePatient(confirmModal.patient.$id);
      notify.success("Record purged.");
      setConfirmModal({ isOpen: false, patient: null });
      fetchPatients();
    } catch (error) {
      notify.error("Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-10 min-h-[80vh] relative">
      {/* 1. INITIAL FULL-PAGE SYNC */}
      {isInitialLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md rounded-[2.5rem]">
          <div className="flex flex-col items-center max-w-xs w-full p-8 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 border-4 border-zinc-100 dark:border-zinc-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-emerald-500">
                {fetchProgress}%
              </div>
            </div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-200 mb-2">
              Synchronizing Records
            </h2>
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-linear-to-r from-emerald-500 to-lime-400 transition-all duration-500 ease-out"
                style={{ width: `${fetchProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 uppercase">
            Clinical <span className="text-emerald-500">Records</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1 text-sm">
            Centralized database for patient history and financial balances.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50"
        >
          <FiUserPlus size={18} /> Add New Patient
        </button>
      </div>

      {/* KPI STATS */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 transition-opacity duration-500 ${isInitialLoading ? "opacity-20" : "opacity-100"}`}
      >
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 lg:p-8 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">
            Total Registry
          </p>
          <div className="text-3xl lg:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter">
            {patients.length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 lg:p-8 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-2">
            Pending Balances
          </p>
          <div className="text-3xl lg:text-4xl font-black text-red-500 tracking-tighter">
            {withBalancePatients.length}
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-500/10 p-6 lg:p-8 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">
            Receivables
          </p>
          <div className="text-3xl lg:text-4xl font-black text-emerald-600 tracking-tighter">
            ₱
            {withBalancePatients
              .reduce((sum, p) => sum + p.remaining, 0)
              .toLocaleString()}
          </div>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div
        className={`bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 relative ${isInitialLoading ? "blur-sm" : ""}`}
      >
        {/* IN-LIST REFINING LOADER */}
        {isProcessing && (
          <div className="absolute inset-0 z-10 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
            <div className="flex items-center gap-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-2xl">
              <FiActivity className="animate-pulse text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Refining View...
              </span>
            </div>
          </div>
        )}

        <div className="p-4 lg:p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name..."
              className="w-full pl-12 pr-6 py-3 lg:py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500/20"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsProcessing(true);
                const t = setTimeout(() => setIsProcessing(false), 300);
                return () => clearTimeout(t);
              }}
            />
          </div>

          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => handleSortToggle("name")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "name" ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow-sm" : "text-zinc-400"}`}
            >
              <FiType /> A-Z{" "}
              {sortBy === "name" &&
                (sortOrder === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
            </button>
            <button
              onClick={() => handleSortToggle("date")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "date" ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow-sm" : "text-zinc-400"}`}
            >
              <FiCalendar /> Date{" "}
              {sortBy === "date" &&
                (sortOrder === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
            </button>
            <button
              onClick={() => handleSortToggle("age")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === "age" ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow-sm" : "text-zinc-400"}`}
            >
              <FiClock /> Age{" "}
              {sortBy === "age" &&
                (sortOrder === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 bg-zinc-50/30 dark:bg-zinc-900/10">
                <th className="py-6 px-8">Patient Identity</th>
                <th>Vitals/Age</th>
                <th>Address</th>
                <th>Contact</th>
                <th className="text-right px-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
              {processedPatients.map((patient) => {
                const currentAge = calculateAge(patient.birthdate);
                return (
                  <tr
                    key={patient.$id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-all group"
                  >
                    <td className="py-6 px-8">
                      <div className="flex flex-col">
                        <span className="font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                          {patient.patientName}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                          Registered:{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(patient.$createdAt))}
                        </span>
                      </div>
                    </td>
                    <td className="py-6">
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded text-[10px] font-black border border-zinc-200 dark:border-zinc-800">
                          {currentAge ? `${currentAge} YRS` : "?? YRS"}
                        </span>
                        <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-black uppercase">
                          {patient.gender || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="text-zinc-500 dark:text-zinc-400 font-medium text-sm italic">
                      {patient.address || "No address provided"}
                    </td>
                    <td className="text-zinc-600 dark:text-zinc-300 font-black text-xs tracking-widest">
                      {patient.contact}
                    </td>
                    <td className="px-8">
                      <div className="flex justify-end gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setIsModalOpen(true);
                          }}
                          className="p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-500 hover:text-white rounded-xl text-zinc-500 transition-all"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({ isOpen: true, patient })
                          }
                          className="p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-zinc-500 transition-all"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddPatientModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onSave={handleSavePatient}
        loading={loading}
      />
      <ViewPatientDetailsModal
        patient={selectedPatient}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* DELETE CONFIRMATION */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h3 className="font-black text-2xl text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">
              Delete Record?
            </h3>
            <p className="py-4 text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              Permanently remove{" "}
              <span className="text-zinc-900 dark:text-zinc-100 font-black">
                "{confirmModal.patient?.patientName}"
              </span>{" "}
              from the clinical database? This cannot be undone.
            </p>
            <div className="flex gap-4 mt-6">
              <button
                className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-zinc-400"
                onClick={() =>
                  setConfirmModal({ isOpen: false, patient: null })
                }
              >
                Cancel
              </button>
              <button
                className="flex-[2] bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/20 uppercase text-xs tracking-widest"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
