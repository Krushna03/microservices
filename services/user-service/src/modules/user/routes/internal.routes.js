import { Router } from "express";
import { internalServiceAuth } from "../../../middlewares/internalServiceAuth.js";
import { getUserById } from "../controllers/user.controller.js";

const router = Router();

router.get("/:userId", internalServiceAuth, getUserById);

export default router;
