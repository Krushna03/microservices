import { Router } from "express";
import { reserveStock, releaseStock } from "../controller/inventory.controller";

const router = Router();

router.post("/reserve", reserveStock);

router.post("/release", releaseStock);

export default router;