import { Router } from "express";
import { getPaymentByOrderId } from "../controllers/payment.controller.js";

const router = Router();

router.get("/order/:orderId", getPaymentByOrderId);

export default router;
