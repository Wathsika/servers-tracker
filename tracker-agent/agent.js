require("dotenv").config();
const si = require("systeminformation");
const mongoose = require("mongoose");
const axios = require("axios");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

const Server = mongoose.model(
  "Server",
  new mongoose.Schema({
    name: String,
    ip: String,
    status: String,
    lastSeen: Date,
    services: [{ name: String, running: Boolean }],
    containers: [
      {
        name: String,
        state: String,
        status: String,
        image: String,
        cpu: Number,
        mem: Number,
      },
    ],
    storage: {
      total: Number,
      used: Number,
      free: Number,
    },
  }),
);

const Metric = mongoose.model(
  "Metric",
  new mongoose.Schema({
    serverId: mongoose.Schema.Types.ObjectId,
    cpu: Number,
    ram: Number,
    disk: Number,
    timestamp: { type: Date, default: Date.now, expires: 3600 },
  }),
);

let logCounter = 0;

async function collect() {
  try {
    const [cpu, mem, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
    ]);

    // 1. SERVICES
    let thirdPartyServices = [];
    try {
      const { stdout } = await execAsync(
        "systemctl list-units --type=service --state=running --no-legend | awk '{print $1}'",
        { timeout: 10000 },
      );
      const raw = stdout.trim();
      if (raw) {
        const lines = raw.split("\n");
        for (const name of lines) {
          const { stdout: path } = await execAsync(
            `systemctl show ${name} -p FragmentPath`,
            { timeout: 5000 },
          );
          if (path.includes("/etc/systemd/system/")) {
            thirdPartyServices.push({
              name: name.replace(".service", ""),
              running: true,
            });
          }
        }
      }
    } catch (e) {
      console.log("Service check skipped (DBus busy)");
    }

    // 2. DOCKER
    let dockerData = [];
    try {
      const docker = await si.dockerContainers();
      if (docker && docker.length > 0) {
        dockerData = docker.map((c) => ({
          name: c.name,
          state: c.state,
          status: c.status,
          image: c.image,
          cpu: c.cpuPercent || 0,
          mem: c.memPercent || 0,
        }));
      }
    } catch (e) {
      console.log("Docker check failed: check permissions");
    }

    // 3. ROOT DISK
    const rootDisk = disk && disk.length > 0 ? (disk.find((d) => d.mount === "/") || disk[0]) : null;
    const storageData = rootDisk
      ? { total: rootDisk.size, used: rootDisk.used, free: rootDisk.available }
      : { total: 0, used: 0, free: 0 };

    // 4. UPDATE DB
    const server = await Server.findOneAndUpdate(
      { name: process.env.VPS_NAME },
      {
        ip: publicIp,
        lastSeen: new Date(),
        status: "online",
        services: thirdPartyServices,
        containers: dockerData,
        storage: storageData,
      },
      { upsert: true, returnDocument: "after" },
    );

    await Metric.create({
      serverId: server._id,
      cpu: parseFloat(cpu.currentLoad.toFixed(1)),
      ram: parseFloat(((mem.active / mem.total) * 100).toFixed(1)),
      disk: rootDisk ? parseFloat(rootDisk.use.toFixed(1)) : 0,
    });

    logCounter++;
    if (logCounter % 10 === 0) {
      console.log(
        `[${new Date().toLocaleTimeString()}] Apps: ${thirdPartyServices.length} | Docker: ${dockerData.length}`,
      );
    }
  } catch (err) {
    console.log("Loop Error:", err.message);
  }
}

let publicIp = "0.0.0.0";

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 2 });
    console.log(`🚀 Monitoring Active: ${process.env.VPS_NAME}`);

    try {
      const response = await axios.get("https://api.ipify.org?format=json", {
        timeout: 5000,
      });
      publicIp = response.data.ip;
    } catch (e) {
      publicIp = "Local";
    }

    const tick = async () => {
      await collect();
      setTimeout(tick, 15000);
    };
    tick();
  } catch (err) {
    console.log("DB Error:", err.message);
    setTimeout(run, 5000);
  }
}
run();
