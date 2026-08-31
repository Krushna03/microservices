import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    items: [
      {
        productId: String,
        quantity: Number,
      },
    ],

    status: {
      type: String,
      enum: [
        "reserved",
        "released",
      ],
      default: "reserved",
    },
  },
  {
    timestamps: true,
  }
);

export const InventoryReservation = mongoose.model("InventoryReservation", reservationSchema);
