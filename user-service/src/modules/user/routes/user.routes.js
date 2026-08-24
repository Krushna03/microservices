import { Router } from "express";
import { validate } from "../../../middlewares/validate.js";
import { registerUserSchema } from "../validators/user.validator.js";
import { registerUser } from "../controllers/user.controller.js";
import { authenticate } from "../../../middlewares/authenticate.js";

const router = Router();

router.post("/register", validate(registerUserSchema), registerUser);

router.get("/me", authenticate, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      userId: req.userId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;