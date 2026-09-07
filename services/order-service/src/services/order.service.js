import { randomUUID } from "crypto";
import { BusinessError } from "../../../../shared/errors/business-error.js";
import * as orderRepository from "../repositories/order.repository.js";
import * as userClient from "../clients/user-service.client.js";
import AppError from "../utils/AppError.js";
import { ORDER_STATUS_TRANSITION } from "../constants/order.constants.js";


export const createOrder = async ({ userId, idempotencyKey, items, correlationId }) => {

  const eventId = randomUUID();

  // 1. Check whether this operation already succeeded
  const existingOrder = await orderRepository.findByIdempotencyKey(idempotencyKey);

  if (existingOrder) {
    return existingOrder;
  }

  // 2. Get current user information
  const user = await userClient.getUser(userId);

  if (!user) {
    throw new AppError(
      "Unable to retrieve user information",
      503
    );
  }

  // 3. Prepare order items
  const orderItems = items.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

  // 4. Calculate total amount
  const totalAmount = orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  try {
    // 5. Create order with status 'pending' and Outbox event 'OrderCreated'
    return await orderRepository.createOrderWithOutbox({
      orderData: {
        userId,
        idempotencyKey,
        userSnapshot: {
          userId: user._id || user.id || userId,
          name: user.name,
          email: user.email,
        },
        items: orderItems,
        totalAmount,
        status: "pending"
      },

      eventData: {
        eventId,
        eventType: "OrderCreated",
        correlationId,
        payload: {
          userId,
          items: orderItems,
          totalAmount,
        },
      }
    });
  } catch (error) {
    // MongoDB duplicate-key race
    if (error.code === 11000) {
      const order = await orderRepository.findByIdempotencyKey(idempotencyKey);

      if (order) {
        return order;
      }
    }

    throw error;
  }
};


export const getOrderById = async (userId, orderId) => {
  const order = await orderRepository.findById(userId, orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};


export const getOrdersByUser = async (userId) => {
  return await orderRepository.findByUserId(userId);
};


export const updateOrderStatus = async ({ userId, orderId, status }) => {
  const order = await orderRepository.findById(userId, orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const allowedTransitions = ORDER_STATUS_TRANSITION[order.status];

  if (!allowedTransitions.includes(status)) {
    throw new AppError(`Cannot change order status from ${order.status} to ${status}`, 400);
  }

  return orderRepository.updateStatus({
    userId,
    orderId,
    status
  });
};


export const processPaymentSucceeded = async (event, session) => {
  const { orderId } = event.payload; 
  
  const order = await orderRepository.confirmOrder( orderId, session ); 
  
  if (!order) { 
    throw new BusinessError( `Order ${orderId} cannot be confirmed` ); 
  }
  
  return { success: true, orderId, status: order.status, };
};


export const processInventoryReleased = async (event, session) => {

  const { orderId, reason } = event.payload; 
  
  const order = await orderRepository.cancelOrder( orderId, reason || "Payment failed", session ); 
  
  if (!order) { 
    throw new BusinessError( `Order ${orderId} cannot be cancelled` ); 
  }
  
  return { success: true, orderId, status: order.status, };
};