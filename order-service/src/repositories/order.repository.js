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
