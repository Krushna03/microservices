import * as inventoryService from "../services/inventory.service.js";

export const reserveStock = async (req, res, next) => {
  try {
    const { items } = req.body;

    await inventoryService.reserveStock({ items });

    return res.status(200).json({
      success: true,
      data: { reserved: true },
    });
  } catch (error) {
    next(error);
  }
};

export const releaseStock = async (req, res, next) => {
  try {
    const { items } = req.body;

    await inventoryService.releaseStock({ items });

    return res.status(200).json({
      success: true,
      data: { released: true },
    });
  } catch (error) {
    next(error);
  }
};