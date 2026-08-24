import * as orderService from "../services/order.service.js";

export const createOrder = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"];

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency key is required",
      });
    }

    const order = await orderService.createOrder({
      userId: req.userId,
      idempotencyKey,
      items: req.body.items,
    });

    return res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}