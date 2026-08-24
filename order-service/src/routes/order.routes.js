import { createOrder } from "../controllers/order.controller.js";
import { Router } from "express";
import { userIdentity } from "../middlewares/userIdentity.js";
import { validate } from "../middlewares/validate.js";
import { createOrderSchema } from "../validators/order.validator.js";

const router = Router();

router.post("/", userIdentity, validate(createOrderSchema), createOrder);

export default router;