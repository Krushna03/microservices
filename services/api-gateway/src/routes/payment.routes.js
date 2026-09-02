import { Router } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { authenticate } from "../middleware/authenticate.js";
import env from "../config/env.js";

const router = Router();

const paymentProxy = createProxyMiddleware({
  target: env.PAYMENT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,

  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.removeHeader("x-user-id");
      
      if (req.userId) {
        proxyReq.setHeader("x-user-id", req.userId);
      }
      fixRequestBody(proxyReq, req);
    },
  },
});

router.use("/", authenticate, paymentProxy);

export default router;
