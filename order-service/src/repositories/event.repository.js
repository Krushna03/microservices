import { ProcessedEvent } from "../models/processed-event.model.js";

export const findProcessedEvent = async (eventId, session) => {

  const query = ProcessedEvent.findOne({ eventId });

  if (session) query.session(session);

  return query.lean();
};


export const createProcessedEvent = async (event, session) => {

  const [processedEvent] = await ProcessedEvent.create(
    [
      {
        eventId: event.eventId,
        eventType: event.eventType,
      },
    ],
    {
      session,
    }
  );
  
  return processedEvent.toObject();
};