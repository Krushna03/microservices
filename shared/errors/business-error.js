

export class BusinessError extends Error {
  constructor(message, code = "BUSINESS_ERROR") {
    super(message);

    this.name = "BusinessError";
    this.code = code;

    this.isBusinessError = true;
  }
}