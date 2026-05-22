export const HANDLES_EVENT_METADATA = 'handles_event';
export const HandlesEvent = (...eventTypes: string[]) =>
  (target: object, key?: string | symbol) => {
    Reflect.defineMetadata(HANDLES_EVENT_METADATA, eventTypes, key ? target[key as keyof typeof target] : target);
  };
