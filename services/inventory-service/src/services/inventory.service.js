import mongoose from "mongoose";
import * as inventoryRepository from "../repositories/inventory.repository.js";
import { findProcessedEvent, createProcessedEvent,} from "../repositories/event.repository.js";
import {Outbox} from "../models/outbox.model.js";


export const reserveInventory = async (event) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {

      // 1. Idempotency Check
      const alreadyProcessed = await findProcessedEvent(event.eventId, session);

      if (alreadyProcessed) {
        console.log(`[Inventory Service] Event already processed: ${event.eventId}`);
        result = { alreadyProcessed: true, };
        return;
      }

      const { orderId, userId, amount, items } = event.payload;

      // 2. Reserve Inventory
      await inventoryRepository.reserveInventory(items, session);

      // 3. Create success event
      await Outbox.create(
        [
          {
            eventId: new mongoose.Types.ObjectId().toString(),
            eventType: "InventoryReserved",
            aggregateType: "Inventory",
            aggregateId: orderId,
            payload: {
              orderId,
              userId,
              amount,
              items,
            },
          },
        ],
        {
          session,
        }
      );

      // 4. Mark incoming event processed
      await createProcessedEvent(event, session);

      result = {
        success: true,
        orderId,
      };
    });

    return result;

  } catch (error) {
    console.error("[Inventory Service] Error reserving inventory:", error);

    return await createReservationFailureEvent(event, error);
    
  } finally {
    await session.endSession();
  }
};


export const releaseInventory = async (event) => {
  const session = await mongoose.startSession();
  
  try {
    let result;

    await session.withTransaction(async () => {
      
      // 1. Idempotency Check 
      const alreadyProcessed = await findProcessedEvent( event.eventId, session ); 
        
      if (alreadyProcessed) { 
        console.log(`[Inventory Service] PaymentFailed already processed: ${event.eventId}`);
        result = { alreadyProcessed: true, }; return;
      }
    
      // 2. Extract Data 
      const { orderId, items, reason, } = event.payload; 
    
      // 3. Release Inventory 
      await inventoryRepository.releaseInventory(items, session);

      // 4. Create InventoryReleased 
      await Outbox.create(
      [
        {
          eventId: new mongoose.Types.ObjectId().toString(),
          eventType: "InventoryReleased",
          aggregateType: "Inventory",
          aggregateId: orderId,
          payload: {
            orderId, 
            userId, 
            reason: error.message,
          },
        }, 
      ], session); 
      
      // 5. Mark Event Processed 
      await createProcessedEvent( event, session ); 
    
      result = { success: true, orderId, }; 
      
    }); 
    
    return result; 

  } finally { 
    await session.endSession(); 
  } 
};  


const createReservationFailureEvent = async (event, error) => {
  const session = await mongoose.startSession();
  
  try {
      let result;
      await session.withTransaction(async () => {

      // Idempotency Check
      const alreadyProcessed = await findProcessedEvent( event.eventId, session );
        
      if (alreadyProcessed) {
        result = { alreadyProcessed: true, };
        return; 
      } 
        
      const { orderId, userId, } = event.payload; 

      // Create Failure Event 
      await Outbox.create(
        [
          {
            eventId: new mongoose.Types.ObjectId().toString(),
            eventType: "InventoryReservationFailed",
            aggregateType: "Inventory",
            aggregateId: orderId,
            payload: {
              orderId, 
              userId, 
              reason: error.message,
            },
          }, 
        ], session); 
      
      // Mark Event Processed 
      await createProcessedEvent( event, session ); 
    
      result = {
        success: false, 
        orderId, 
        reason: error.message, 
      };  
    });
    
    return result; 
    
  } finally {
    await session.endSession();
  }
};


export const processPaymentFailed = async (event) => {
  const session = await mongoose.startSession(); 
  
  try {
    let result;
    
    await session.withTransaction(async () => {
    
      // 1. Idempotency Check
    const alreadyProcessed = await findProcessedEvent( event.eventId, session ); 
    
    if (alreadyProcessed) { 
      console.log(`[Inventory Service] PaymentFailed already processed: ${event.eventId}`);
      result = { alreadyProcessed: true, }; return;
    }
    
    // 2. Extract Data 
    const { orderId, items, reason, } = event.payload; 
    
    // 3. Release Inventory 
    await inventoryRepository.releaseInventory(items, session);

    // 4. Create InventoryReleased 
    await Outbox.create(
    [
      {
        eventId: new mongoose.Types.ObjectId().toString(),
        eventType: "InventoryReleased",
        aggregateType: "Inventory",
        aggregateId: orderId,
        payload: {
          orderId, 
          userId, 
          reason: error.message,
        },
      }, 
    ], session); 
      
    // 5. Mark Event Processed 
    await createProcessedEvent( event, session ); 
    
    result = { success: true, orderId, }; 
    
    }); 
    
    return result; 
    
  } finally { 
    await session.endSession(); 
  } 
};