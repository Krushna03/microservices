import { Order } from "../models/order.model.js";

export const create = async (orderData) => {
  const order = await Order.create(orderData);

  return order.toObject();
};

export const findByIdempotencyKey = async (idempotencyKey) => {
  return Order
    .findOne({ idempotencyKey })
    .lean();
};

export const findById = async (orderId) => {
  const order = await Order.findById(orderId).lean();

  return order;
};

export const findByUserId = async (userId) => {
  const orders = await Order
    .find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return orders;
};