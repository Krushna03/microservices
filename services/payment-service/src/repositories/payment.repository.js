import { Payment } from "../models/payment.model.js";


export const findByOrderId = async (orderId, session = null) => {
   const query = Payment.findOne({ orderId })

   if (session) {
      query.session(session);
   }

   return query.lean();
};


export const createPayment = async (paymentData, session) => {
   const [payment] = await Payment.create([paymentData], { session });

   return payment.toObject();
}


export const makePaymentCompleted = async (paymentId, transactionId, session) => {

  const payment = await Payment.findByIdAndUpdate(
    paymentId,
    {
      $set: {
        status: "completed",
        transactionId,
        failureReason: null,
      },
    },
    {
      new: true,
      session,
      runValidators: true,
    }
  ).lean();

  return payment;
}


export const makePaymentFailed = async (paymentId, reason, session) => {
  
  const payment = await Payment.findByIdAndUpdate(
    paymentId,
    {
      $set: {
        status: "failed",
        failureReason: reason
      }
    },
    {
      new: true,
      session,
      runValidators: true,
    }
  ).lean();

  return payment;
}
