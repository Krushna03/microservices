import { Router } from "express";

import { login } from "../controllers/auth.controller.js";
import { loginSchema } from "../validators/auth.validator.js";
import { validate } from "../../../middlewares/validate.js";

const router = Router();

router.post("/login", validate(loginSchema), login);

export default router;