import mongoose from "mongoose";


const outboxSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
    },

    aggregateType: {
      type: String,
      required: true,
    },

    aggregateId: {
      type: String,
      required: true,
      index: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "published",
      ],
      default: "pending",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    nextAttemptAt: {
      type: Date,
      default: null,
    },

    correlationId: {
      type: String,
      required: true,
      index: true,
    },

    /*
     * Worker that currently owns
     * this event.
     */

    lockedBy: {
      type: String,
      default: null,
      index: true,
    },

    /*
     * Time at which the worker
     * acquired the event.
     */

    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },

  {
    timestamps: true,
  }
);


export const Outbox =
  mongoose.model(
    "Outbox",
    outboxSchema
  );