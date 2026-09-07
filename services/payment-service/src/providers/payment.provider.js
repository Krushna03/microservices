import crypto from "crypto";
import { BusinessError } from "../../../../shared/errors/business-error.js";


export const chargePayment = async ({
  paymentId,
  orderId,
  amount,
}) => {

  console.log(
    `[Payment Provider] Charging payment ${paymentId} for order ${orderId}`
  );


  /*
   * Simulate network latency.
   */
  await new Promise((resolve) =>
    setTimeout(resolve, 500)
  );


  /*
   * Simulate payment result.
   */
  const successful =
    Math.random() > 0.2;


  if (!successful) {

    /*
     * Payment was explicitly declined.
     *
     * This is a BUSINESS failure.
     * It should NOT be retried by RabbitMQ.
     */
    throw new BusinessError(
      "Payment declined",
      "PAYMENT_DECLINED"
    );
  }


  return {
    success: true,
    transactionId: crypto.randomUUID(),
  };
};