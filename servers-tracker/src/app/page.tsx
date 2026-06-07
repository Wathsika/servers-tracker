"use client";
import { useEffect, useState, useCallback } from "react";
import ServerCard from "@/components/ServerCard";
import { UserButton } from "@clerk/nextjs";

interface Server {
  _id: string;
  name: string;
  status: string;
  [key: string]: string | number | boolean | unknown[] | Record<string, unknown> | undefined;
}

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setServers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Dashboard error:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    if (mounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchServers();
    }
    
    const interval = setInterval(() => {
      if (mounted) {
        fetchServers();
      }
    }, 5000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchServers]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 border-b border-slate-800 pb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">
              SERVERS<span className="text-blue-500">TRACKER</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Cloud Infrastructure Monitoring
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Total Nodes
              </p>
              <p className="text-xl font-black text-white">{servers.length}</p>
            </div>
            <div className="pl-6 border-l border-slate-800 h-10 flex items-center">
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-10 h-10"
                  }
                }}
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <ServerCard key={server._id} server={server} />
          ))}
        </div>
      </div>
    </div>
  );
}
