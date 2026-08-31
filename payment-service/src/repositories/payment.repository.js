import { Payment } from "../models/payment.model.js";


export const findByOrderId = async (orderId, session = null) => {
   const query = Payment.findOne({ orderId })

   if (session) {
      query.session(session);
   }

   return query;
};


export const createPayment = async (paymentData, session) => {
   const [payment] = await Payment.create([paymentData], { session });

   return payment;
}


export const makePaymentCompleted = async (paymentId, transactionId, session) => {

  return Payment.findByIdAndUpdate(
    paymentId,
    {
      $set: {
        status: "completed",
        transactionId
      },
    },
    {
      new: true,
      session
    }
  );
}


export const makePaymentFailed = async (paymentId, reason, session) => {
  
  return Payment.findByIdAndUpdate(
    paymentId,
    {
      $set: {
        status: "failed",
        failureReason: reason
      }
    },
    {
      new: true,
      session
    }
  );
}
