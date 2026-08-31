import { Outbox } from "../models/outbox.model.js";

export const createOutboxEvent = async (eventData, session) => {
  const [event] = await Outbox.create([eventData], { session });

  return event;
};


export const findPendingOutboxEvents = async (limit = 100) => {
  return Outbox.find({
    status: "pending",

    $or: [
      { nextAttempt: null },
      { nextAttempt: { $lte: Date.now() } }
    ]
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
};


export const markPublished = async (eventId) => {
  return Outbox.updateOne(
    { eventId },
    { 
      $set: {
        status: "published",
        publishedAt: new Date(),
      },

      $inc: {
        attempts: 1
      }
    },
  );
};


export const markFailed = async (eventId, nextAttemptAt) => {
    return Outbox.updateOne(
      { eventId },
      {
        $set: {
          status: "pending",
          nextAttemptAt,
        },

        $inc: {
          attempts: 1,
        },
      }
    );
  };
