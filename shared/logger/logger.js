const formatLog = ({
  level,
  message,
  service,
  correlationId,
  eventId,
  metadata,
}) => {
  
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...(correlationId && { correlationId }),
    ...(eventId && { eventId }),
    ...(metadata && { metadata }),
  });
};


export const createLogger = (service) => {
  const log = (level, message, options = {}) => {
    const output = formatLog({
      level,
      message,
      service,
      correlationId: options.correlationId,
      eventId: options.eventId,
      metadata: options.metadata,
    });

    if (level === "error") {
      console.error(output);
      return;
    }

    if (level === "warn") {
      console.warn(output);
      return;
    }

    console.log(output);
  };


  return {
    info: (message, options) => log("info", message, options),

    warn: (message, options) => log("warn", message, options),

    error: (message, options) => log("error", message, options),

    debug: (message, options) => log("debug", message, options),
  };
};