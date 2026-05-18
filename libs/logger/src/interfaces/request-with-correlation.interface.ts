import { Request } from 'express';

export interface RequestWithCorrelation extends Request {
  requestId: string;
}
