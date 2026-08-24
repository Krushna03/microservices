import mongoose from "mongoose";
import * as inventoryRepository from "../repositories/inventory.repository.js";
import {
  findProcessedEvent,
  createProcessedEvent,
} from "../repositories/event.repository.js";
import AppError from "../utils/AppError.js";

export const processOrderCreated = async (event) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const existingEvent = await findProcessedEvent(
        event.eventId,
        session
      );

      if (existingEvent) {
        return;
      }

      for (const item of event.payload.items) {
        const inventory = await inventoryRepository.reserveStock(
          item.productId,
          item.quantity,
          session
        );

        if (!inventory) {
          throw new AppError(
            `Insufficient stock for ${item.productId}`,
            400
          );
        }
      }

      await createProcessedEvent(event, session);
    });
  } finally {
    await session.endSession();
  }
};

export const reserveStock = async ({ items }) => {
  const reservedItems = [];

  for (const item of items) {
    const inventory = await inventoryRepository.reserveStock(item.productId, item.quantity);

    if (!inventory) {
      throw new AppError(`Insufficient stock for product ${item.productId}`, 400);
    }

    reservedItems.push({
      productId: item.productId,
      quantity: item.quantity,
    });
  }

  return reservedItems;
};

export const releaseStock = async ({ items }) => {
  for (const item of items) {
    await inventoryRepository.releaseStock(item.productId, item.quantity);
  }
};