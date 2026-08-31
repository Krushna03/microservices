import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  userId: {
    type: String,
    required: true,
    index: true,
  },

  amount: {
    type: Number,
    required: true,
    min: 0,
  },

  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  status: {
    type: String,
    enum: [
      "pending",
      "completed",
      "failed",
      "refunded",
    ],
    default: "pending"
  },

  transactionId: {
    type: String,
    default: null,
  },

  failureReason: {
    type: String,
    default: null,
  },
}, { timestamps: true });


export const Payment = mongoose.model("Payment", paymentSchema)