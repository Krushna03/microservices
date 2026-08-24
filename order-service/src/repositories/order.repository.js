import { Order } from "../models/order.model.js";
import mongoose from "mongoose";
import { Outbox } from "../models/outbox.model.js";
  
export const createOrderWithOutbox = async (orderData, eventData) => {
  const session = await mongoose.startSession();

  try {
    let order;

    await session.withTransaction(async () => {
      const createOrder = await Order.create([orderData], { session });
      
      order = createOrder[0];

      await Outbox.create([
        {
          eventId: eventData.eventId,
          eventType: eventData.eventType,
          aggregateType: "Order",
          aggregateId: order._id.toString(),
          payload: eventData.payload,
        }
      ], { session });
    });

    return order.toObject();
  } finally {
    await session.endSession();
  }
};


export const findByIdempotencyKey = async (idempotencyKey) => {
  return Order
    .findOne({ idempotencyKey })
    .lean();
};


export const findById = async (userId, orderId) => {
  const order = await Order.findOne({ userId, _id: orderId }).lean();

  return order;
};


export const findByUserId = async (userId) => {
  const orders = await Order
    .find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return orders;
};


export const updateStatus = async ({ userId, orderId, status }) => {
  const order = await Order.findOneAndUpdate(
    { userId, _id: orderId }, // find order by userId and orderId
    { $set: { status } }, // update status
    { new: true }, // return updated order
    { runValidators: true } // run validators
  ).lean();

  return order;
};