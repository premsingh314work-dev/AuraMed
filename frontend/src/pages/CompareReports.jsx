import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import {
  getCachedComparison,
  saveCachedComparison,
} from "../lib/comparisonCache";

const API_URL = "http://localhost:5000/api/reports/compare";
const SUMMARY_API_URL = "http://localhost:5000/api/reports/compare/summary";
const MAX_REPORTS = 3;

const normalizeName = (name = "") =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getParameterName = (parameter) =>
  parameter?.name ??
  parameter?.parameterName ??
  parameter?.testName ??
  parameter?.label ??
  "Unknown parameter";

const getParameterValue = (parameter) =>
  parameter?.value ??
  parameter?.result ??
  parameter?.measuredValue ??
  parameter?.reading ??
  null;

const getParameterUnit = (parameter) =>
  parameter?.unit ?? parameter?.units ?? "";

const getReferenceRange = (parameter) => {
  const range =
    parameter?.referenceRange ??
    parameter?.normalRange ??
    parameter?.reference_range ??
    parameter?.range;

  if (range == null || range === "") return "Not provided";
  if (typeof range === "string" || typeof range === "number") {
    return String(range);
  }

  if (typeof range === "object") {
    const min = range.min ?? range.low ?? range.lower;
    const max = range.max ?? range.high ?? range.upper;
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `≥ ${min}`;
    if (max != null) return `≤ ${max}`;
    return range.text ?? range.label ?? "Not provided";
  }

  return "Not provided";
};

const getParameterStatus = (parameter) => {
  const status = String(
    parameter?.status ?? parameter?.interpretation ?? parameter?.flag ?? "",
  ).toLowerCase();

  if (status.includes("critical") || status.includes("danger"))
    return "critical";
  if (status.includes("high") || status.includes("elevated")) return "high";
  if (status.includes("low") || status.includes("below")) return "low";
  if (status.includes("normal") || status.includes("within range"))
    return "normal";
  return status || "unknown";
};

const getNumericValue = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;

  const match = value.trim().match(/^[-+]?\d*\.?\d+/);
  if (!match) return null;

  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
};

const formatValue = (parameter) => {
  const value = getParameterValue(parameter);
  if (value == null || value === "") return "—";
  const unit = getParameterUnit(parameter);
  return `${value}${unit ? ` ${unit}` : ""}`;
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getReportDate = (report) =>
  report?.reportDate ?? report?.createdAt ?? report?.updatedAt ?? null;

const getReportParameters = (report) => {
  const parameters =
    report?.parameters ??
    report?.reportData?.parameters ??
    report?.analysis?.parameters ??
    [];

  if (Array.isArray(parameters)) return parameters;

  if (parameters && typeof parameters === "object") {
    return Object.entries(parameters).map(([name, data]) =>
      data && typeof data === "object" && !Array.isArray(data)
        ? { name, ...data }
        : { name, value: data },
    );
  }

  return [];
};

const getReportId = (report) => String(report?._id ?? report?.id ?? "");

const getReportTitle = (report) =>
  report?.fileName ?? report?.originalName ?? report?.name ?? "Medical report";

const getStatusClasses = (status) => {
  switch (status) {
    case "high":
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
    case "low":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    case "normal":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
};

const getStatusLabel = (status) => {
  if (status === "unknown") return "Not assessed";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getTrend = (previous, current) => {
  if (!previous || !current) {
    return { type: "unavailable", label: "Not enough data" };
  }

  const previousUnit = String(getParameterUnit(previous)).trim().toLowerCase();
  const currentUnit = String(getParameterUnit(current)).trim().toLowerCase();

  if (previousUnit !== currentUnit) {
    return { type: "unavailable", label: "Different units" };
  }

  const previousValue = getNumericValue(getParameterValue(previous));
  const currentValue = getNumericValue(getParameterValue(current));

  if (previousValue == null || currentValue == null) {
    return { type: "unavailable", label: "Unavailable" };
  }
  if (currentValue > previousValue) return { type: "up", label: "Increased" };
  if (currentValue < previousValue) return { type: "down", label: "Decreased" };
  return { type: "same", label: "Unchanged" };
};

const normalizeSummary = (data) => {
  if (!data || typeof data !== "object") return null;

  const headline =
    typeof data.headline === "string" ? data.headline.trim() : "";
  if (!headline) return null;

  return {
    ...data,
    headline,
    keyChanges: Array.isArray(data.keyChanges) ? data.keyChanges : [],
    overallNotes: Array.isArray(data.overallNotes)
      ? data.overallNotes
      : typeof data.overallNotes === "string"
        ? [data.overallNotes]
        : [],
    missingData: Array.isArray(data.missingData) ? data.missingData : [],
    disclaimer:
      data.disclaimer ??
      "This summary is informational and does not replace advice from a qualified healthcare professional.",
  };
};

const getErrorMessage = (error) =>
  error?.response?.data?.detail ??
  error?.response?.data?.message ??
  error?.message ??
  "Something went wrong. Please try again.";

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function TrendIndicator({ trend }) {
  if (trend.type === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
        <TrendingUp size={15} />
        {trend.label}
      </span>
    );
  }

  if (trend.type === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
        <TrendingDown size={15} />
        {trend.label}
      </span>
    );
  }

  if (trend.type === "same") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowRight size={15} />
        {trend.label}
      </span>
    );
  }

  return <span className="text-xs text-gray-500">{trend.label}</span>;
}

function SummaryList({ items, emptyText }) {
  if (!items?.length) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  // Extract readable text even if the API returns JSON as a string.
  const getReadableText = (item) => {
    let value = item;

    if (typeof value === "string") {
      const trimmed = value.trim();

      // Parse serialized JSON objects, but preserve normal text.
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          value = JSON.parse(trimmed);
        } catch {
          return value;
        }
      } else {
        return value;
      }
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Prefer the actual patient-friendly explanation.
      return (
        value.details ||
        value.description ||
        value.message ||
        value.text ||
        value.name ||
        value.headline ||
        "No explanation available."
      );
    }

    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : "No explanation available.";
  };

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const isObject =
          item !== null && typeof item === "object" && !Array.isArray(item);

        const parameter =
          isObject && typeof item.parameter === "string" ? item.parameter : "";

        const change =
          isObject && typeof item.change === "string" ? item.change : "";

        const text = getReadableText(item);

        return (
          <li
            key={`${parameter || "item"}-${index}`}
            className="flex items-start gap-2 text-sm"
          >
            <span className="mt-0.5 text-indigo-500">•</span>

            <div className="min-w-0 flex-1 space-y-1">
              {parameter && (
                <p className="font-semibold text-gray-900 dark:text-white">
                  {parameter}
                  {change && (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {change}
                    </span>
                  )}
                </p>
              )}

              <p className="break-words leading-6 text-gray-700 dark:text-gray-300">
                {text}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function QuickSummary({ summary, loading, error, source, onRetry }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm dark:border-indigo-900 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50/70 px-5 py-4 dark:border-indigo-950 dark:bg-indigo-950/30">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
            <Sparkles size={21} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              AI Quick Summary
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              An overview of the selected reports
            </p>
          </div>
        </div>

        {source === "cache" && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Loaded from IndexedDB
          </span>
        )}
        {source === "ai" && (
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            AI generated
          </span>
        )}
      </div>

      <div className="p-5">
        {loading && (
          <div className="flex items-center gap-3 py-5 text-gray-600 dark:text-gray-300">
            <LoaderCircle className="animate-spin" size={20} />
            Generating your comparison summary...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <RefreshCw size={15} />
              Retry summary
            </button>
          </div>
        )}

        {!loading && !error && summary && (
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Overall assessment
              </h3>
              <p className="text-base leading-7 text-gray-800 dark:text-gray-200">
                {summary.headline}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/70">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Activity size={17} className="text-indigo-500" />
                  Key changes
                </h3>
                <SummaryList
                  items={summary.keyChanges}
                  emptyText="No specific changes were highlighted."
                />
              </div>

              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/70">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Info size={17} className="text-indigo-500" />
                  Important notes
                </h3>
                <SummaryList
                  items={summary.overallNotes}
                  emptyText="No additional notes were provided."
                />
              </div>
            </div>

            {summary.missingData.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <h3 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">
                  Data to keep in mind
                </h3>
                <SummaryList
                  items={summary.missingData}
                  emptyText="No missing data reported."
                />
              </div>
            )}

            <p className="border-t border-gray-100 pt-4 text-xs leading-5 text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {summary.disclaimer}
            </p>
          </div>
        )}

        {!loading && !error && !summary && (
          <p className="text-sm text-gray-500">
            A comparison summary is not available.
          </p>
        )}
      </div>
    </section>
  );
}

export default function CompareReports() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const userId = user?._id ?? user?.id;

  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [summarySource, setSummarySource] = useState(null);
  const [expandedParameters, setExpandedParameters] = useState(false);

  // Supports both ?ids=id1,id2 and ?ids=id1&ids=id2 URL formats.
  const reportIds = useMemo(
    () => [
      ...new Set(
        searchParams
          .getAll("ids")
          .flatMap((value) => value.split(","))
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ],
    [searchParams],
  );

  // Declare validSelection exactly once.
  const validSelection =
    reportIds.length >= 2 && reportIds.length <= MAX_REPORTS;

  const fetchSummary = useCallback(
    async (selectedReports, selectedIds, activeUserId) => {
      setSummaryLoading(true);
      setSummaryError("");

      try {
        const response = await axios.post(
          SUMMARY_API_URL,
          { reportIds: selectedIds },
          { withCredentials: true },
        );

        const normalized = normalizeSummary(response.data);
        if (!normalized) {
          throw new Error(
            "The AI response did not contain a valid summary headline.",
          );
        }

        setSummary(normalized);
        setSummarySource("ai");

        try {
          await saveCachedComparison(
            activeUserId,
            selectedIds,
            selectedReports,
            normalized,
          );
        } catch (cacheError) {
          console.error("Could not cache comparison:", cacheError);
        }
      } catch (requestError) {
        console.error("Comparison summary error:", requestError);
        setSummaryError(getErrorMessage(requestError));
      } finally {
        setSummaryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return undefined;

    let cancelled = false;

    const loadComparison = async () => {
      setLoading(true);
      setError("");
      setSummaryError("");
      setReports([]);
      setSummary(null);
      setSummarySource(null);

      if (!userId) {
        setError("Please log in to compare your reports.");
        setLoading(false);
        return;
      }

      if (!validSelection) {
        setError("Select between 2 and 3 reports to compare.");
        setLoading(false);
        return;
      }

      try {
        // Cache hit: show saved reports and summary without API requests.
        try {
          const cached = await getCachedComparison(userId, reportIds);
          const cachedSummary = normalizeSummary(cached?.summary);

          if (
            !cancelled &&
            cached &&
            Array.isArray(cached.reports) &&
            cached.reports.length === reportIds.length &&
            cachedSummary
          ) {
            const cachedReports = [...cached.reports].sort(
              (a, b) =>
                new Date(getReportDate(a) || 0).getTime() -
                new Date(getReportDate(b) || 0).getTime(),
            );

            setReports(cachedReports);
            setSummary(cachedSummary);
            setSummarySource("cache");
            setLoading(false);
            return;
          }
        } catch (cacheError) {
          console.error("IndexedDB cache read failed; using API:", cacheError);
        }

        const response = await axios.get(API_URL, {
          params: { ids: reportIds.join(",") },
          withCredentials: true,
        });

        if (cancelled) return;

        const fetchedReports = Array.isArray(response.data)
          ? response.data
          : response.data?.reports;

        if (
          !Array.isArray(fetchedReports) ||
          fetchedReports.length !== reportIds.length
        ) {
          throw new Error(
            "Could not load all selected reports. Check the report IDs and your permissions.",
          );
        }

        const sortedReports = [...fetchedReports].sort(
          (a, b) =>
            new Date(getReportDate(a) || 0).getTime() -
            new Date(getReportDate(b) || 0).getTime(),
        );

        setReports(sortedReports);
        setLoading(false);

        // Express should verify ownership and fetch the reports before
        // forwarding them to FastAPI/Groq.
        await fetchSummary(sortedReports, reportIds, userId);
      } catch (requestError) {
        if (cancelled) return;
        console.error("Report comparison error:", requestError);
        setError(getErrorMessage(requestError));
        setLoading(false);
      }
    };

    loadComparison();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, validSelection, reportIds, fetchSummary]);

  const parameterRows = useMemo(() => {
    const rows = new Map();

    reports.forEach((report, reportIndex) => {
      getReportParameters(report).forEach((parameter) => {
        const name = getParameterName(parameter);
        const key = normalizeName(name);
        if (!key) return;

        if (!rows.has(key)) {
          rows.set(key, {
            key,
            name,
            values: Array(reports.length).fill(null),
          });
        }

        rows.get(key).values[reportIndex] = parameter;
      });
    });

    return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [reports]);

  const displayedRows = expandedParameters
    ? parameterRows
    : parameterRows.slice(0, 12);

  const handleRetrySummary = () => {
    if (reports.length < 2 || !userId) return;
    fetchSummary(reports, reportIds, userId);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
          <LoaderCircle size={32} className="animate-spin text-indigo-600" />
          <p>Loading your medical reports...</p>
        </div>
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-gray-900">
          <AlertCircle className="mb-3 text-red-500" size={30} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Unable to compare reports
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
            <Activity size={17} />
            Medical report analysis
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Compare Reports
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Review changes in your recorded medical parameters over time.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <FileText size={16} />
          {reports.length} reports selected
        </div>
      </header>

      {reports.length >= 2 && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report, index) => (
              <article
                key={getReportId(report) || index}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    <FileText size={20} />
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    Report {index + 1}
                  </span>
                </div>

                <h2 className="break-words font-semibold text-gray-900 dark:text-white">
                  {getReportTitle(report)}
                </h2>
                {report?.patientName && (
                  <p className="mt-1 text-sm text-gray-500">
                    Patient: {report.patientName}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(getReportDate(report))}
                </p>
              </article>
            ))}
          </section>

          <QuickSummary
            summary={summary}
            loading={summaryLoading}
            error={summaryError}
            source={summarySource}
            onRetry={handleRetrySummary}
          />

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Parameter comparison
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {parameterRows.length} unique parameters found
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <ArrowLeft size={15} />
                Back
              </button>
            </div>

            {parameterRows.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Info size={28} className="mx-auto mb-3 text-gray-400" />
                <p className="font-medium text-gray-700 dark:text-gray-200">
                  No structured parameters found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  The selected reports may contain extracted text or summaries
                  without structured parameters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/70">
                    <tr>
                      <th className="sticky left-0 z-10 min-w-48 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                        Parameter
                      </th>
                      {reports.map((report, index) => (
                        <th
                          key={getReportId(report) || index}
                          className="min-w-48 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700"
                        >
                          <div>Report {index + 1}</div>
                          <div className="mt-1 font-normal normal-case tracking-normal">
                            {formatDate(getReportDate(report))}
                          </div>
                        </th>
                      ))}
                      <th className="min-w-40 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700">
                        Trend
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayedRows.map((row) => {
                      const presentParameters = row.values.filter(Boolean);
                      const first = presentParameters[0] ?? null;
                      const last =
                        presentParameters[presentParameters.length - 1] ?? null;
                      const trend = getTrend(first, last);

                      return (
                        <tr
                          key={row.key}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30"
                        >
                          <td className="sticky left-0 z-10 border-r border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {row.name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Reference:{" "}
                              {first
                                ? getReferenceRange(first)
                                : "Not provided"}
                            </p>
                          </td>

                          {row.values.map((parameter, index) => (
                            <td
                              key={`${row.key}-${index}`}
                              className="px-4 py-4"
                            >
                              {parameter ? (
                                <div className="space-y-2">
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {formatValue(parameter)}
                                  </p>
                                  <StatusBadge
                                    status={getParameterStatus(parameter)}
                                  />
                                  {getReferenceRange(parameter) !==
                                    "Not provided" &&
                                    getReferenceRange(parameter) !==
                                      getReferenceRange(first) && (
                                      <p className="text-xs text-gray-500">
                                        Range: {getReferenceRange(parameter)}
                                      </p>
                                    )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">
                                  Not available
                                </span>
                              )}
                            </td>
                          ))}

                          <td className="px-4 py-4">
                            <TrendIndicator trend={trend} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {parameterRows.length > 12 && (
              <div className="border-t border-gray-200 px-5 py-3 text-center dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setExpandedParameters((previous) => !previous)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  {expandedParameters ? (
                    <>
                      Show fewer parameters
                      <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      Show all {parameterRows.length} parameters
                      <ChevronDown size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </section>

          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <Info
              className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
              size={19}
            />
            <p className="text-sm leading-6 text-blue-900 dark:text-blue-200">
              An increase or decrease is not necessarily an improvement or
              deterioration. Interpretation depends on the test, units,
              reference range, medical history, and clinical context. Discuss
              significant findings with a qualified healthcare professional.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
