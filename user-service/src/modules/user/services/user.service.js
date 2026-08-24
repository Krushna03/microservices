import bcrypt from "bcrypt";
import * as userRepository from "../repositories/user.repository.js";
import AppError from "../../../utils/AppError.js";

export const registerUser = async ({ name, email, password }) => {
  // 1. Check whether user already exists
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    throw new AppError(
      "User with this email already exists",
      409
    );
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 3. Create user
  const user = await userRepository.create({
    name,
    email,
    password: hashedPassword,
  });

  // 4. Return plain user data
  return user;
};