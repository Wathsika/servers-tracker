require("dotenv").config();
const si = require("systeminformation");
const mongoose = require("mongoose");

// Define the Models inside the agent script
const Server = mongoose.model(
  "Server",
  new mongoose.Schema({
    name: String,
    status: String,
    lastSeen: Date,
  }),
);

const Metric = mongoose.model(
  "Metric",
  new mongoose.Schema({
    serverId: mongoose.Schema.Types.ObjectId,
    cpu: Number,
    ram: Number,
    disk: Number,
    timestamp: { type: Date, default: Date.now },
  }),
);

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas!");

    setInterval(async () => {
      try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const disk = await si.fsSize();

        // 1. Update Heartbeat
        const server = await Server.findOneAndUpdate(
          { name: process.env.VPS_NAME },
          { lastSeen: new Date(), status: "online" },
          { upsert: true, returnDocument: "after" },
        );

        // 2. Save Metrics
        await Metric.create({
          serverId: server._id,
          cpu: parseFloat(cpu.currentLoad.toFixed(1)),
          ram: parseFloat(((mem.active / mem.total) * 100).toFixed(1)),
          disk: parseFloat(disk[0].use.toFixed(1)),
        });

        console.log(
          `[${new Date().toLocaleTimeString()}] Metrics Synced for ${process.env.VPS_NAME}`,
        );
      } catch (err) {
        console.error("Loop error:", err.message);
      }
    }, 10000); // Sends data every 10 seconds
  } catch (err) {
    console.error("Connection error:", err.message);
  }
}

run();
