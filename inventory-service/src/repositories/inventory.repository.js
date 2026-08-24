import { Inventory } from "../models/inventory.model.js";

export const findByProductId = async (productId) => {
  return Inventory.findOne({ productId }).lean();
};

export const reserveStock = async (productId, quantity, session) => {
  return Inventory.findOneAndUpdate(
    {
      productId,
      availableQuantity: {
        $gte: quantity,
      },
    },
    {
      $inc: {
        availableQuantity: -quantity,
        reservedQuantity: quantity,
      },
    },
    {
      new: true,
      session,
    }
  ).lean();
};

export const releaseStock = async (productId, quantity) => {
  return Inventory.findOneAndUpdate(
    {
      productId,
      reservedQuantity: {
        $gte: quantity,
      },
    },
    {
      $inc: {
        availableQuantity: quantity,
        reservedQuantity: -quantity,
      },
    },
    {
      new: true,
    }
  ).lean();
};