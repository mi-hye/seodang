export function getDevCharacterIdLabel({
  characterId,
  isDevelopment,
}: {
  characterId: string;
  isDevelopment: boolean;
}) {
  return isDevelopment ? `ID ${characterId}` : null;
}
