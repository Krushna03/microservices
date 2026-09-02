import { toUserResponse } from "../mappers/user.mapper.js";
import * as userService from "../services/user.service.js";

export const registerUser = async (req, res, next) => {
  try {
    const user = await userService.registerUser(req.body);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: toUserResponse(user),
    });

  } catch (error) {
    next(error);
  }
};


export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.userId);

    return res.status(200).json({
      success: true,
      data: toUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};