import bcrypt from "bcrypt";

import * as userRepository from "../repositories/user.repository.js";
import { generateAccessToken } from "../../../utils/jwt.js";
import AppError from "../../../utils/AppError.js";

export const login = async ({ email, password }) => {
  const user = await userRepository.findByEmailWithPassword(email);

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const accessToken = generateAccessToken(user);

  return {
    user,
    accessToken,
  };
};