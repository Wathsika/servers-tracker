import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Server from "@/models/Server";
import Metric from "@/models/Metric";

export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json(); // { name, cpu, ram, disk }

    // 1. Find or Create the server
    let server = await Server.findOne({ name: data.name });
    if (!server) {
      server = await Server.create({ name: data.name, status: "online" });
    }

    // 2. Update server "lastSeen" and status
    server.lastSeen = new Date();
    server.status = "online";
    await server.save();

    // 3. Save the new metrics
    await Metric.create({
      serverId: server._id,
      cpu: data.cpu,
      ram: data.ram,
      disk: data.disk,
    });

    return NextResponse.json({ message: "Metrics recorded" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to store metrics" },
      { status: 500 },
    );
  }
}

// GET route to fetch data for the dashboard
export async function GET() {
  await connectDB();
  // Get all servers and their latest metric
  const servers = await Server.find().lean();

  const dashboardData = await Promise.all(
    servers.map(async (server) => {
      const latestMetric = await Metric.findOne({ serverId: server._id }).sort({
        timestamp: -1,
      });
      return { ...server, latestMetric };
    }),
  );

  return NextResponse.json(dashboardData);
}
