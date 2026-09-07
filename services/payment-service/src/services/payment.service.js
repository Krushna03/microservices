import mongoose from "mongoose";
import crypto from "crypto";

import {
  findByOrderId,
  createPayment,
  makePaymentCompleted,
  makePaymentFailed,
} from "../repositories/payment.repository.js";

import {
  createOutboxEvent,
} from "../repositories/outbox.repository.js";

import {
  chargePayment,
} from "../providers/payment.provider.js";

import {
  BusinessError,
} from "../../../../shared/errors/business-error.js";


export const processInventoryReserved = async (event, session) => {
  const {
    orderId,
    userId,
    amount,
    items,
  } = event.payload;

  /*
   * ============================================================
   * 1. Check whether payment already exists
   * ============================================================
   *
   * This protects us from creating multiple payments for
   * the same order if the InventoryReserved event is delivered
   * more than once.
   */

  const existingPayment = await findByOrderId(
    orderId,
    session
  );

  if (existingPayment) {
    return {
      alreadyExists: true,
      payment: existingPayment,
    };
  }

  /*
   * ============================================================
   * 2. Generate internal payment ID
   * ============================================================
   */

  const paymentId = crypto.randomUUID();

  /*
   * ============================================================
   * 3. Create pending payment
   * ============================================================
   */

  const payment = await createPayment(
    {
      paymentId,
      orderId,
      userId,
      amount,
      status: "pending",
    },
    session
  );

  try {
    /*
     * ==========================================================
     * 4. Call Payment Provider
     * ==========================================================
     */

    const paymentResult = await chargePayment({
      paymentId,
      orderId,
      amount,
    });

    /*
     * ==========================================================
     * 5. Mark Payment Completed
     * ==========================================================
     */

    const completedPayment = await makePaymentCompleted(
      payment._id,
      paymentResult.transactionId,
      session
    );

    /*
     * Defensive check.
     *
     * The payment should still be pending because this
     * transaction owns the payment creation.
     */

    if (!completedPayment) {
      throw new Error(
        `Payment ${paymentId} could not be completed`
      );
    }

    /*
     * ==========================================================
     * 6. Create PaymentSucceeded Outbox Event
     * ==========================================================
     *
     * Payment update + Outbox event happen in the same
     * MongoDB transaction.
     */

    await createOutboxEvent(
      {
        eventId: crypto.randomUUID(),

        eventType: "PaymentSucceeded",

        correlationId: event.correlationId,

        aggregateType: "Payment",

        aggregateId: payment._id.toString(),

        payload: {
          orderId,
          userId,
          amount,
          paymentId,
          transactionId: paymentResult.transactionId,
          items,
        },
      },
      session
    );

    return {
      success: true,
      orderId,
      paymentId,
      transactionId: paymentResult.transactionId,
    };

  } catch (error) {

    /*
     * ==========================================================
     * BUSINESS FAILURE
     * ==========================================================
     *
     * Example:
     * - Card declined
     * - Insufficient funds
     * - Payment rejected
     *
     * These failures should NOT be retried by RabbitMQ.
     */

    if (
      error instanceof BusinessError ||
      error?.isBusinessError
    ) {

      await makePaymentFailed(
        payment._id,
        error.message,
        session
      );

      /*
       * PaymentFailed is a business event.
       */

      await createOutboxEvent(
        {
          eventId: crypto.randomUUID(),

          eventType: "PaymentFailed",

          correlationId: event.correlationId,

          aggregateType: "Payment",

          aggregateId: payment._id.toString(),

          payload: {
            orderId,
            userId,
            amount,
            paymentId,
            reason: error.message,
            items,
          },
        },
        session
      );

      return {
        success: false,
        orderId,
        paymentId,
        reason: error.message,
      };
    }

    /*
     * ==========================================================
     * SYSTEM FAILURE
     * ==========================================================
     *
     * Examples:
     * - MongoDB unavailable
     * - Provider timeout
     * - Network error
     * - Unexpected error
     *
     * Do NOT mark payment as failed.
     *
     * Throwing causes the MongoDB transaction to rollback.
     * processMessageWithRetry() will then retry the event.
     */

    throw error;
  }
};


// export const createPendingPayment = async (event) => {
//   const session = await mongoose.startSession();

//   try {
//     let result;

//     await session.withTransaction(async () => {
//         /*
//          * Idempotency check
//          */
//         const alreadyProcessed =
//           await findProcessedEvent(
//             event.eventId,
//             session
//           );

//         if (alreadyProcessed) {
//           result = {
//             alreadyProcessed: true,
//           };

//           return;
//         }

//         const {
//           orderId,
//           userId,
//           amount,
//         } = event.payload;

//         /*
//          * Check whether payment already exists.
//          */
//         const existingPayment =
//           await findByOrderId(
//             orderId,
//             session
//           );

//         if (existingPayment) {
//           await createProcessedEvent(
//             event,
//             session
//           );

//           result = {
//             alreadyProcessed: true,
//             paymentId:
//               existingPayment.paymentId,
//             orderId,
//             userId,
//             amount,
//           };

//           return;
//         }

//         /*
//          * Generate our internal payment ID.
//          */
//         const paymentId =
//           crypto.randomUUID();

//         /*
//          * Create pending payment.
//          */
//         const payment =
//           await createPayment(
//             {
//               orderId,
//               userId,
//               amount,
//               paymentId,
//               status: "pending",
//             },
//             session
//           );

//         /*
//          * Mark InventoryReserved as processed.
//          */
//         await createProcessedEvent(
//           event,
//           session
//         );

//         result = {
//           success: true,
//           paymentId:
//             payment.paymentId,
//           orderId,
//           userId,
//           amount,
//         };
//       }
//     );

//     return result;
//   } finally {
//     await session.endSession();
//   }
// };


// export const completePayment = async ({
//   paymentId,
//   orderId,
//   userId,
//   amount,
//   transactionId,
// }) => {
//   const session =
//     await mongoose.startSession();

//   try {
//     let result;

//     await session.withTransaction(
//       async () => {
//         const payment =
//           await makePaymentCompleted(
//             paymentId,
//             transactionId,
//             session
//           );

//         /*
//          * Somebody already completed/failed it.
//          */
//         if (!payment) {
//           result = {
//             alreadyFinalized: true,
//           };

//           return;
//         }

//         /*
//          * PaymentSucceeded is written
//          * atomically with the payment update.
//          */
//         await createOutboxEvent(
//           {
//             eventId:
//               crypto.randomUUID(),

//             eventType:
//               "PaymentSucceeded",

//             aggregateType:
//               "Payment",

//             aggregateId:
//               paymentId,

//             payload: {
//               orderId,
//               userId,
//               amount,
//               transactionId,
//             },
//           },
//           session
//         );

//         result = {
//           success: true,
//           orderId,
//           paymentId,
//           transactionId,
//         };
//       }
//     );

//     return result;
//   } finally {
//     await session.endSession();
//   }
// };


// export const failPayment = async ({
//   paymentId,
//   orderId,
//   userId,
//   amount,
//   reason,
// }) => {
//   const session =
//     await mongoose.startSession();

//   try {
//     let result;

//     await session.withTransaction(
//       async () => {
//         const payment =
//           await makePaymentFailed(
//             paymentId,
//             reason,
//             session
//           );

//         /*
//          * Somebody already finalized
//          * this payment.
//          */
//         if (!payment) {
//           result = {
//             alreadyFinalized: true,
//           };

//           return;
//         }

//         /*
//          * PaymentFailed is a business event.
//          */
//         await createOutboxEvent(
//           {
//             eventId:
//               crypto.randomUUID(),

//             eventType:
//               "PaymentFailed",

//             aggregateType:
//               "Payment",

//             aggregateId:
//               paymentId,

//             payload: {
//               orderId,
//               userId,
//               amount,
//               reason,
//             },
//           },
//           session
//         );

//         result = {
//           success: false,
//           orderId,
//           paymentId,
//           reason,
//         };
//       }
//     );

//     return result;
//   } finally {
//     await session.endSession();
//   }
// };

