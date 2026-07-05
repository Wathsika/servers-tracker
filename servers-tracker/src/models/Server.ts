import mongoose, { Schema, model, models } from "mongoose";

const ServerSchema = new Schema({
  name: { type: String, required: true, unique: true },
  ip: { type: String },
  status: { type: String, default: "online" },
  lastSeen: { type: Date, default: Date.now },
  // Array for discovered services (AdGuard, Xray, Nginx, etc.)
  services: [
    {
      name: String,
      running: Boolean,
    },
  ],
  // Array for Docker containers
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
});

export default models.Server || model("Server", ServerSchema);
