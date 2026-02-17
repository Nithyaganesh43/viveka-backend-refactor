import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        token: string;
        clientId: string;
        deviceSessionId: string;
        phoneNumber?: string;
      };
    }
  }
}

export {};
