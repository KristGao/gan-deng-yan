import { Card, Play, analyzePlay, canBeat } from "./rules";

export const getValidPlays = (
  hand: Card[],
  currentPlay: Play | null,
): Card[][] => {
  const validPlays: Card[][] = [];
  const jokers = hand.filter((c) => c.suit === "joker");
  const normal = hand.filter((c) => c.suit !== "joker");
  const sortedNormal = [...normal].sort((a, b) => a.rank - b.rank);

  const addIfValid = (cards: Card[]) => {
    const play = analyzePlay(cards);
    if (play && canBeat(play, currentPlay)) {
      validPlays.push(cards);
    }
  };

  // Singles (Jokers cannot be played alone)
  normal.forEach((c) => addIfValid([c]));

  // Rocket
  if (jokers.length === 2) addIfValid(jokers);

  // Pairs
  const rankGroups: Record<number, Card[]> = {};
  normal.forEach((c) => {
    if (!rankGroups[c.rank]) rankGroups[c.rank] = [];
    rankGroups[c.rank].push(c);
  });

  Object.entries(rankGroups).forEach(([rank, group]) => {
    const r = parseInt(rank);
    // Normal pair
    if (group.length >= 2) addIfValid(group.slice(0, 2));
    // Joker pair
    if (group.length >= 1 && jokers.length >= 1) addIfValid([group[0], jokers[0]]);
  });

  // Bombs
  Object.entries(rankGroups).forEach(([rank, group]) => {
    const r = parseInt(rank);
    // Bomb 3
    if (group.length >= 3) addIfValid(group.slice(0, 3));
    if (group.length >= 2 && jokers.length >= 1) addIfValid([...group.slice(0, 2), jokers[0]]);
    if (group.length >= 1 && jokers.length >= 2) addIfValid([group[0], ...jokers]);

    // Bomb 4
    if (group.length >= 4) addIfValid(group.slice(0, 4));
    if (group.length >= 3 && jokers.length >= 1) addIfValid([...group.slice(0, 3), jokers[0]]);
    if (group.length >= 2 && jokers.length >= 2) addIfValid([...group.slice(0, 2), ...jokers]);
  });

  // Straights
  if (currentPlay && currentPlay.type === "straight") {
    const len = currentPlay.length;
    for (let startRank = 3; startRank <= 15 - len; startRank++) {
      const targetRanks = Array.from({ length: len }, (_, i) => startRank + i);
      const selectedCards: Card[] = [];
      let tempJokers = [...jokers];
      let possible = true;
      for (const tr of targetRanks) {
        const found = normal.find((n) => n.rank === tr);
        if (found) {
          selectedCards.push(found);
        } else if (tempJokers.length > 0) {
          selectedCards.push(tempJokers.pop()!);
        } else {
          possible = false;
          break;
        }
      }
      if (possible) addIfValid(selectedCards);
    }
  } else if (!currentPlay) {
    // Try all possible straights of length 3 to 12
    for (let len = 3; len <= 12; len++) {
      for (let startRank = 3; startRank <= 15 - len; startRank++) {
        const targetRanks = Array.from({ length: len }, (_, i) => startRank + i);
        const selectedCards: Card[] = [];
        let tempJokers = [...jokers];
        let possible = true;
        for (const tr of targetRanks) {
          const found = normal.find((n) => n.rank === tr);
          if (found) {
            selectedCards.push(found);
          } else if (tempJokers.length > 0) {
            selectedCards.push(tempJokers.pop()!);
          } else {
            possible = false;
            break;
          }
        }
        if (possible) addIfValid(selectedCards);
      }
    }
  }

  return validPlays;
};

export const getBestPlay = (
  hand: Card[],
  currentPlay: Play | null,
): Card[] | null => {
  const validPlays = getValidPlays(hand, currentPlay);
  if (validPlays.length === 0) return null;

  validPlays.sort((a, b) => {
    const playA = analyzePlay(a)!;
    const playB = analyzePlay(b)!;

    const isBombA =
      playA.type === "bomb3" ||
      playA.type === "bomb4" ||
      playA.type === "rocket";
    const isBombB =
      playB.type === "bomb3" ||
      playB.type === "bomb4" ||
      playB.type === "rocket";

    if (isBombA !== isBombB) return isBombA ? 1 : -1;

    if (playA.length !== playB.length) return playB.length - playA.length;

    return playA.rank - playB.rank;
  });

  return validPlays[0];
};
