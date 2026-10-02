export function getPetRoomLayout(width: number, height: number, stage: number) {
  const roomHeight = Math.round(Math.min(430, Math.max(250, height * 0.44)));
  const dogSize = Math.round(Math.min(width * 0.5, roomHeight * 0.56, stage === 1 ? 190 : 210));
  return { roomHeight, dogSize };
}
