import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Send,
  User,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  Sparkles,
  Clipboard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/reports";

const ReportExplainer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [expandedParam, setExpandedParam] = useState(null);
  const [error, setError] = useState(null);

  const chatEndRef = useRef(null);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/${id}`);
      setReport(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch report details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportDetails();
  }, [id]);

  useEffect(() => {
    // Scroll to bottom of chat when chat history updates
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [report?.chatHistory]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || chatLoading) return;

    const userMsg = question.trim();
    setQuestion("");
    setChatLoading(true);

    // Optimistically update chat history UI with user message
    setReport((prev) => ({
      ...prev,
      chatHistory: [
        ...prev.chatHistory,
        { role: "user", content: userMsg, timestamp: new Date() },
      ],
    }));

    try {
      const res = await axios.post(`${API_URL}/${id}/chat`, {
        question: userMsg,
      });
      // Update report state with exact response from server
      setReport((prev) => ({
        ...prev,
        chatHistory: res.data.chatHistory,
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to get response from AI. Make sure servers are running.");
    } finally {
      setChatLoading(false);
    }
  };

  const toggleParamExpansion = (idx) => {
    setExpandedParam(expandedParam === idx ? null : idx);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">
            Loading analysis and insights...
          </p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 glass-card rounded-2xl text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error Loading Report</h3>
        <p className="text-sm text-slate-400">{error || "Report not found."}</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Count abnormal markers
  const abnormalCount =
    report.parameters?.filter((p) => p.status !== "normal").length || 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(report.reportDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Clipboard className="h-4 w-4" />
            <span className="truncate max-w-[150px] font-semibold text-slate-300">
              {report.fileName}
            </span>
          </div>
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Parameters and summary (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6 h-full">
          {/* Summary Box */}
          <div className="glass-card rounded-3xl p-6 border border-slate-800/60 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">
                AI Explainer Summary
              </h2>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-4 rounded-2xl border border-slate-800/40">
              {report.summary}
            </p>

            {abnormalCount > 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  We detected {abnormalCount} parameters that fall outside
                  standard ranges. Click parameters below to see simplified
                  explanations.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  All parameters look normal and fall within healthy clinical
                  standards!
                </span>
              </div>
            )}
          </div>

          {/* Parameters Details List */}
          <div className="glass-card rounded-3xl p-6 border border-slate-800/60 shadow-xl flex-1">
            <h2 className="text-lg font-bold text-white mb-5">
              Biomarkers & Parameters
            </h2>

            <div className="space-y-3">
              {report.parameters?.map((param, idx) => {
                const isExpanded = expandedParam === idx;

                // Color codes
                let statusBg =
                  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                if (param.status === "high") {
                  statusBg =
                    "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                } else if (param.status === "low") {
                  statusBg =
                    "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                }

                return (
                  <div
                    key={param._id || idx}
                    className={`rounded-2xl border transition-all duration-200 ${
                      isExpanded
                        ? "bg-slate-900/50 border-slate-700/60"
                        : "bg-slate-950/20 border-slate-800 hover:border-slate-800/80"
                    }`}
                  >
                    <div
                      onClick={() => toggleParamExpansion(idx)}
                      className="flex items-center justify-between p-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            param.status === "high"
                              ? "bg-rose-400"
                              : param.status === "low"
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                          }`}
                        />
                        <div>
                          <p className="font-semibold text-sm text-slate-200">
                            {param.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Ref Range: {param.reference_range} {param.unit}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-sm text-slate-100">
                            {param.value}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">
                            {param.unit}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${statusBg}`}
                        >
                          {param.status}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/40 text-xs text-slate-300 leading-relaxed animate-slideDown">
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                          <strong className="text-slate-400 block mb-1">
                            What this means:
                          </strong>
                          {param.explanation ||
                            "No explanation details provided."}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lifestyle Recommendations */}
          {report.lifestyleRecommendations?.length > 0 && (
            <div className="glass-card rounded-3xl p-6 border border-slate-800/60 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white">
                Suggested Lifestyle Adjustments
              </h2>
              <ul className="space-y-2.5">
                {report.lifestyleRecommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-300"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Right Side: Chatbot explainer (5 cols) */}
        <section className="lg:col-span-5 flex flex-col glass-card rounded-3xl border border-slate-800/60 shadow-xl overflow-hidden h-[600px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-6 min-h-0">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-850 bg-slate-900/30 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                AuraMed AI Chatbot
              </h2>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
                Ask about this report
              </p>
            </div>
          </div>

          {/* Disclaimer banner */}
          <div className="px-4 py-2 border-b border-slate-850 bg-slate-950/40 text-[10px] text-slate-500 flex items-center gap-1.5 leading-relaxed">
            <HelpCircle className="h-4.5 w-4.5 text-cyan-500/60 flex-shrink-0" />
            <span>
              Ask questions like <i>"Why is my sugar high?"</i> or{" "}
              <i>"How to improve iron levels?"</i>. For guidance only, not
              diagnoses.
            </span>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            {report.chatHistory?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-600 border border-slate-800/40">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">
                  Start the Conversation
                </h4>
                <p className="text-xs text-slate-500 max-w-[240px]">
                  Ask any clarifying questions about the clinical terms,
                  numbers, or suggestions in your report.
                </p>
              </div>
            ) : (
              report.chatHistory?.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg._id || idx}
                    className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fadeIn`}
                  >
                    <div
                      className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold shrink-0 ${
                          isUser
                            ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                            : "border-slate-800 bg-slate-900 text-slate-400"
                        }`}
                      >
                        {isUser ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed border ${
                          isUser
                            ? "bg-cyan-500/5 border-cyan-500/15 text-slate-200 rounded-tr-none"
                            : "bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* AI Typing loading indicator */}
            {chatLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="flex items-start gap-2.5 max-w-[80%]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-slate-900 border border-slate-800 text-xs text-slate-500">
                    AuraMed AI is typing...
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Form Input */}
          <form
            onSubmit={handleAskQuestion}
            className="p-4 border-t border-slate-850 bg-slate-900/20 flex gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your report..."
              disabled={chatLoading}
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!question.trim() || chatLoading}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ReportExplainer;
