import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVariables = [
  "PORT",
  "MONGODB_URI",
  "USER_SERVICE_URL",
  "INTERNAL_SERVICE_TOKEN",
];

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing environment variable: ${variable}`);
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT) || 3003,

  MONGODB_URI: process.env.MONGODB_URI,

  USER_SERVICE_URL: process.env.USER_SERVICE_URL,

  INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN,

  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || "http://localhost:3002",

  INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL,

  RABBITMQ_URL: process.env.RABBITMQ_URL,
};

export default env;