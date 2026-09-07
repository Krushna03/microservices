import mongoose from "mongoose";
import { findProcessedEvent, createProcessedEvent, } from "../repositories/event.repository.js";
import { processInventoryReserved } from "../services/payment.service.js";


const processEvent = async (event, handler) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {

      // 1. Idempotency check
      const alreadyProcessed = await findProcessedEvent(event.eventId, session);

      if (alreadyProcessed) {
        console.log(`[Payment Service] Event already processed: ${event.eventId}`);
        result = { alreadyProcessed: true };
        return;
      }

      // 2. Execute business logic
      result = await handler(event, session);

      // 3. Mark incoming event as processed
      await createProcessedEvent(event, session);

      console.log(`[Payment Service] Successfully processed event: ${event.eventId}`);
    });

    return result;

  } finally {
    await session.endSession();
  }
};


export const handleInventoryReserved = async (event) => {
  return processEvent(event, processInventoryReserved);
};
