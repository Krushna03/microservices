import { Payment } from "../models/payment.model.js";

export const getPaymentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
