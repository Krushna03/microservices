export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const ORDER_STATUS_TRANSITION = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],

  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],

  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],

  [ORDER_STATUS.DELIVERED]: [],

  [ORDER_STATUS.COMPLETED]: [],

  [ORDER_STATUS.CANCELLED]: [],
};

export const canTransition = (currentStatus, nextStatus) => {
  return ORDER_STATUS_TRANSITION[currentStatus]?.includes(nextStatus);
};

export const ORDER_STATUS_TRANSITION_ROLES = {
  "pending:confirmed": ["system", "admin"],
  "pending:cancelled": ["system", "user", "admin"],
  "confirmed:shipped": ["admin"],
  "confirmed:completed": ["admin"],
  "confirmed:cancelled": ["system", "user", "admin"],
  "shipped:delivered": ["admin"],
};