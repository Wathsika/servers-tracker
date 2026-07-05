require("dotenv").config();
const v8 = require("v8");
v8.setFlagsFromString("--optimize_for_size");
v8.setFlagsFromString("--max_old_space_size=48");
const mongoose = require("mongoose");
const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");

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

// --- NATIVE METRIC HELPERS ---

let prevCpu = null;

function readCpu() {
  const stat = fs.readFileSync("/proc/stat", "utf8");
  const parts = stat.split("\n")[0].split(/\s+/);
  const user = parseInt(parts[1]);
  const nice = parseInt(parts[2]);
  const system = parseInt(parts[3]);
  const idle = parseInt(parts[4]);
  const iowait = parseInt(parts[5]);
  const irq = parseInt(parts[6]);
  const softirq = parseInt(parts[7]);
  const steal = parseInt(parts[8]);
  const total = user + nice + system + idle + iowait + irq + softirq + steal;
  const cur = { total, idle: idle + iowait };

  if (!prevCpu) {
    prevCpu = cur;
    return 0;
  }
  const tDelta = cur.total - prevCpu.total;
  const iDelta = cur.idle - prevCpu.idle;
  prevCpu = cur;
  return tDelta > 0 ? parseFloat(((tDelta - iDelta) / tDelta * 100).toFixed(1)) : 0;
}

function readRam() {
  const info = fs.readFileSync("/proc/meminfo", "utf8");
  const total = parseInt(info.match(/MemTotal:\s+(\d+)/)[1]);
  const avail = parseInt(info.match(/MemAvailable:\s+(\d+)/)[1]);
  return { total, used: total - avail };
}

function readDisk() {
  const line = execSync("df -B1 /", { stdio: ["pipe", "pipe", "ignore"], timeout: 5000 })
    .toString().trim().split("\n")[1];
  const p = line.split(/\s+/);
  return {
    size: parseInt(p[1]),
    used: parseInt(p[2]),
    available: parseInt(p[3]),
    use: parseFloat(p[4].replace("%", "")),
  };
}

function fetchIp() {
  return new Promise((resolve) => {
    const req = https.get("https://api.ipify.org?format=json", { timeout: 5000 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data).ip); } catch (e) { resolve("Local"); }
      });
    });
    req.on("error", () => resolve("Local"));
    req.setTimeout(5000, () => { req.destroy(); resolve("Local"); });
  });
}

// --- STATE ---
let publicIp = "0.0.0.0";
let logCounter = 0;
let cycleCount = 0;
let collecting = false;
let lastDockerData = [];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 2 });
    console.log(`🚀 Monitoring Active: ${process.env.VPS_NAME}`);

    publicIp = await fetchIp();

    setInterval(async () => {
      if (collecting) return;
      collecting = true;
      cycleCount++;

      try {
        const cpuPct = readCpu();
        const ram = readRam();
        const disk = readDisk();
        const ramPct = ram.total > 0
          ? parseFloat(((ram.used / ram.total) * 100).toFixed(1))
          : 0;

        // 1. SERVICES
        let thirdPartyServices = [];
        try {
          const raw = execSync(
            "systemctl list-units --type=service --state=running --no-legend | awk '{print $1}'",
            { stdio: ["pipe", "pipe", "ignore"], timeout: 10000 },
          ).toString().trim();
          if (raw) {
            const lines = raw.split("\n");
            for (const name of lines) {
              const path = execSync(
                `systemctl show ${name} -p FragmentPath`,
                { timeout: 5000 },
              ).toString();
              if (path.includes("/etc/systemd/system/")) {
                thirdPartyServices.push({ name: name.replace(".service", ""), running: true });
              }
            }
          }
        } catch (e) {
          console.log("Service check skipped (DBus busy)");
        }

        // 2. DOCKER (every 5th cycle)
        let dockerData = lastDockerData;
        if (cycleCount % 5 === 1) {
          try {
            const listOut = execSync(
              "docker ps -a --format json 2>/dev/null",
              { stdio: ["pipe", "pipe", "ignore"], timeout: 5000 },
            ).toString().trim();
            if (listOut) {
              const containers = listOut.split("\n").filter((l) => l).map((l) => JSON.parse(l));
              let stats = {};
              try {
                const sOut = execSync(
                  "docker stats --no-stream --format json 2>/dev/null",
                  { stdio: ["pipe", "pipe", "ignore"], timeout: 5000 },
                ).toString().trim();
                if (sOut) {
                  sOut.split("\n").filter((l) => l).forEach((l) => {
                    const s = JSON.parse(l);
                    stats[s.Name.replace(/^\//, "")] = s;
                  });
                }
              } catch (e) {}

              dockerData = containers.map((c) => {
                const s = stats[c.Names];
                return {
                  name: c.Names,
                  state: c.State,
                  status: c.Status,
                  image: c.Image,
                  cpu: s ? parseFloat(s.CPUPerc) || 0 : 0,
                  mem: s ? parseFloat(String(s.MemPerc).replace("%", "")) || 0 : 0,
                };
              });
              lastDockerData = dockerData;
            }
          } catch (e) {
            console.log("Docker check failed: check permissions");
          }
        }

        // 3. STORAGE
        const storageData = {
          total: disk.size,
          used: disk.used,
          free: disk.available,
        };

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
          cpu: cpuPct,
          ram: ramPct,
          disk: disk.use,
        });

        logCounter++;
        if (logCounter % 10 === 0) {
          console.log(
            `[${new Date().toLocaleTimeString()}] CPU:${cpuPct}% RAM:${ramPct}% Apps:${thirdPartyServices.length} Docker:${dockerData.length}`,
          );
        }
      } catch (err) {
        console.log("Loop Error:", err.message);
      } finally {
        collecting = false;
      }
    }, 15000);
  } catch (err) {
    console.log("DB Error:", err.message);
  }
}
run();
