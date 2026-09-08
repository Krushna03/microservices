import crypto from "crypto";
import { BusinessError } from "../../../../shared/errors/business-error.js";


export const chargePayment = async ({
  paymentId,
  orderId,
  amount,
}) => {

  logger.info(
    {
      paymentId,
      orderId,
      amount,
    },
    "Calling payment provider"
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
     logger.warn(
      {
        paymentId,
        orderId,
        amount,
      },
      "Payment provider declined payment"
    );
    
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

    logger.info(
    {
      paymentId,
      orderId,
      transactionId,
    },
    "Payment provider approved payment"
  );

  return {
    success: true,
    transactionId: crypto.randomUUID(),
  };
};