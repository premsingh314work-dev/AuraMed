import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api";
import {
  Upload,
  FileText,
  User,
  Calendar,
  X,
  Loader2,
  ArrowLeft,
  Search,
  Cpu,
  BrainCircuit,
  MessageSquareHeart,
} from "lucide-react";
const API_URL = `${API_BASE_URL}/api/reports/upload`;

const ReportUpload = () => {
  const navigate = useNavigate();

  // Form states
  const [file, setFile] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dragActive, setDragActive] = useState(false);

  // Status states
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);

  const steps = [
    { label: "Reading document upload", icon: Upload },
    { label: "Performing text extraction (OCR)", icon: Search },
    { label: "Analyzing parameters via GROQ AI", icon: Cpu },
    { label: "Structuring normal/abnormal ranges", icon: BrainCircuit },
    {
      label: "Generating patient-friendly summaries",
      icon: MessageSquareHeart,
    },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const ext = selectedFile.name.split(".").pop().toLowerCase();
    if (!["pdf", "png", "jpg", "jpeg"].includes(ext)) {
      setError("Unsupported file format. Please upload a PDF or an Image.");
      return;
    }
    setError(null);
    setFile(selectedFile);
  };

  const runProcessingMock = () => {
    // Simulates the stepping of steps for user engagement
    let step = 0;
    const interval = setInterval(() => {
      if (step < steps.length - 1) {
        step++;
        setCurrentStep(step);
      } else {
        clearInterval(interval);
      }
    }, 1800);
    return interval;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setIsProcessing(true);
    setCurrentStep(0);
    setError(null);

    const progressInterval = runProcessingMock();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("patientName", patientName || "Patient");
    formData.append("reportDate", reportDate);

    try {
      const res = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      clearInterval(progressInterval);
      setCurrentStep(steps.length - 1);

      // Delay navigation slightly so they see the completed progress
      setTimeout(() => {
        navigate(`/reports/${res.data._id}`);
      }, 800);
    } catch (err) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      console.error(err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "An error occurred during extraction. Make sure both Express and Python servers are running.",
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white">Upload Medical Report</h1>
        <p className="text-sm text-slate-400">
          PDFs and images will be analyzed automatically to explain values in
          simple language
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Upload card */}
      {!isProcessing ? (
        <div className="glass-card rounded-3xl border border-slate-800/60 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Drag and Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                dragActive
                  ? "border-cyan-400 bg-cyan-950/10 shadow-[0_0_20px_rgba(6,182,212,0.05)]"
                  : file
                    ? "border-slate-700 bg-slate-900/20"
                    : "border-slate-800 hover:border-slate-700 bg-slate-950/20"
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input").click()}
            >
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleChange}
              />

              {file ? (
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700/50">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">
                      Drag & drop your file here, or{" "}
                      <span className="text-cyan-400 hover:underline">
                        browse
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF, PNG, JPG, or JPEG up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Patient Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. John Doe (Optional)"
                    className="block w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Report Test Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] leading-relaxed text-slate-500">
              <strong className="text-slate-400 block mb-1">
                Educational Disclaimer:
              </strong>
              This application utilizes artificial intelligence models to parse
              and translate clinical metrics into simple terms. It does not
              provide medical diagnostics, medical opinions, or professional
              treatment advice. Always review lab results directly with a
              qualified healthcare physician.
            </div>

            <button
              type="submit"
              disabled={!file}
              className="flex w-full justify-center items-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-slate-900 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyze Report
            </button>
          </form>
        </div>
      ) : (
        /* Stepper processing loader screen */
        <div className="glass-card rounded-3xl border border-slate-800/60 p-8 shadow-2xl space-y-8 flex flex-col items-center">
          <div className="relative flex items-center justify-center mt-4">
            <Loader2 className="h-20 w-20 animate-spin text-cyan-500" />
            <div className="absolute flex h-12 w-12 items-center justify-center rounded-full bg-slate-950">
              <Cpu className="h-6 w-6 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-200">
              Processing Your Lab Sheet
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              This will take roughly 5-15 seconds. Please do not close this
              window.
            </p>
          </div>

          <div className="w-full max-w-md space-y-3">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isDone = idx < currentStep;
              const isActive = idx === currentStep;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all duration-300 ${
                    isDone
                      ? "border-emerald-500/10 bg-emerald-950/5 text-emerald-400"
                      : isActive
                        ? "border-cyan-500/20 bg-cyan-950/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.05)]"
                        : "border-transparent text-slate-600"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-semibold ${
                      isDone
                        ? "border-emerald-500/20 bg-emerald-500/10"
                        : isActive
                          ? "border-cyan-500/20 bg-cyan-500/10"
                          : "border-slate-800 bg-slate-950"
                    }`}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <StepIcon className="h-4.5 w-4.5" />
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportUpload;
