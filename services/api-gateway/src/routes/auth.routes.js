import { Router } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import env from "../config/env.js";

const router = Router();

// Public routes, no authentication
const authProxy = createProxyMiddleware({
  target: env.USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,

  on: {
    proxyReq: (proxyReq, req) => {
      // Auth routes are public.
      proxyReq.removeHeader("x-user-id");

      fixRequestBody(proxyReq, req);
    },
  },
});

router.use("/", authProxy);

export default router;