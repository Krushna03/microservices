import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
    },

    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    reservedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Inventory = mongoose.model("Inventory", inventorySchema);