import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVariables = [
  "NODE_ENV",
  "PORT",
  "MONGODB_URI",
  "RABBITMQ_URL",
  "LOG_LEVEL",
];

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing environment variable: ${variable}`);
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT) || 3004,

  MONGODB_URI: process.env.MONGODB_URI,

  RABBITMQ_URL: process.env.RABBITMQ_URL,

  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};

export default env;
