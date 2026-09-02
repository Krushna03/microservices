import { createOrder, getMyOrders, getOrderById, updateOrderStatus } from "../controllers/order.controller.js";
import { Router } from "express";
import { userIdentity } from "../middlewares/userIdentity.js";
import { validate } from "../middlewares/validate.js";
import { createOrderSchema, updateOrderStatusSchema } from "../validators/order.validator.js";

const router = Router();

router.post("/", userIdentity, validate(createOrderSchema), createOrder);

router.get("/", userIdentity, getMyOrders);

router.get("/:orderId", userIdentity, getOrderById);

router.patch("/:orderId/status", userIdentity, validate(updateOrderStatusSchema), updateOrderStatus);

export default router;