import events from "events";

export default class EventEmitter extends events.EventEmitter {
  emit(event: string | symbol, ...data: any[]) {
    super.emit("*", { event, data });
    return super.emit(event, ...data);
  }
}
