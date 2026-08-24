import axios from "axios";
import env from "../config/env.js";

const userServiceClient = axios.create({
  baseURL: env.USER_SERVICE_URL,
  timeout: 2000,

  headers: {
    "x-internal-service-token": env.INTERNAL_SERVICE_TOKEN,
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getUser = async (userId) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await userServiceClient.get(
        `/internal/users/${userId}`
      );

      return response.data.data;
    } catch (error) {
      const status = error.response?.status;

      const retryable = !status ||
        status === 408 ||
        status === 429 ||
        status >= 500;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      await sleep(100 * attempt);
    }
  }
};

export default userServiceClient;