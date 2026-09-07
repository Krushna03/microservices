import mongoose from "mongoose";
import { Payment } from "../models/payment.model.js";


export const findByOrderId = async (orderId, session = null) => {
   const query = Payment.findOne({ orderId });

   if (session) {
      query.session(session);
   }

   return query.lean();
};


export const findByPaymentId = async (paymentId, session = null) => {
  const query = Payment.findOne({ paymentId });

  if (session) {
    query.session(session);
  }

  return query.lean();
};


export const createPayment = async (paymentData, session) => {
   const [payment] = await Payment.create([paymentData], { session });

   return payment.toObject();
};


export const makePaymentCompleted = async (paymentId, transactionId, session) => {
  const filter = mongoose.isValidObjectId(paymentId)
    ? { $or: [{ _id: paymentId }, { paymentId: String(paymentId) }], status: "pending" }
    : { paymentId, status: "pending" };

  const payment = await Payment.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "completed",
        transactionId,
        failureReason: null,
      },
    },
    {
      returnDocument: "after",
      session,
      runValidators: true,
    }
  ).lean();

  return payment;
};


export const makePaymentFailed = async (paymentId, reason, session) => {
  const filter = mongoose.isValidObjectId(paymentId)
    ? { $or: [{ _id: paymentId }, { paymentId: String(paymentId) }], status: "pending" }
    : { paymentId, status: "pending" };

  const payment = await Payment.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "failed",
        failureReason: reason,
      },
    },
    {
      returnDocument: "after",
      session,
      runValidators: true,
    }
  ).lean();

  return payment;
};
