import { Router } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { authenticate } from "../middleware/authenticate.js";
import env from "../config/env.js";

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

      fixRequestBody(proxyReq, req);
    },
  },
});

router.use("/", authenticate, orderProxy);

export default router;