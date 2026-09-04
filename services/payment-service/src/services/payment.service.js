import mongoose from "mongoose";
import crypto from "crypto";
import { findByOrderId, createPayment, makePaymentCompleted, makePaymentFailed, } from "../repositories/payment.repository.js";
import { createOutboxEvent } from "../repositories/outbox.repository.js";
import { findProcessedEvent, createProcessedEvent } from "../repositories/event.repository.js";
import { chargePayment } from "../providers/payment.provider.js";

export const processInventoryReserved = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // 1. Idempotency check
      const alreadyProcessed = await findProcessedEvent(
        event.eventId,
        session
      );

      if (alreadyProcessed) {
        console.log(
          `[Payment Service] Event already processed: ${event.eventId}`
        );

        result = {
          alreadyProcessed: true,
        };

        return;
      }

      const {
        orderId,
        userId,
        amount,
        items,
      } = event.payload;

      // 2. Check existing payment
      const existingPayment = await findByOrderId(
        orderId,
        session
      );

      if (existingPayment) {
        await createProcessedEvent(event, session);

        result = {
          alreadyExists: true,
          payment: existingPayment,
        };

        return;
      }

      // 3. Generate payment ID
      const paymentId = crypto.randomUUID();

      // 4. Create pending payment
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
        // 5. Call payment provider
        const paymentResult = await chargePayment({
          paymentId,
          orderId,
          amount,
        });

        // 6. Payment succeeded
        await makePaymentCompleted(
          payment._id,
          paymentResult.transactionId,
          session
        );

        // 7. Create PaymentSucceeded event
        await createOutboxEvent(
          {
            eventId: crypto.randomUUID(),
            eventType: "PaymentSucceeded",
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

        result = {
          success: true,
          orderId,
          paymentId,
          transactionId: paymentResult.transactionId,
        };

      } catch (error) {

        // 8. Business failure
        if (error instanceof BusinessError) {
          await makePaymentFailed(
            payment._id,
            error.message,
            session
          );

          // 9. Create PaymentFailed event
          await createOutboxEvent(
            {
              eventId: crypto.randomUUID(),
              eventType: "PaymentFailed",
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

          result = {
            success: false,
            orderId,
            paymentId,
            reason: error.message,
          };

          return;
        }

        // 10. System failure
        // Do NOT create PaymentFailed.
        // Transaction will rollback.
        throw error;
      }

      // 11. Mark incoming event processed
      await createProcessedEvent(event, session);
    });

    return result;

  } finally {
    await session.endSession();
  }
};


export const createPendingPayment = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
        /*
         * Idempotency check
         */
        const alreadyProcessed =
          await findProcessedEvent(
            event.eventId,
            session
          );

        if (alreadyProcessed) {
          result = {
            alreadyProcessed: true,
          };

          return;
        }

        const {
          orderId,
          userId,
          amount,
        } = event.payload;

        /*
         * Check whether payment already exists.
         */
        const existingPayment =
          await findByOrderId(
            orderId,
            session
          );

        if (existingPayment) {
          await createProcessedEvent(
            event,
            session
          );

          result = {
            alreadyProcessed: true,
            paymentId:
              existingPayment.paymentId,
            orderId,
            userId,
            amount,
          };

          return;
        }

        /*
         * Generate our internal payment ID.
         */
        const paymentId =
          crypto.randomUUID();

        /*
         * Create pending payment.
         */
        const payment =
          await createPayment(
            {
              orderId,
              userId,
              amount,
              paymentId,
              status: "pending",
            },
            session
          );

        /*
         * Mark InventoryReserved as processed.
         */
        await createProcessedEvent(
          event,
          session
        );

        result = {
          success: true,
          paymentId:
            payment.paymentId,
          orderId,
          userId,
          amount,
        };
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};


export const completePayment = async ({
  paymentId,
  orderId,
  userId,
  amount,
  transactionId,
}) => {
  const session =
    await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        const payment =
          await makePaymentCompleted(
            paymentId,
            transactionId,
            session
          );

        /*
         * Somebody already completed/failed it.
         */
        if (!payment) {
          result = {
            alreadyFinalized: true,
          };

          return;
        }

        /*
         * PaymentSucceeded is written
         * atomically with the payment update.
         */
        await createOutboxEvent(
          {
            eventId:
              crypto.randomUUID(),

            eventType:
              "PaymentSucceeded",

            aggregateType:
              "Payment",

            aggregateId:
              paymentId,

            payload: {
              orderId,
              userId,
              amount,
              transactionId,
            },
          },
          session
        );

        result = {
          success: true,
          orderId,
          paymentId,
          transactionId,
        };
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};


export const failPayment = async ({
  paymentId,
  orderId,
  userId,
  amount,
  reason,
}) => {
  const session =
    await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        const payment =
          await makePaymentFailed(
            paymentId,
            reason,
            session
          );

        /*
         * Somebody already finalized
         * this payment.
         */
        if (!payment) {
          result = {
            alreadyFinalized: true,
          };

          return;
        }

        /*
         * PaymentFailed is a business event.
         */
        await createOutboxEvent(
          {
            eventId:
              crypto.randomUUID(),

            eventType:
              "PaymentFailed",

            aggregateType:
              "Payment",

            aggregateId:
              paymentId,

            payload: {
              orderId,
              userId,
              amount,
              reason,
            },
          },
          session
        );

        result = {
          success: false,
          orderId,
          paymentId,
          reason,
        };
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};

