require("dotenv").config();
const si = require("systeminformation");
const mongoose = require("mongoose");
const { execSync } = require("child_process"); // Used to run deep Linux commands

// --- DATABASE SETUP ---
const Server = mongoose.model(
  "Server",
  new mongoose.Schema({
    name: String,
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
    console.log(`🚀 Efficient Monitoring: ${process.env.VPS_NAME}`);

    setInterval(async () => {
      try {
        // 1. Fetch basic hardware metrics
        const [cpu, mem, disk] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.fsSize(),
        ]);

        /**
         * 2. SMART SERVICE DISCOVERY
         * This command finds only services whose config files are in /etc/systemd/system
         * It ignores all the default Linux OS services in /lib/systemd/system
         */
        let thirdPartyServices = [];
        try {
          const rawServices = execSync(
            "systemctl list-units --type=service --state=running --no-legend | awk '{print $1}'",
          )
            .toString()
            .trim()
            .split("\n");

          for (let serviceName of rawServices) {
            // Check where the service configuration file is located
            const path = execSync(
              `systemctl show ${serviceName} -p FragmentPath`,
            )
              .toString()
              .trim();

            // If the path starts with /etc/systemd/system, it is a third-party app
            if (path.includes("/etc/systemd/system/")) {
              thirdPartyServices.push({
                name: serviceName.replace(".service", ""),
                running: true,
              });
            }
          }
        } catch (e) {
          console.log("Service check failed");
        }

        // 3. Docker Containers
        let dockerData = [];
        try {
          const docker = await si.dockerContainers();
          if (docker) {
            dockerData = docker.map((c) => ({
              name: c.name,
              state: c.state,
              status: c.status,
              image: c.image,
              cpu: c.cpuPercent,
              mem: c.memPercent,
            }));
          }
        } catch (e) {
          dockerData = [];
        }

        // 4. Update DB (Minimal JSON sent)
        const server = await Server.findOneAndUpdate(
          { name: process.env.VPS_NAME },
          {
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
          `[${new Date().toLocaleTimeString()}] Sent ${thirdPartyServices.length} Apps.`,
        );
      } catch (err) {
        console.log("Loop Error:", err.message);
      }
    }, 15000); // 15s is plenty for real-time and saves bandwidth
  } catch (err) {
    console.log("DB Error:", err.message);
  }
}

run();
