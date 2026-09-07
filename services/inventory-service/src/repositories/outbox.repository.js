import { Outbox } from "../models/outbox.model.js";


export const createOutboxEvent = async (
  eventData,
  session
) => {

  const [event] =
    await Outbox.create(
      [eventData],
      { session }
    );

  return event.toObject();
};


/*
 * ============================================================
 * Claim Outbox Event
 * ============================================================
 *
 * Atomically changes:
 *
 * pending → processing
 *
 * This prevents two workers from
 * claiming the same event.
 */

export const claimNextOutboxEvent = async (
  workerId,
  lockDurationMs = 60000
) => {

  const now = new Date();

  const lockExpiry = new Date(
    now.getTime() - lockDurationMs
  );


  return Outbox.findOneAndUpdate(

    {
      $or: [

        /*
         * Normal pending event.
         */

        {
          status: "pending",

          $or: [
            {
              nextAttemptAt: null,
            },
            {
              nextAttemptAt: {
                $lte: now,
              },
            },
          ],
        },

        /*
         * Recover an event whose
         * previous worker crashed.
         */

        {
          status: "processing",

          lockedAt: {
            $lte: lockExpiry,
          },
        },
      ],
    },

    {
      $set: {
        status: "processing",

        lockedBy: workerId,

        lockedAt: now,
      },
    },

    {
      sort: {
        createdAt: 1,
      },

      returnDocument: "after",
    }
  ).lean();
};


/*
 * ============================================================
 * Mark Published
 * ============================================================
 */

export const markPublished = async (
  eventId,
  workerId
) => {

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


/*
 * ============================================================
 * Mark Failed
 * ============================================================
 */

export const markFailed = async (
  eventId,
  workerId,
  nextAttemptAt
) => {

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