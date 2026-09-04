import mongoose from "mongoose";
import * as inventoryRepository from "../repositories/inventory.repository.js";
import { findProcessedEvent, createProcessedEvent, } from "../repositories/event.repository.js";
import { Outbox } from "../models/outbox.model.js";
import { BusinessError } from "../../../shared/errors/business-error.js";

/**
 * Reserve inventory for an OrderCreated event.
 * Business failure:
 * - Insufficient inventory
 * - Inventory not found
 
 * System failure:
 * - MongoDB timeout
 * - Database connection failure
 * - Unexpected application error
 
 * Business failures are converted into InventoryReservationFailed.
 * System failures are re-thrown so RabbitMQ can retry the message.
 */
export const reserveInventory = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {

      // 1. Idempotency Check
      const alreadyProcessed = await findProcessedEvent(event.eventId, session);

      if (alreadyProcessed) {
        console.log(`[Inventory Service] Event already processed: ${event.eventId}`);
        result = { alreadyProcessed: true, };
        return;
      }

      // 2. Extract Data
      const { orderId, userId, amount, items, } = event.payload;

      try {
        // 3. Reserve Inventory
        const reservedItems = await inventoryRepository.reserveInventory(items, session);

        // 4. Create InventoryReserved event
        await Outbox.create(
          [
            {
              eventId: new mongoose.Types.ObjectId().toString(),
              eventType: "InventoryReserved",
              aggregateType: "Inventory",
              aggregateId: orderId,
              payload: {
                orderId,
                userId,
                amount,
                items: reservedItems,
              },
            },
          ],
          {
            session,
          }
        );

        // 5. Mark incoming event as processed
        await createProcessedEvent(event, session);

        result = {
          success: true,
          orderId,
        };

      } catch (error) {
        /*
         * BUSINESS FAILURE
         * Example:
         * - Insufficient inventory
         * - Inventory not found
         * These should NOT be retried.
         */
        if (error instanceof BusinessError || error.isBusinessError) {
          console.warn(`[Inventory Service] Business failure: ${error.message}`);

          // Create failure event in the SAME transaction.
          await Outbox.create(
            [
              {
                eventId: new mongoose.Types.ObjectId().toString(),
                eventType: "InventoryReservationFailed",
                aggregateType: "Inventory",
                aggregateId: orderId,
                payload: {
                  orderId,
                  userId,
                  reason: error.message,
                  code: error.code,
                },
              },
            ],
            {
              session,
            }
          );

          // Mark incoming event as processed.
          await createProcessedEvent(event, session);

          result = {
            success: false,
            orderId,
            reason: error.message,
            code: error.code,
          };

          return;
        }

        /*
         * SYSTEM FAILURE
         *
         * Example:
         * - MongoDB timeout
         * - Database unavailable
         * - Network failure
         * - Unexpected error
         *
         * DO NOT create InventoryReservationFailed.
         *
         * Re-throw so the RabbitMQ shared processor
         * can retry the original message.
         */
        throw error;
      }
    });

    return result;
  } finally {
    await session.endSession();
  }
};


/**
 * Release inventory.
 * This is triggered when an order needs its reserved
 * inventory released, for example after payment failure.
 */
export const releaseInventory = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // 1. Idempotency Check
      const alreadyProcessed =
        await findProcessedEvent(
          event.eventId,
          session
        );

      if (alreadyProcessed) {
        console.log(`[Inventory Service] Event already processed: ${event.eventId}`);
        result = { alreadyProcessed: true };
        return;
      }

      // 2. Extract Data
      const { orderId, items, reason, } = event.payload;

      // 3. Release Inventory
      const releasedItems = await inventoryRepository.releaseInventory(items, session);

      // 4. Create InventoryReleased event
      await Outbox.create(
        [
          {
            eventId: new mongoose.Types.ObjectId().toString(),
            eventType: "InventoryReleased",
            aggregateType: "Inventory",
            aggregateId: orderId,
            payload: {
              orderId,
              items: releasedItems,
              reason,
            },
          },
        ],
        {
          session,
        }
      );

      // 5. Mark incoming event as processed
      await createProcessedEvent(event, session);

      result = {
        success: true,
        orderId,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};


/**
 * Handle PaymentFailed event.
 * Payment failed -> release previously reserved inventory.
 */
export const processPaymentFailed = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {

      // 1. Idempotency Check
      const alreadyProcessed = await findProcessedEvent(event.eventId, session);

      if (alreadyProcessed) {
        console.log(`[Inventory Service] Event already processed: ${event.eventId}`);
        result = { alreadyProcessed: true };
        return;
      }

      // 2. Extract Data
      const { orderId, items, reason, } = event.payload;

      // 3. Release Inventory
      const releasedItems = await inventoryRepository.releaseInventory(items, session);

      // 4. Create InventoryReleased event
      await Outbox.create(
        [
          {
            eventId: new mongoose.Types.ObjectId().toString(),
            eventType: "InventoryReleased",
            aggregateType: "Inventory",
            aggregateId: orderId,
            payload: {
              orderId,
              items: releasedItems,
              reason,
            },
          },
        ],
        {
          session,
        }
      );

      // 5. Mark incoming event as processed
      await createProcessedEvent(event, session);

      result = {
        success: true,
        orderId,
      };
    });

    return result;
    
  } finally {
    await session.endSession();
  }
};