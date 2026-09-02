import { randomUUID } from "crypto";
import * as inventoryService from "../services/inventory.service.js";
import { publishEvent } from "./publisher.js";

export const handleOrderCreated = async (event) => {
  try {
    await inventoryService.processOrderCreated(event);

    await publishEvent({
      routingKey: "inventory.reserved",
      event: {
        eventId: randomUUID(),
        eventType: "InventoryReserved",
        occurredAt: new Date().toISOString(),
        aggregateType: "Inventory",
        aggregateId: event.aggregateId,
        payload: {
          orderId: event.aggregateId,
          userId: event.payload.userId,
          amount: event.payload.totalAmount,
        },
      },
    });
  } catch (error) {
    // Business failure (e.g. Insufficient stock) -> publish InventoryReservationFailed to compensate Saga
    if (error.statusCode === 400 || error.message?.includes("Insufficient stock")) {
      await publishEvent({
        routingKey: "inventory.reservation_failed",
        event: {
          eventId: randomUUID(),
          eventType: "InventoryReservationFailed",
          occurredAt: new Date().toISOString(),
          aggregateType: "Inventory",
          aggregateId: event.aggregateId,
          payload: {
            orderId: event.aggregateId,
            reason: error.message || "Insufficient stock",
          },
        },
      });
      return;
    }

    // Technical error -> re-throw so consumer handles nack / retry / DLQ
    throw error;
  }
};

export const handlePaymentFailed = async (event) => {
  const { orderId } = event.payload;

  await inventoryService.releaseInventory(orderId);

  await publishEvent({
    routingKey: "inventory.released",
    event: {
      eventId: randomUUID(),
      eventType: "InventoryReleased",
      occurredAt: new Date().toISOString(),
      aggregateType: "InventoryReservation",
      aggregateId: orderId,
      payload: {
        orderId,
      },
    },
  });
};