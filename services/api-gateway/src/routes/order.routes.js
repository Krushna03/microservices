import { Router } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { authenticate } from "../middleware/authenticate.js";
import env from "../config/env.js";
import { correlationIdMiddleware } from "../middleware/correlation-id.middleware.js";

const router = Router();

const orderProxy = createProxyMiddleware({
  target: env.ORDER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,

  on: {
    proxyReq: (proxyReq, req) => {
      // Never trust client-provided identity
      proxyReq.removeHeader("x-user-id");

      // Gateway-derived identity
      proxyReq.setHeader("x-user-id", req.userId);

      // Propagate correlation ID.
      proxyReq.removeHeader("x-correlation-id");
      proxyReq.setHeader("x-correlation-id", req.correlationId);

      fixRequestBody(proxyReq, req);
    },
  },
});

router.use("/", authenticate, correlationIdMiddleware, orderProxy);

export default router;