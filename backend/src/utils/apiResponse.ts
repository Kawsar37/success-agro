import { Response } from "express";

export class ApiResponse<T = any> {
  public success: boolean;
  public message: string;
  public data?: T;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static success<T>(data: T, message = "Operation completed successfully"): ApiResponse<T> {
    return new ApiResponse(true, message, data);
  }

  static error(message = "An error occurred", data?: any): ApiResponse {
    return new ApiResponse(false, message, data);
  }
}

export const sendResponse = (
  res: Response,
  statusCode: number,
  data: any,
  message = "Operation completed successfully"
): void => {
  res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
  });
};
