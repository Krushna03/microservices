import { Outbox } from "../models/outbox.model.js";

export const createOutboxEvent = async (eventData, session) => {
  const [event] = await Outbox.create([eventData], { session });

  return event.toObject();
};

export const claimPendingOutboxEvents = async (limit = 100, workerId, leaseDurationMs = 60_000) => {
  const events = [];
  const lockedAt = new Date();
  const lockExpiration = new Date(Date.now() - leaseDurationMs);

  for (let i = 0; i < limit; i++) {
    const event = await Outbox.findOneAndUpdate(
      {
        // Event is ready for processing
        $or: [
          {
            status: "pending",
            $or: [
              { nextAttemptAt: null },
              {
                nextAttemptAt: {
                  $lte: new Date(),
                },
              },
            ],
          },
          // Worker previously crashed and its lease expired
          {
            status: "processing",
            lockedAt: { $lte: lockExpiration },
          },
        ],
      },
      {
        $set: {
          status: "processing",
          lockedBy: workerId,
          lockedAt,
        },
      },
      {
        sort: {
          createdAt: 1,
        },
        returnDocument: "after",
      }
    ).lean();

    if (!event) {
      break;
    }

    events.push(event);
  }

  return events;
};

export const markPublished = async (eventId, workerId) => {
  return Outbox.updateOne(
    {
      eventId,
      status: "processing",
      lockedBy: workerId,
    },
    {
      $set: {
        status: "published",
        publishedAt: new Date(),
        lockedBy: null,
        lockedAt: null,
        nextAttemptAt: null,
      },
      $inc: {
        attempts: 1,
      },
    }
  );
};

export const markFailed = async (eventId, workerId, nextAttemptAt) => {
  return Outbox.updateOne(
    {
      eventId,
      status: "processing",
      lockedBy: workerId,
    },
    {
      $set: {
        status: "pending",
        nextAttemptAt,
        lockedBy: null,
        lockedAt: null,
      },
      $inc: {
        attempts: 1,
      },
    }
  );
};
