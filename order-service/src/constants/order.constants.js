export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const ORDER_STATUS_TRANSITION = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],

  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],

  [ORDER_STATUS.COMPLETED]: [],

  [ORDER_STATUS.CANCELLED]: [],
};

export const ORDER_STATUS_TRANSITION_ROLES = {
  "pending:confirmed": ["admin"],
  "pending:cancelled": ["user", "admin"],
  "confirmed:completed": ["admin"],
  "confirmed:cancelled": ["user", "admin"],
};