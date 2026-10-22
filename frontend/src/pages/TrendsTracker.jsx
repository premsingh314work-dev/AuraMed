import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  ReferenceArea
} from "recharts";
import { 
  TrendingUp, 
  Activity, 
  Calendar, 
  Info,
  Loader2,
  AlertCircle
} from "lucide-react";

const API_URL = "http://localhost:5000/api/reports";

const TrendsTracker = () => {
  const [trends, setTrends] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selected parameter to graph
  const [selectedParam, setSelectedParam] = useState("");
  const [availableParams, setAvailableParams] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch raw reports to build parameters list and ref ranges
        const reportsRes = await axios.get(API_URL);
        setReports(reportsRes.data);

        // Build list of unique parameter names
        const paramNames = new Set();
        reportsRes.data.forEach(r => {
          r.parameters?.forEach(p => {
            paramNames.add(p.name);
          });
        });
        const paramList = Array.from(paramNames);
        setAvailableParams(paramList);
        if (paramList.length > 0) {
          setSelectedParam(paramList[0]);
        }

        // 2. Fetch trends aggregation
        const trendsRes = await axios.get(`${API_URL}/trends`);
        setTrends(trendsRes.data);

      } catch (err) {
        console.error("Error loading trends:", err);
        setError("Could not load tracking data. Please ensure the server is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Find reference range for selected parameter from reports
  const getReferenceRangeDetails = () => {
    if (!selectedParam || reports.length === 0) return null;
    
    // Find first parameter occurrence
    for (let r of reports) {
      const found = r.parameters?.find(p => p.name === selectedParam);
      if (found && found.reference_range) {
        // Try to parse values like "12.0 - 16.0" or "70 - 100"
        const matches = found.reference_range.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
        if (matches) {
          return {
            raw: found.reference_range,
            min: parseFloat(matches[1]),
            max: parseFloat(matches[2]),
            unit: found.unit
          };
        }
        return { raw: found.reference_range, min: null, max: null, unit: found.unit };
      }
    }
    return null;
  };

  const refRange = getReferenceRangeDetails();

  // Filter trends data to only include dates where selected parameter was measured
  const chartData = trends
    .filter(t => t[selectedParam] !== undefined)
    .map(t => ({
      date: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: t[selectedParam]
    }));

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">Aggregating historical biomarkers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Biomarker Tracker</h1>
        <p className="text-sm text-slate-400">Track and monitor your historical lab values across time with interactive trends</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">
          {error}
        </div>
      )}

      {availableParams.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center border border-slate-800/60 max-w-lg mx-auto">
          <TrendingUp className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No parameters to track yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Once you upload report sheets, our system automatically aggregates parameters over time to draw charts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Selector and Stats (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Select Parameter Card */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800/60 shadow-xl space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Select Parameter to Track
              </label>
              
              <select
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value)}
                className="block w-full py-3 px-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              >
                {availableParams.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              {refRange && (
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/10 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
                    <Info className="h-4 w-4" />
                    <span>Reference Range standards</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Standard range:</span>
                    <strong className="text-slate-200">{refRange.raw} {refRange.unit}</strong>
                  </div>
                  {refRange.min !== null && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Lower limit:</span>
                        <span>{refRange.min} {refRange.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Upper limit:</span>
                        <span>{refRange.max} {refRange.unit}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick stats on tracking parameter */}
            {chartData.length > 0 && (
              <div className="glass-card rounded-3xl p-6 border border-slate-800/60 shadow-xl space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Tracking Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-medium">Recordings</span>
                    <p className="text-xl font-bold text-slate-200 mt-1">{chartData.length}</p>
                  </div>
                  <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-medium">Latest Value</span>
                    <p className="text-xl font-bold text-cyan-400 mt-1">
                      {chartData[chartData.length - 1]?.value} <span className="text-xs font-normal text-slate-400">{refRange?.unit}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] leading-relaxed text-slate-500">
              <strong className="text-slate-400 block mb-1">Graph Interpretation:</strong>
              The shaded band in the chart represents the healthy reference range. Standard values fall inside this band. Values outside are highlighted above or below standard bands.
            </div>

          </div>

          {/* Right panel: Recharts visual (8 cols) */}
          <div className="lg:col-span-8 glass-card rounded-3xl p-6 border border-slate-800/60 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">Visual Trend of {selectedParam}</h2>
            </div>

            {chartData.length < 1 ? (
              <div className="h-[350px] flex items-center justify-center text-slate-500 text-sm">
                No history data available for this parameter.
              </div>
            ) : (
              <div className="h-[350px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      {/* Area Gradient */}
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      tickLine={false}
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc'
                      }}
                      itemStyle={{ color: '#22d3ee' }}
                      labelClassName="text-slate-400 font-semibold"
                    />

                    {/* Reference band for normal range */}
                    {refRange && refRange.min !== null && refRange.max !== null && (
                      <ReferenceArea 
                        y1={refRange.min} 
                        y2={refRange.max} 
                        fill="#10b981" 
                        fillOpacity={0.05} 
                      />
                    )}
                    
                    {/* Minimum Limit Line */}
                    {refRange && refRange.min !== null && (
                      <ReferenceLine 
                        y={refRange.min} 
                        stroke="#e2e8f0" 
                        strokeDasharray="3 3" 
                        opacity={0.3}
                        label={{ value: 'min limit', fill: '#64748b', position: 'insideBottomLeft' }} 
                      />
                    )}

                    {/* Maximum Limit Line */}
                    {refRange && refRange.max !== null && (
                      <ReferenceLine 
                        y={refRange.max} 
                        stroke="#e2e8f0" 
                        strokeDasharray="3 3" 
                        opacity={0.3}
                        label={{ value: 'max limit', fill: '#64748b', position: 'insideTopLeft' }} 
                      />
                    )}

                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      name={selectedParam}
                      stroke="#0ea5e9" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      activeDot={{ r: 6, stroke: '#0f172a', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default TrendsTracker;
