import mongoose, { Schema, model, models } from "mongoose";

const MetricSchema = new Schema({
  serverId: { type: Schema.Types.ObjectId, ref: "Server", required: true },
  cpu: Number,
  ram: Number,
  disk: Number,
  timestamp: { type: Date, default: Date.now },
});

export default models.Metric || model("Metric", MetricSchema);
