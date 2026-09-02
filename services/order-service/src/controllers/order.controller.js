import * as orderService from "../services/order.service.js";

export const createOrder = async (req, res, next) => {
  try {
    const idempotencyKey =
      req.headers["idempotency-key"] ||
      req.body?.["Idempotency-Key"] ||
      req.body?.idempotencyKey;

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

export const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById({
      userId: req.userId,
      orderId: req.params.orderId,
    });

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getOrdersByUser(req.userId);

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus({
      userId: req.userId,
      orderId: req.params.orderId,
      status: req.body.status,
    });

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}