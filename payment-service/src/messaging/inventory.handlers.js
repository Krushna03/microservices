import * as paymentService from "../services/payment.service.js";

export const handleInventoryReserved = async (event) => {

  const { orderId, userId, amount } = event.payload;

  await paymentService.processPayment({ orderId, userId, amount });
};
