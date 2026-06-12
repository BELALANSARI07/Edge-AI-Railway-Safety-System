import React, { useState } from 'react';
import { History, Download, Trash2, ArrowUpDown } from 'lucide-react';

export default function EventLog({ events = [], onClearLogs }) {
  const [sortOrder, setSortOrder] = useState('desc'); // desc (newest first) or asc (oldest first)
  const [filterRisk, setFilterRisk] = useState('ALL');

  const handleExportCSV = () => {
    if (events.length === 0) return;
    
    // Construct CSV content
    const headers = ['Timestamp', 'Detected Hazard', 'Distance (cm)', 'Train State', 'Stop Reason'];
    const rows = events.map(e => [
      e.timestamp,
      e.object,
      e.distance,
      e.decision,
      e.stopReason
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `railway_safety_event_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRiskBadge = (risk) => {
    switch ((risk || 'LOW').toUpperCase()) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-ping"></span>
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            UNKNOWN
          </span>
        );
    }
  };

  const getTrainStateBadge = (state) => {
    switch ((state || 'UNKNOWN').toUpperCase()) {
      case 'STOP':
        return <span className="text-red-450 bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded font-bold tracking-wider">STOP</span>;
      case 'RUN':
        return <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">RUN</span>;
      default:
        return <span className="text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">{state}</span>;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timeStr) => {
    if (!timeStr) return '--:--:--';
    try {
      // Split "2026-06-11 18:21:28" to extract time easily or fallback
      const match = timeStr.match(/\d{2}:\d{2}:\d{2}/);
      if (match) return match[0];
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return '--:--:--';
    }
  };

  // Filter & Sort
  const filteredEvents = events.filter(e => {
    if (filterRisk === 'ALL') return true;
    return (e.risk || 'LOW').toUpperCase() === filterRisk;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const timeA = new Date(a.timestamp.replace(/-/g, '/')).getTime(); // replace hyphen for Safari compatibility
    const timeB = new Date(b.timestamp.replace(/-/g, '/')).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="glass rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Header and Controls */}
      <div className="bg-slate-900/80 px-5 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Safety Control Log</h3>
            <p className="text-xs text-slate-500">Real-time history of AI detection states</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Risk Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-850">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Severity:</span>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-transparent text-xs text-slate-200 border-none outline-none cursor-pointer font-semibold"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">ALL</option>
              <option value="HIGH" className="bg-slate-900 text-red-400">HIGH RISK</option>
              <option value="MEDIUM" className="bg-slate-900 text-amber-400">WARNING</option>
              <option value="LOW" className="bg-slate-900 text-emerald-400">SAFE</option>
            </select>
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-950/40 text-xs text-slate-300 font-semibold border border-slate-850 hover:bg-slate-800/60 rounded-lg transition"
            title={sortOrder === 'desc' ? 'Sort oldest first' : 'Sort newest first'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="capitalize">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
              events.length === 0 
                ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500' 
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/10'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={onClearLogs}
            disabled={events.length === 0}
            className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
              events.length === 0 
                ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500' 
                : 'bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-slate-400 border-slate-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Event List Table */}
      <div className="overflow-x-auto max-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-900">
              <th className="px-5 py-3">Log Time</th>
              <th className="px-5 py-3">Detected Hazard</th>
              <th className="px-5 py-3 text-right">Distance</th>
              <th className="px-5 py-3 text-center">Train State</th>
              <th className="px-5 py-3">Stop Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-xs">
            {sortedEvents.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-8 text-center text-slate-500 italic">
                  {filterRisk !== 'ALL' 
                    ? `No event logs recorded matching severity '${filterRisk}'` 
                    : 'Corridor monitoring active. Waiting for system telemetry...'}
                </td>
              </tr>
            ) : (
              sortedEvents.map((evt, idx) => (
                <tr 
                  key={evt.id || idx} 
                  className={`hover:bg-slate-900/40 transition-colors ${
                    evt.decision === 'STOP' ? 'bg-red-500/5 hover:bg-red-500/10' : ''
                  }`}
                >
                  <td className="px-5 py-2.5 font-mono text-slate-400">
                    {evt.timestamp}
                  </td>
                  <td className="px-5 py-2.5 font-semibold text-slate-200 uppercase">
                    {evt.object}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-slate-300 text-right">
                    {evt.distance !== undefined ? `${evt.distance.toFixed(2)} cm` : '0.00 cm'}
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    {getTrainStateBadge(evt.decision)}
                  </td>
                  <td className="px-5 py-2.5 font-medium text-slate-400">
                    {evt.stopReason || '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Log Summary Status Footer */}
      <div className="bg-slate-950/40 px-5 py-2.5 text-[10px] text-slate-500 font-mono border-t border-slate-900 flex justify-between">
        <span>Log Buffer Size: {events.length} / 50</span>
        <span>Filter Yield: {sortedEvents.length} items</span>
      </div>
    </div>
  );
}
