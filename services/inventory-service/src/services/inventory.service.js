import mongoose from "mongoose";
import crypto from "crypto";

import * as inventoryRepository from "../repositories/inventory.repository.js";
import * as reservationRepository from "../repositories/reservation.repository.js";
import logger from "../config/logger.js";

import {
  findProcessedEvent,
  createProcessedEvent,
} from "../repositories/event.repository.js";

import {
  createOutboxEvent,
} from "../repositories/outbox.repository.js";

import {
  BusinessError,
} from "../../../../shared/errors/business-error.js";


/*
 * ============================================================
 * RESERVE INVENTORY
 * ============================================================
 *
 * OrderCreated
 *     ↓
 * Inventory Service
 *     ↓
 * Reserve stock
 *     ↓
 * Create reservation
 *     ↓
 * Create InventoryReserved Outbox event
 *     ↓
 * Mark OrderCreated processed
 */
export const reserveInventory = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {

      /*
       * 1. Idempotency check
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


      /*
       * 2. Extract event data
       */
      const {
        orderId,
        userId,
        amount,
        items,
      } = event.payload;


      try {

        /*
         * 3. Check whether reservation
         * already exists.
         *
         * This protects against duplicate
         * OrderCreated events.
         */
        const existingReservation =
          await reservationRepository.findByOrderId(
            orderId,
            session
          );

        if (existingReservation) {

          await createProcessedEvent(
            event,
            session
          );

          result = {
            alreadyReserved: true,
            orderId,
          };

          return;
        }


        /*
         * 4. Reserve inventory
         */
        const reservedItems =
          await inventoryRepository.reserveInventory(
            items,
            session
          );


        /*
         * 5. Create reservation record
         */
        await reservationRepository.createReservation(
          {
            orderId,
            items: reservedItems,
            status: "reserved",
          },
          session
        );


        /*
         * 6. Create InventoryReserved
         * Outbox event.
         */
        await createOutboxEvent(
          {
            eventId: crypto.randomUUID(),

            eventType:
              "InventoryReserved",

            correlationId:
              event.correlationId,

            aggregateType:
              "InventoryReservation",

            aggregateId:
              orderId,

            payload: {
              orderId,
              userId,
              amount,
              items: reservedItems,
            },
          },
          session
        );


        /*
         * 7. Mark incoming event
         * as processed.
         */
        await createProcessedEvent(
          event,
          session
        );


        result = {
          success: true,
          orderId,
          items: reservedItems,
        };

      } catch (error) {

        /*
         * ====================================================
         * BUSINESS FAILURE
         * ====================================================
         *
         * Example:
         * - Product doesn't exist
         * - Insufficient inventory
         *
         * Do NOT retry.
         */
        if (
          error instanceof BusinessError ||
          error?.isBusinessError
        ) {

          logger.warn({
            err: error,
            eventId: event.eventId,
            eventType: event.eventType,
            orderId,
            correlationId: event.correlationId,
          }, "Inventory reservation business failure");


          /*
           * Create compensation event
           * inside the SAME transaction.
           */
          await createOutboxEvent(
            {
              eventId: crypto.randomUUID(),

              eventType:
                "InventoryReservationFailed",

              correlationId:
                event.correlationId,

              aggregateType:
                "InventoryReservation",

              aggregateId:
                orderId,

              payload: {
                orderId,
                userId,
                reason: error.message,
                code: error.code,
              },
            },
            session
          );


          /*
           * Mark OrderCreated processed.
           */
          await createProcessedEvent(
            event,
            session
          );


          result = {
            success: false,
            orderId,
            reason: error.message,
            code: error.code,
          };

          return;
        }


        /*
         * ====================================================
         * SYSTEM FAILURE
         * ====================================================
         *
         * Rollback transaction.
         *
         * Shared RabbitMQ retry mechanism
         * will retry the event.
         */
        throw error;
      }
    });

    return result;

  } finally {
    await session.endSession();
  }
};


/*
 * ============================================================
 * PROCESS PAYMENT FAILED
 * ============================================================
 *
 * PaymentFailed
 *     ↓
 * Inventory Service
 *     ↓
 * Release reservation
 *     ↓
 * Restore stock
 *     ↓
 * Create InventoryReleased Outbox
 *     ↓
 * Mark PaymentFailed processed
 */
export const processPaymentFailed = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {

      /*
       * 1. Idempotency check
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


      /*
       * 2. Extract event data
       */
      const {
        orderId,
        reason
      } = event.payload;


      /*
       * 3. Find reservation
       */
      const reservation =
        await reservationRepository.findByOrderId(
          orderId,
          session
        );


      /*
       * If reservation doesn't exist,
       * this is a business/state problem.
       */
      if (!reservation) {

        throw new BusinessError(
          `Inventory reservation not found for order ${orderId}`,
          "RESERVATION_NOT_FOUND"
        );
      }


      /*
       * Already released.
       *
       * Treat as idempotent operation.
       */
      if (reservation.status === "released") {

        await createProcessedEvent(
          event,
          session
        );

        result = {
          alreadyReleased: true,
          orderId,
        };

        return;
      }


      /*
       * 4. Release the reserved inventory.
       *
       * Prefer the reservation snapshot rather
       * than trusting the PaymentFailed payload.
       */
      const releasedItems =
        await inventoryRepository.releaseInventory(
          reservation.items,
          session
        );


      /*
       * 5. Mark reservation released.
       */
      await reservationRepository.markReleased(
        orderId,
        session
      );


      /*
       * 6. Create InventoryReleased
       * Outbox event.
       */
      await createOutboxEvent(
        {
          eventId: crypto.randomUUID(),

          eventType:
            "InventoryReleased",

          correlationId:
            event.correlationId,

          aggregateType:
            "InventoryReservation",

          aggregateId:
            orderId,

          payload: {
            orderId,
            items: releasedItems,
            reason:
              reason ||
              "Payment failed",
          },
        },
        session
      );


      /*
       * 7. Mark PaymentFailed processed.
       */
      await createProcessedEvent(
        event,
        session
      );


      result = {
        success: true,
        orderId,
        items: releasedItems,
      };
    });

    return result;

  } finally {
    await session.endSession();
  }
};