import mongoose from "mongoose";
import * as inventoryRepository from "../repositories/inventory.repository.js";
import { findProcessedEvent, createProcessedEvent,} from "../repositories/event.repository.js";
import {Outbox} from "../models/outbox.model.js";

export const reserveInventory = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // 1. Idempotency Check
        const alreadyProcessed = await findProcessedEvent(event.eventId,session);

        if (alreadyProcessed) {
          console.log(`[Inventory Service] Event already processed: ${event.eventId}`);
          result = { alreadyProcessed: true, };
          return;
        }

        const { orderId, items } = event.payload;

        try {
          // 2. Reserve Inventory
          await inventoryRepository.reserveInventory(items, session);

          // 3. Create success event
          await Outbox.create(
            [
              {
                eventId: new mongoose.Types.ObjectId().toString(),
                eventType:"InventoryReserved",
                aggregateType:"Inventory",
                aggregateId: orderId,
                payload: {
                  orderId,
                  items,
                },
              },
            ],
            {
              session,
            }
          );

          // 4. Mark incoming event processed
          await createProcessedEvent(event,session);

          result = {
            success: true,
            orderId,
          };
        } catch (error) {
          // Reservation faile
          await Outbox.create(
            [
              {
                eventId: new mongoose.Types.ObjectId().toString(),
                eventType: "InventoryReservationFailed",
                aggregateType: "Inventory",
                aggregateId: orderId,
                payload: {
                  orderId,
                  reason: error.message,
                },
              },
            ],
            {
              session,
            }
          );

          await createProcessedEvent(event,session);

          result = {
            success: false,
            orderId,
            reason: error.message,
          };
        }
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};