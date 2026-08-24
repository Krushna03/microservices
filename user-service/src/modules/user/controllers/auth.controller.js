import * as authService from "../services/auth.service.js";
import { toUserResponse } from "../../user/mappers/user.mapper.js";

export const login = async (req, res, next) => {
  try {
    const { user, accessToken } = await authService.login(req.body);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: toUserResponse(user),
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};