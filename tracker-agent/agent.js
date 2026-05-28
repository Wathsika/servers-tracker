// tracker-agent/agent.js
const si = require("systeminformation");
const axios = require("axios");

// CONFIGURATION
const API_URL = "http://localhost:3000/api/metrics"; // Change to your deployed URL later
const VPS_NAME = "personal-laptop"; // Unique name for this VPS
const INTERVAL = 5000; // 5 seconds

async function collectAndSendMetrics() {
  try {
    // Collect metrics using systeminformation
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const disk = await si.fsSize();

    const payload = {
      name: VPS_NAME,
      cpu: parseFloat(cpu.currentLoad.toFixed(1)),
      ram: parseFloat(((mem.active / mem.total) * 100).toFixed(1)),
      disk: parseFloat(disk[0].use.toFixed(1)),
    };

    console.log(
      `[${new Date().toLocaleTimeString()}] Sending metrics...`,
      payload,
    );

    await axios.post(API_URL, payload);
  } catch (error) {
    console.error("Error sending metrics:", error.message);
  }
}

// Start the loop
console.log(
  `Agent started for ${VPS_NAME}. Monitoring every ${INTERVAL / 1000}s...`,
);
setInterval(collectAndSendMetrics, INTERVAL);
