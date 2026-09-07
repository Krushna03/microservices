import { InventoryReservation } from "../models/inventory-reservation.model.js";


export const findByOrderId = async (
  orderId,
  session = null
) => {
  const query = InventoryReservation.findOne({
    orderId,
  });

  if (session) {
    query.session(session);
  }

  return query.lean();
};


export const createReservation = async (
  reservationData,
  session
) => {
  const [reservation] = await InventoryReservation.create(
    [reservationData],
    { session }
  );

  return reservation.toObject();
};


export const markReleased = async (
  orderId,
  session
) => {
  return InventoryReservation.findOneAndUpdate(
    {
      orderId,
      status: "reserved",
    },
    {
      $set: {
        status: "released",
      },
    },
    {
      returnDocument: "after",
      session,
      runValidators: true,
    }
  ).lean();
};