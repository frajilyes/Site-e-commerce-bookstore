const mongoose = require("mongoose");

const webHookSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },

    type: { type: String, required: true, index: true },

    data: { type: mongoose.Schema.Types.Mixed },

    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date },
    attempts: { type: Number, default: 0 },
    error: { type: String },
  },
  { timestamps: true },
);

webHookSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("WebHook", webHookSchema);
