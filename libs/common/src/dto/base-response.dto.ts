import { ResponseStatus } from '../enums/common.enums';

export class BaseResponseDto<T = unknown> {
  status: ResponseStatus = ResponseStatus.Success;
  message: string = 'OK';
  data?: T;
}
