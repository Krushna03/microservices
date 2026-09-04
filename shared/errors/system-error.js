

export class SystemError extends Error {
  constructor(message, code = "SYSTEM_ERROR") {
    super(message);

    this.name = "SystemError";
    this.code = code;

    this.isSystemError = true;
  }
}