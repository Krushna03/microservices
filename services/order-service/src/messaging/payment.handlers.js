import { createProcessedEvent, findProcessedEvent } from "../repositories/event.repository.js";
import * as orderRepository from "../repositories/order.repository.js";
import mongoose from "mongoose";
import { processPaymentSucceeded, processInventoryReleased } from "../services/order.service.js";


const processEvent = async (event, handler) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const existingEvent = await findProcessedEvent(event.eventId, session);

      if(existingEvent) {
        console.log(`[Order Service] Event ${event.eventId} already processed`);
        return;
      }

      await handler(event, session);

      await createProcessedEvent(event, session);

      console.log(`[Order Service] Successfully processed event ${event.eventId}`);
    });
  }
  finally {
    await session.endSession();
  }
}


export const handlePaymentSucceeded = async (event) => {
  return await processEvent(event, processPaymentSucceeded);
};


export const handleInventoryReleased = async (event) => {
  return await processEvent(event, processInventoryReleased);
};


export const handleInventoryReservationFailed = async (event) => {
  await processEvent(event, async (event, session) => {
    const { orderId, reason } = event.payload;

    console.log(`[Order Service] Inventory reservation failed for order: ${orderId}. Cancelling order.`);

    await orderRepository.cancelOrder(orderId, reason || "Inventory reservation failed", session);
  })
};
