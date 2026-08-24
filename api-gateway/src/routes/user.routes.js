import { Router } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { authenticate } from "../middleware/authenticate.js";
import env from "../config/env.js";

const router = Router();

const publicUserProxy = createProxyMiddleware({
  target: env.USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,

  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.removeHeader("x-user-id");
      fixRequestBody(proxyReq, req);
    },
  },
});

const userProxy = createProxyMiddleware({
  target: env.USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,

  on: {
    proxyReq: (proxyReq, req) => {
      // Remove anything the client supplied.
      proxyReq.removeHeader("x-user-id");

      // Set identity from verified JWT.
      proxyReq.setHeader("x-user-id", req.userId);

      fixRequestBody(proxyReq, req);
    },
  },
});

router.post("/register", publicUserProxy);

router.use("/", authenticate, userProxy);

export default router;