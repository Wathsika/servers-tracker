"use client";
import { useEffect, useState } from "react";

interface ServerData {
  _id: string;
  name: string;
  status: string;
  lastSeen: string;
  latestMetric?: {
    cpu: number;
    ram: number;
    disk: number;
  };
}

export default function Dashboard() {
  const [servers, setServers] = useState<ServerData[]>([]);

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/metrics");
      const data = await res.json();
      setServers(data);
    } catch (err) {
      console.error("Failed to fetch servers", err);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Logic to determine if server is offline (no signal for 30 seconds)
  const isOffline = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    return now - lastSeenDate > 30000;
  };

  return (
    <main className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 border-b border-gray-800 pb-4">
          Infrastructure Overview
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => {
            const offline = isOffline(server.lastSeen);

            return (
              <div
                key={server._id}
                className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{server.name}</h2>
                  <span
                    className={`h-3 w-3 rounded-full ${offline ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
                  ></span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1 text-gray-400">
                      <span>CPU Usage</span>
                      <span>{offline ? "0" : server.latestMetric?.cpu}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${offline ? 0 : server.latestMetric?.cpu}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1 text-gray-400">
                      <span>RAM Usage</span>
                      <span>{offline ? "0" : server.latestMetric?.ram}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${offline ? 0 : server.latestMetric?.ram}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700 flex justify-between text-xs text-gray-500">
                    <span>Status: {offline ? "OFFLINE" : "ONLINE"}</span>
                    <span>
                      Last seen:{" "}
                      {new Date(server.lastSeen).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
