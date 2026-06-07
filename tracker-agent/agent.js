require("dotenv").config();
const si = require("systeminformation");
const mongoose = require("mongoose");
const axios = require("axios");
const { execSync } = require("child_process");

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
    console.log(`🚀 Monitoring Active: ${process.env.VPS_NAME}`);

    let publicIp = "0.0.0.0";
    try {
      const response = await axios.get("https://api.ipify.org?format=json", {
        timeout: 5000,
      });
      publicIp = response.data.ip;
    } catch (e) {
      publicIp = "Local";
    }

    setInterval(async () => {
      try {
        const [cpu, mem, disk] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.fsSize(),
        ]);

        // 1. SERVICES (With Try/Catch to prevent DBus errors from stopping Docker)
        let thirdPartyServices = [];
        try {
          const raw = execSync(
            "systemctl list-units --type=service --state=running --no-legend | awk '{print $1}'",
            { stdio: ["pipe", "pipe", "ignore"] },
          )
            .toString()
            .trim();
          if (raw) {
            const lines = raw.split("\n");
            for (let name of lines) {
              const path = execSync(
                `systemctl show ${name} -p FragmentPath`,
              ).toString();
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

        // 2. DOCKER (Independent check)
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

        // 3. UPDATE DB
        const server = await Server.findOneAndUpdate(
          { name: process.env.VPS_NAME },
          {
            ip: publicIp,
            lastSeen: new Date(),
            status: "online",
            services: thirdPartyServices,
            containers: dockerData,
          },
          { upsert: true, returnDocument: "after" },
        );

        await Metric.create({
          serverId: server._id,
          cpu: parseFloat(cpu.currentLoad.toFixed(1)),
          ram: parseFloat(((mem.active / mem.total) * 100).toFixed(1)),
          disk: parseFloat(disk[0].use.toFixed(1)),
        });

        console.log(
          `[${new Date().toLocaleTimeString()}] Apps: ${thirdPartyServices.length} | Docker: ${dockerData.length}`,
        );
      } catch (err) {
        console.log("Loop Error:", err.message);
      }
    }, 15000);
  } catch (err) {
    console.log("DB Error:", err.message);
  }
}
run();
