import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVariables = [
  "NODE_ENV",
  "PORT",
  "JWT_SECRET",
  "USER_SERVICE_URL",
  "ORDER_SERVICE_URL",
  "PAYMENT_SERVICE_URL"
];

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing environment variable: ${variable}`);
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT),

  JWT_SECRET: process.env.JWT_SECRET,

  USER_SERVICE_URL: process.env.USER_SERVICE_URL,

  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL,

  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || "http://localhost:3004",
};

export default env;