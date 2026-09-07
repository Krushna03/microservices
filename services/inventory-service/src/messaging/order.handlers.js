import {
  reserveInventory,
  processPaymentFailed,
} from "../services/inventory.service.js";


export const handleOrderCreated = async (event) => {
  return reserveInventory(event);
};


export const handlePaymentFailed = async (event) => {
  return processPaymentFailed(event);
};