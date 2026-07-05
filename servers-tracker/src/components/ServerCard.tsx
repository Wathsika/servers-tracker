"use client";
import { useState } from "react";
import ServerChart from "./ServerChart";

type MetricType = "cpu" | "ram" | "disk";
type ViewType = "graph" | "services" | "containers" | "storage";

function formatStorage(total: number, used: number, free: number) {
  // systeminformation returns bytes on most systems, but some return MB
  // Detect: if total > 10 GB in bytes, it's bytes; otherwise it's MB
  const divisor = total > 10 * 1024 ** 3 ? 1024 ** 3 : 1024;
  return {
    total: (total / divisor).toFixed(1),
    used: (used / divisor).toFixed(1),
    free: (free / divisor).toFixed(1),
  };
}

const metricConfigs = {
  cpu: { color: "#3b82f6" },
  ram: { color: "#a855f7" },
  disk: { color: "#10b981" },
};

export default function ServerCard({ server }: { server: any }) {
  const [activeChart, setActiveChart] = useState<MetricType>("cpu");
  const [activeView, setActiveView] = useState<ViewType>("graph");

  const isOffline =
    new Date().getTime() - new Date(server.lastSeen).getTime() > 30000;

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-xl transition-all">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white italic tracking-tight">
          {server.name}
        </h3>
        <span
          className={`text-[9px] font-black px-2 py-0.5 rounded border ${isOffline ? "border-red-500/30 text-red-500" : "border-green-500/30 text-green-500 animate-pulse"}`}
        >
          {isOffline ? "OFFLINE" : "LIVE"}
        </span>
      </div>

      {/* Interactive Metric Boxes */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(["cpu", "ram", "disk"] as MetricType[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setActiveChart(m);
              setActiveView("graph");
            }}
            className={`p-3 rounded-xl border transition-all ${
              activeChart === m && activeView === "graph"
                ? "bg-slate-700/50 shadow-lg"
                : "bg-slate-900/40 border-slate-700/30"
            }`}
            style={{
              borderColor:
                activeChart === m && activeView === "graph"
                  ? metricConfigs[m].color
                  : "",
            }}
          >
            <p
              className="text-[9px] font-bold uppercase opacity-50 mb-1"
              style={{ color: activeChart === m ? metricConfigs[m].color : "" }}
            >
              {m}
            </p>
            <p className="text-xl font-black text-white">
              {isOffline ? "0" : server.latestMetric?.[m]}%
            </p>
          </button>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 mb-4 border-b border-slate-700/30 pb-2">
          {(["graph", "services", "containers", "storage"] as ViewType[]).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`text-[10px] font-bold uppercase tracking-widest ${activeView === v ? "text-blue-400" : "text-slate-500"}`}
          >
            {v === "graph" ? "History" : v}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[160px]">
        {activeView === "graph" &&
          (!isOffline ? (
            <ServerChart
              data={server.history}
              metric={activeChart}
              color={metricConfigs[activeChart].color}
            />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-600 text-[10px] font-bold uppercase border border-dashed border-slate-700 rounded-xl">
              Connection Lost
            </div>
          ))}

        {activeView === "services" && (
          <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
            {server.services?.length > 0 ? (
              server.services.map((svc: any) => (
                <div
                  key={svc.name}
                  className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg border border-slate-700/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                    <span className="text-[11px] font-bold text-slate-200">
                      {svc.name}
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-green-500 uppercase">
                    Active
                  </span>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-600 text-[10px]">
                No 3rd-party apps detected
              </div>
            )}
          </div>
        )}

        {activeView === "containers" && (
          <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar">
            {server.containers?.length > 0 ? (
              server.containers.map((c: any) => (
                <div
                  key={c.name}
                  className="bg-slate-900/40 p-2 rounded-lg border border-slate-700/30"
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] font-bold text-blue-400 truncate w-32">
                      {c.name}
                    </span>
                    <span className="text-[8px] text-green-500 uppercase font-bold">
                      {c.state}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>CPU: {c.cpu}%</span>
                    <span>MEM: {c.mem}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-600 text-[10px]">
                No containers running
              </div>
            )}
          </div>
        )}

        {activeView === "storage" && (
          <div className="space-y-3">
            {server.storage ? (
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Disk Usage
                  </span>
                  <span className="text-[11px] font-mono text-slate-300">
                    {server.latestMetric?.disk || 0}%
                  </span>
                </div>
                <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${server.latestMetric?.disk || 0}%`,
                      background:
                        (server.latestMetric?.disk || 0) > 90
                          ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                          : (server.latestMetric?.disk || 0) > 70
                            ? "linear-gradient(90deg, #3b82f6, #f59e0b)"
                            : "linear-gradient(90deg, #10b981, #3b82f6)",
                    }}
                  />
                </div>
                {(() => {
                  const f = formatStorage(server.storage.total, server.storage.used, server.storage.free);
                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-800/60 p-2 rounded-lg">
                        <p className="text-[8px] text-slate-500 uppercase font-bold">Total</p>
                        <p className="text-[13px] font-black text-white">{f.total}</p>
                        <p className="text-[8px] text-slate-500">GB</p>
                      </div>
                      <div className="bg-slate-800/60 p-2 rounded-lg">
                        <p className="text-[8px] text-slate-500 uppercase font-bold">Used</p>
                        <p className="text-[13px] font-black text-yellow-400">{f.used}</p>
                        <p className="text-[8px] text-slate-500">GB</p>
                      </div>
                      <div className="bg-slate-800/60 p-2 rounded-lg">
                        <p className="text-[8px] text-slate-500 uppercase font-bold">Free</p>
                        <p className="text-[13px] font-black text-green-400">{f.free}</p>
                        <p className="text-[8px] text-slate-500">GB</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-600 text-[10px]">
                No storage data available
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/30 flex justify-between text-[9px] font-mono text-slate-600">
        <span>IP: {server.ip || "Detecting..."}</span>
        <span>{new Date(server.lastSeen).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
