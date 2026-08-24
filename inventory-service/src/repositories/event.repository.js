import { ProcessedEvent } from "../models/processed-event.model.js";

export const findProcessedEvent = async (eventId, session) => {
  return ProcessedEvent.findOne({
    eventId,
  }).session(session);
};

export const createProcessedEvent = async (event, session) => {
  const [processedEvent] = await ProcessedEvent.create(
      [
        {
          eventId: event.eventId,
          eventType: event.eventType,
        },
      ],
      { session }
    );

  return processedEvent;
};