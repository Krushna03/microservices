import amqp from "amqplib";


let connection = null;
let channel = null;


export const connectRabbitMQ = async (rabbitmqUrl) => {

  if (channel) {
    return channel;
  }

  connection = await amqp.connect(rabbitmqUrl);

  /*
   * IMPORTANT:
   * We use ConfirmChannel because publishers need RabbitMQ publisher confirmations.
   */
  channel = await connection.createConfirmChannel();


  /*
   * Connection Events
   */
  connection.on("error", (error) => {
    console.error("[RabbitMQ] Connection error:", error);
  });


  connection.on("close", () => {
    console.error("[RabbitMQ] Connection closed");

    channel = null;
    connection = null;
  });


  /*
   * Channel Events
   */
  channel.on("error", (error) => {
    console.error("[RabbitMQ] Channel error:", error);
  });


  /*
   * Common Exchanges
   */
  await channel.assertExchange(
    "writing.events",
    "topic",
    { durable: true, }
  );


  await channel.assertExchange(
    "writing.events.dlx",
    "topic",
    { durable: true, }
  );


  console.log("[RabbitMQ] Connected successfully");

  return channel;
};


export const getChannel = () => {

  if (!channel) {
    throw new Error(
      "RabbitMQ channel is not initialized"
    );
  }

  return channel;
};


export const closeRabbitMQ = async () => {

  try {

    if (channel) {
      await channel.close();
      channel = null;
    }


    if (connection) {
      await connection.close();
      connection = null;
    }

  } catch (error) {

    console.error(
      "[RabbitMQ] Failed to close connection:",
      error
    );
  }
};