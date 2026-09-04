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
  for (const item of items) {
    const inventory = await Inventory.findOne({ productId: item.productId }).session(session);

    if (!inventory) {
      throw new Error(`Inventory not found for product ${item.productId}`);
    }

    if (inventory.availableQuantity < item.quantity) {
      throw new BusinessError(`Insufficient inventory for product ${item.productId}`, "INSUFFICIENT_INVENTORY");
    }

    inventory.availableQuantity -= item.quantity;

    inventory.reservedQuantity += item.quantity;

    await inventory.save({ session });
  }
};


export const releaseInventory = async (items, session) => {
  for (const item of items) {
    const inventory = await Inventory.findOne({ productId: item.productId }).session(session);

    if (!inventory) {
      throw new Error(`Inventory not found for product ${item.productId}`);
    }

    inventory.reservedQuantity -= item.quantity;

    inventory.availableQuantity += item.quantity;

    await inventory.save({ session });
  }
};