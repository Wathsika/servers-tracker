import mongoose, { model, Schema, models } from "mongoose";

const ServerSchema = new Schema({
  name: { type: String, required: true, unique: true },
  ip: { type: String },
  status: { type: String, default: "online" },
  lastseen: { type: Date, default: Date.now },
});

export default models.Server || model("Server", ServerSchema);
