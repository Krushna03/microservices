import axios from "axios";
import env from "../../../inventory-service/src/config/env.js";

const inventoryServiceClient = axios.create({
  baseURL: env.INVENTORY_SERVICE_URL,
  timeout: 3000
});

export const reserveStock = async (items) => {
  const response = await inventoryServiceClient.post('/internal/inventory/reserve', { items });

  return response.data;
}

export const releaseStock = async (items) => {
  const response = await inventoryServiceClient.post('/internal/inventory/release', { items });

  return response.data;
}
