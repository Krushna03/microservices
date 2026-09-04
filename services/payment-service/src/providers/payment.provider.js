import crypto from "crypto";

export const chargePayment = async ({ paymentId, orderId, amount }) => {
  
  console.log(`[Payment Provider] Charging payment ${paymentId} for order ${orderId}`);

  /*
   * Simulate network latency.
   */
  await new Promise((resolve) => setTimeout(resolve, 500));

  /*
   * Simulate payment result.
   */
  const successful = Math.random() > 0.2;

  if (!successful) {
    return {
      success: false,
      reason: "Payment declined",
    };
  }

  return {
    success: true,
    transactionId: crypto.randomUUID(),
  };
};