export type Suit = "spades" | "hearts" | "clubs" | "diamonds" | "joker";
export type Card = { id: string; suit: Suit; rank: number; label: string };

export const createDeck = (): Card[] => {
  const suits: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
  const deck: Card[] = [];
  const ranks = [
    { rank: 3, label: "3" },
    { rank: 4, label: "4" },
    { rank: 5, label: "5" },
    { rank: 6, label: "6" },
    { rank: 7, label: "7" },
    { rank: 8, label: "8" },
    { rank: 9, label: "9" },
    { rank: 10, label: "10" },
    { rank: 11, label: "J" },
    { rank: 12, label: "Q" },
    { rank: 13, label: "K" },
    { rank: 14, label: "A" },
    { rank: 15, label: "2" },
  ];

  suits.forEach((suit) => {
    ranks.forEach((r) => {
      deck.push({
        id: `${suit}-${r.rank}`,
        suit,
        rank: r.rank,
        label: r.label,
      });
    });
  });

  deck.push({ id: "joker-16", suit: "joker", rank: 16, label: "BJ" });
  deck.push({ id: "joker-17", suit: "joker", rank: 17, label: "RJ" });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export type PlayType =
  | "single"
  | "pair"
  | "straight"
  | "straight_pairs"
  | "bomb3"
  | "bomb4"
  | "rocket";
export type Play = {
  cards: Card[];
  type: PlayType;
  rank: number;
  length: number;
};

export const analyzePlay = (cards: Card[]): Play | null => {
  if (!cards || cards.length === 0) return null;
  const jokers = cards.filter((c) => c.suit === "joker");
  const normal = cards.filter((c) => c.suit !== "joker");
  const numJokers = jokers.length;
  const numNormal = normal.length;
  const len = cards.length;

  // Rule: Jokers cannot be played alone (except as Rocket)
  if (numNormal === 0) {
    if (numJokers === 2) return { cards, type: "rocket", rank: 18, length: 2 };
    return null;
  }

  if (len === 1) {
    return { cards, type: "single", rank: normal[0].rank, length: 1 };
  }

  if (len === 2) {
    if (numJokers === 1) {
      // Normal + Joker = Pair
      return { cards, type: "pair", rank: normal[0].rank, length: 2 };
    }
    if (normal[0].rank === normal[1].rank) {
      return { cards, type: "pair", rank: normal[0].rank, length: 2 };
    }
    return null;
  }

  // Bomb 3
  if (len === 3) {
    const distinctRanks = Array.from(new Set(normal.map((n) => n.rank)));
    if (distinctRanks.length === 1) {
      return { cards, type: "bomb3", rank: distinctRanks[0], length: 3 };
    }
  }

  // Bomb 4
  if (len === 4) {
    const distinctRanks = Array.from(new Set(normal.map((n) => n.rank)));
    if (distinctRanks.length === 1) {
      return { cards, type: "bomb4", rank: distinctRanks[0], length: 4 };
    }
  }

  // Straight - max 3 cards
  if (len === 3) {
    const sortedNormal = [...normal].sort((a, b) => a.rank - b.rank);
    if (sortedNormal[sortedNormal.length - 1].rank <= 14) {
      for (let startRank = 3; startRank <= 15 - len; startRank++) {
        const targetRanks = Array.from({ length: len }, (_, i) => startRank + i);
        let usedJokers = 0;
        const tempNormal = [...sortedNormal];
        let possible = true;
        for (const tr of targetRanks) {
          const idx = tempNormal.findIndex((n) => n.rank === tr);
          if (idx !== -1) {
            tempNormal.splice(idx, 1);
          } else {
            usedJokers++;
          }
        }
        if (possible && usedJokers === numJokers && tempNormal.length === 0) {
          return {
            cards,
            type: "straight",
            rank: startRank + len - 1,
            length: len,
          };
        }
      }
    }
  }

  // Straight Pairs
  if (len >= 4 && len % 2 === 0) {
    const sortedNormal = [...normal].sort((a, b) => a.rank - b.rank);
    if (sortedNormal[sortedNormal.length - 1].rank <= 14) {
      const pairsNeeded = len / 2;
      for (let startRank = 3; startRank <= 15 - pairsNeeded; startRank++) {
        const targetRanks = Array.from(
          { length: pairsNeeded },
          (_, i) => startRank + i,
        );
        let usedJokers = 0;
        const tempNormal = [...sortedNormal];
        let possible = true;
        for (const tr of targetRanks) {
          for (let k = 0; k < 2; k++) {
            const idx = tempNormal.findIndex((n) => n.rank === tr);
            if (idx !== -1) {
              tempNormal.splice(idx, 1);
            } else {
              usedJokers++;
            }
          }
        }
        if (possible && usedJokers === numJokers && tempNormal.length === 0) {
          return {
            cards,
            type: "straight_pairs",
            rank: startRank + pairsNeeded - 1,
            length: len,
          };
        }
      }
    }
  }

  return null;
};

export const canBeat = (play: Play, currentPlay: Play | null): boolean => {
  if (!currentPlay) return true;
  if (play.type === "rocket") return true;
  if (currentPlay.type === "rocket") return false;

  if (play.type === "bomb4") {
    if (currentPlay.type === "bomb4") return play.rank > currentPlay.rank;
    return true;
  }

  if (play.type === "bomb3") {
    if (currentPlay.type === "bomb4") return false;
    if (currentPlay.type === "bomb3") return play.rank > currentPlay.rank;
    return true;
  }

  if (play.type !== currentPlay.type || play.length !== currentPlay.length)
    return false;

  if (play.type === "single") {
    if (play.rank === 15 && currentPlay.rank < 15) return true;
    return play.rank === currentPlay.rank + 1;
  }

  if (play.type === "pair") {
    if (play.rank === 15 && currentPlay.rank < 15) return true;
    return play.rank === currentPlay.rank + 1;
  }

  if (play.type === "straight" || play.type === "straight_pairs") {
    return play.rank === currentPlay.rank + 1;
  }

  return false;
};
