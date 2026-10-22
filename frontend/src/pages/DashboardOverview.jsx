import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FileText,
  Calendar,
  Trash2,
  Eye,
  GitCompare,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import API_BASE_URL from "../config/api";
const API_URL = `${API_BASE_URL}/api/reports`;

const DashboardOverview = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReports, setSelectedReports] = useState([]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setReports(res.data);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      await axios.delete(`${API_URL}/${id}`);
      setReports(reports.filter((r) => r._id !== id));
      setSelectedReports(
        selectedReports.filter((selectedId) => selectedId !== id),
      );
    } catch (err) {
      alert("Failed to delete report.");
    }
  };

  const handleSelectReport = (id) => {
    if (selectedReports.includes(id)) {
      setSelectedReports(
        selectedReports.filter((selectedId) => selectedId !== id),
      );
    } else {
      if (selectedReports.length >= 3) {
        alert("You can compare a maximum of 3 reports at once.");
        return;
      }
      setSelectedReports([...selectedReports, id]);
    }
  };

  const handleCompare = () => {
    if (selectedReports.length < 2) return;
    navigate(`/compare?ids=${selectedReports.join(",")}`);
  };

  // Calculate statistics from reports
  const totalReports = reports.length;
  let highFlags = 0;
  let lowFlags = 0;
  let normalCount = 0;

  reports.forEach((r) => {
    r.parameters?.forEach((p) => {
      if (p.status === "high") highFlags++;
      else if (p.status === "low") lowFlags++;
      else normalCount++;
    });
  });

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">
            Loading your health dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Health Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Manage, decode, and monitor your uploaded clinical tests
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedReports.length >= 2 && (
            <button
              onClick={handleCompare}
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all duration-200"
            >
              <GitCompare className="h-4.5 w-4.5" />
              Compare Selected ({selectedReports.length})
            </button>
          )}
          <Link
            to="/upload"
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10 transition-all duration-200"
          >
            <Plus className="h-4.5 w-4.5" />
            Upload New Report
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card rounded-2xl p-6 border border-slate-800/40">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">
              Total Uploads
            </span>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{totalReports}</p>
          <p className="text-xs text-slate-500 mt-2">
            Analyzed files in archive
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800/40">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">
              Alert Flags (High)
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-400">{highFlags}</p>
          <p className="text-xs text-slate-500 mt-2">
            Elevated parameter values
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800/40">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">
              Alert Flags (Low)
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-400">{lowFlags}</p>
          <p className="text-xs text-slate-500 mt-2">
            Depleted parameter values
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800/40">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">
              Normal Parameters
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{normalCount}</p>
          <p className="text-xs text-slate-500 mt-2">Within healthy ranges</p>
        </div>
      </div>

      {/* Reports Table / List */}
      <div className="glass-card rounded-3xl border border-slate-800/60 overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-850 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Your Medical Reports</h2>
          <span className="text-xs text-slate-400 font-medium">
            {selectedReports.length > 0
              ? `${selectedReports.length} selected for comparison`
              : "Select reports to compare"}
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <FileText className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-300">
              No reports uploaded yet
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
              Upload a digital copy (PDF or photo) of your lab results to start
              explaining them.
            </p>
            <Link
              to="/upload"
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all duration-200"
            >
              <Plus className="h-4.5 w-4.5" />
              Upload first report
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-950/20">
                  <th className="py-4 px-6 w-12 text-center">Compare</th>
                  <th className="py-4 px-6">Report File</th>
                  <th className="py-4 px-6">Patient</th>
                  <th className="py-4 px-6">Report Date</th>
                  <th className="py-4 px-6 text-center">Abnormal Flags</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-sm">
                {reports.map((report) => {
                  const abnormalParams =
                    report.parameters?.filter((p) => p.status !== "normal") ||
                    [];
                  const isSelected = selectedReports.includes(report._id);

                  return (
                    <tr
                      key={report._id}
                      className={`hover:bg-slate-800/20 transition-colors cursor-pointer ${
                        isSelected ? "bg-indigo-950/15" : ""
                      }`}
                      onClick={() => navigate(`/reports/${report._id}`)}
                    >
                      <td
                        className="py-4 px-6 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectReport(report._id)}
                          className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/30"
                        />
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-200">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                          <span className="truncate max-w-xs">
                            {report.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {report.patientName || "Patient"}
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          {new Date(report.reportDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {abnormalParams.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="h-3 w-3" />
                            {abnormalParams.length} Alert
                            {abnormalParams.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" />
                            Normal
                          </span>
                        )}
                      </td>
                      <td
                        className="py-4 px-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/reports/${report._id}`}
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition-all"
                            title="View Analysis"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(report._id, e)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-all"
                            title="Delete Report"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
