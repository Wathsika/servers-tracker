"use client";
import { useState } from "react";
import ServerChart from "./ServerChart";

type MetricType = "cpu" | "ram" | "disk";

const metricConfigs = {
  cpu: { color: "#3b82f6", label: "CPU" },
  ram: { color: "#a855f7", label: "RAM" },
  disk: { color: "#10b981", label: "Disk" },
};

export default function ServerCard({ server }: { server: any }) {
  const [activeChart, setActiveChart] = useState<MetricType>("cpu");
  const isOffline =
    new Date().getTime() - new Date(server.lastSeen).getTime() > 30000;

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-xl hover:border-slate-600/50 transition-all">
      {/* Name and Status */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white tracking-tight">
          {server.name}
        </h3>
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${isOffline ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isOffline ? "bg-red-500" : "bg-green-500 animate-pulse"}`}
          />
          <span className="text-[10px] font-black uppercase tracking-tighter">
            {isOffline ? "Offline" : "Online"}
          </span>
        </div>
      </div>

      {/* CLICKABLE METRIC BOXES */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* CPU Box */}
        <button
          onClick={() => setActiveChart("cpu")}
          className={`p-3 rounded-xl border transition-all text-center ${
            activeChart === "cpu"
              ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              : "bg-slate-900/40 border-slate-700/30 hover:border-slate-500"
          }`}
        >
          <p
            className={`text-[9px] font-bold uppercase mb-1 ${activeChart === "cpu" ? "text-blue-400" : "text-slate-500"}`}
          >
            CPU
          </p>
          <p
            className={`text-xl font-black ${activeChart === "cpu" ? "text-white" : "text-blue-400"}`}
          >
            {isOffline ? "0" : server.latestMetric?.cpu}%
          </p>
        </button>

        {/* RAM Box */}
        <button
          onClick={() => setActiveChart("ram")}
          className={`p-3 rounded-xl border transition-all text-center ${
            activeChart === "ram"
              ? "bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              : "bg-slate-900/40 border-slate-700/30 hover:border-slate-500"
          }`}
        >
          <p
            className={`text-[9px] font-bold uppercase mb-1 ${activeChart === "ram" ? "text-purple-400" : "text-slate-500"}`}
          >
            RAM
          </p>
          <p
            className={`text-xl font-black ${activeChart === "ram" ? "text-white" : "text-purple-400"}`}
          >
            {isOffline ? "0" : server.latestMetric?.ram}%
          </p>
        </button>

        {/* Disk Box */}
        <button
          onClick={() => setActiveChart("disk")}
          className={`p-3 rounded-xl border transition-all text-center ${
            activeChart === "disk"
              ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              : "bg-slate-900/40 border-slate-700/30 hover:border-slate-500"
          }`}
        >
          <p
            className={`text-[9px] font-bold uppercase mb-1 ${activeChart === "disk" ? "text-emerald-400" : "text-slate-500"}`}
          >
            Disk
          </p>
          <p
            className={`text-xl font-black ${activeChart === "disk" ? "text-white" : "text-emerald-400"}`}
          >
            {isOffline ? "0" : server.latestMetric?.disk}%
          </p>
        </button>
      </div>

      {/* Chart Display */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
          Visualizing {activeChart} history
        </span>
      </div>

      {!isOffline && server.history?.length > 0 ? (
        <ServerChart
          data={server.history}
          metric={activeChart}
          color={metricConfigs[activeChart].color}
        />
      ) : (
        <div className="h-40 mt-4 flex items-center justify-center border border-dashed border-slate-700 rounded-xl text-slate-600 text-xs uppercase font-bold tracking-widest">
          {isOffline ? "Connection Lost" : "No Data"}
        </div>
      )}

      {/* Footer Details */}
      <div className="mt-4 flex justify-between items-center text-[9px] font-mono text-slate-600">
        <span>IP: {server.ip || ""}</span>
        <span>SYNC: {new Date(server.lastSeen).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
