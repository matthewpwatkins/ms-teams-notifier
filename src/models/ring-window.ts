export type RingWindow = {
  msBeforeStart: number;
  msAfterStart: number;
};

export function isInRingWindow(startTime: Date, currentTime: Date, ringWindow: RingWindow): boolean {
  const startWindow = new Date(startTime.getTime() - ringWindow.msBeforeStart);
  const endWindow = new Date(startTime.getTime() + ringWindow.msAfterStart);
  return currentTime >= startWindow && currentTime <= endWindow;
}