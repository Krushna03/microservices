import * as orderRepository from "../repositories/order.repository.js";
import * as userClient from "../clients/user-service.client.js";
import AppError from "../utils/AppError.js";

export const createOrder = async ({ userId, idempotencyKey, items }) => {

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

  // 5. Create order
  try {
    return await orderRepository.create({
      userId,
      idempotencyKey,

      userSnapshot: {
        userId: user.id || userId,
        name: user.name,
        email: user.email,
      },

      items: orderItems,

      totalAmount,
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