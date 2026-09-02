import jwt from "jsonwebtoken"
import env from "../config/env.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        status: false,
        message: "Authentication required."
      })
    }

    const [scheme, token] = authHeader.split(" ")

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        status: false,
        message: "Invalid token."
      })
    }

    // Verify token 
    const secret = env.JWT_SECRET

    const decodedToken = jwt.verify(token, secret)

    req.userId = decodedToken.sub

    next()
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid access token",
    });
  }
}