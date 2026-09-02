import { Order } from "../models/order.model.js";
import mongoose from "mongoose";
import { Outbox } from "../models/outbox.model.js";


export const createOrderWithOutbox = async (orderDataParam, eventDataParam) => {
  const session = await mongoose.startSession();

  const orderData = orderDataParam?.orderData || orderDataParam;
  const eventData = orderDataParam?.eventData || eventDataParam;

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
          payload: {
            orderId: order._id.toString(),
            ...eventData.payload,
          },
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
    { new: true, runValidators: true }, // return updated order
  ).lean();

  return order;
};


export const confirmOrder = async (orderId, session) => {

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: "pending"
    },
    {
      $set: { status: "confirmed" }
    },
    { new: true, session, runValidators: true }
  ).lean();

  return order;
};


export const cancelOrder = async (orderId, reason = "Payment failed", session) => {

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: { $nin: ["cancelled", "completed"] }
    },
    { $set: { status: "cancelled", cancelReason: reason } },
    { new: true, session, runValidators: true }
  );

  return order?.toObject();
};