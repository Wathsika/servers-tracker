import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Server from "@/models/Server";
import Metric from "@/models/Metric";

export async function GET() {
  await connectDB();
  const servers = await Server.find().lean();

  const dashboardData = await Promise.all(
    servers.map(async (server: any) => {
      const history = await Metric.find({ serverId: server._id })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      return {
        ...server,
        history: history.reverse() || [], // Ensure it's at least an empty array
        latestMetric: history[0] || { cpu: 0, ram: 0, disk: 0 },
      };
    }),
  );

  return NextResponse.json(dashboardData);
}
