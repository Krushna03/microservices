import { Inventory } from "../models/inventory.model.js";
import { BusinessError } from "../../../shared/errors/business-error.js";


export const findByProductId = async (productId, session = null) => {
  const query = Inventory.findOne({ productId });

  if (session) {
    query.session(session);
  }

  return query.lean();
};


export const reserveInventory = async (items, session) => {
  const reservedItems = [];

  for (const item of items) {
    const inventory = await Inventory.findOneAndUpdate({
      productId: item.productId,
      // Make sure enough stock is available.
      $expr: { $gte: ["$availableQuantity", item.quantity,], },
      },
      { $inc: {
          availableQuantity: -item.quantity,
          reservedQuantity: item.quantity,
        }
      },
      { new: true, session, runValidators: true }
    ).lean();

    if (!inventory) {
      throw new BusinessError(`Inventory not found for product ${item.productId}`, "INVENTORY_NOT_FOUND");
    }

    reservedItems.push({ productId: item.productId, quantity: item.quantity, });
  }

  return reservedItems;
};


export const releaseInventory = async (items, session) => {
  const releasedItems = [];

  for (const item of items) {
    const inventory = await Inventory.findOneAndUpdate({
      productId: item.productId,
      $expr: { $gte: ["$reservedQuantity", item.quantity,] },
      },
      { $inc: {
          reservedQuantity: -item.quantity,
          availableQuantity: item.quantity,
        }
      },
      { new: true, session, runValidators: true }
    ).lean();

    if (!inventory) {
      throw new BusinessError(`Unable to release reserved inventory for product ${item.productId}`, "INVENTORY_RELEASE_FAILED");
    }

    releasedItems.push({ productId: item.productId, quantity: item.quantity, });
  }

  return releasedItems;
};