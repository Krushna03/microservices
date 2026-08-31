import mongoose from "mongoose";
import crypto from "crypto";
import { findByOrderId, createPayment, makePaymentCompleted, makePaymentFailed, } from "../repositories/payment.repository.js";
import { createOutboxEvent } from "../repositories/outbox.repository.js";
import { findProcessedEvent, createProcessedEvent } from "../repositories/event.repository.js";

export const processInventoryReserved = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;
    
    await session.withTransaction(async () => {
      
    // 1. Idempotency check
      const alreadyProcessed = await findProcessedEvent(event.eventId, session);

      if (alreadyProcessed) {
        console.log("[Payment Service] Event already processed:", event.eventId);
        result = {
          alreadyProcessed: true,
        }
        return;
      }

      const {orderId, userId, amount, items} = event.payload;

      // 2. Check whether payment already exists
      const existingPayment = await findByOrderId(orderId, session);

      if (existingPayment) {
        await createProcessedEvent(event, session);

        result = {
          alreadyExists: true,
          payment: existingPayment,
        };

        return;
      }

      const paymentId = crypto.randomUUID()

      // 3. Create payment
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

      // 4. Simulate payment provider
      const paymentSuccessful = Math.random() > 0.2;

      if (paymentSuccessful) {
        const transactionId = crypto.randomUUID();

        await makePaymentCompleted(payment._id, transactionId, session);

        // 5. Create success event
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
              transactionId,
              items,
            },
          },
          session
        );
      } else {
        const reason = "Payment declined";

        await makePaymentFailed(paymentId, reason, session);

        // 6. Create failure event
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
              reason,
              paymentId,
              items,
            },
          },
          session
        );
      }

      // 7. Mark incoming event processed
      await createProcessedEvent(event, session);
    });
  }
  finally {
    await session.endSession();
  }
};