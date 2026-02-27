import React from "react";
import { Card as CardType } from "../game/rules";

export const CardView: React.FC<{
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
}> = ({ card, selected, onClick }) => {
  const isRed =
    card.suit === "hearts" ||
    card.suit === "diamonds" ||
    (card.suit === "joker" && card.rank === 17);
  const suitSymbol = {
    spades: "♠",
    hearts: "♥",
    clubs: "♣",
    diamonds: "♦",
    joker: "★",
  }[card.suit];

  const isJoker = card.suit === "joker";
  const isBigJoker = isJoker && card.rank === 17;

  return (
    <div
      onClick={onClick}
      className={`relative w-16 h-24 rounded-2xl border-4 shadow-lg flex flex-col justify-between p-2 select-none transition-all duration-300
        ${onClick ? "cursor-pointer" : ""}
        ${selected ? "-translate-y-6 border-yellow-400 scale-110 z-10" : "border-zinc-200"}
        ${onClick && !selected ? "hover:-translate-y-2 hover:shadow-xl" : ""}
        ${isJoker ? (isBigJoker ? "bg-rose-500 border-rose-600" : "bg-zinc-800 border-zinc-900") : "bg-white"}
        ${isJoker ? "text-white" : isRed ? "text-rose-500" : "text-zinc-800"}
      `}
    >
      {isJoker ? (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          <div className="font-black text-xs tracking-widest rotate-90 absolute left-1 top-1/2 -translate-y-1/2">
            JOKER
          </div>
          <div className="text-4xl drop-shadow-md">
            {isBigJoker ? "👑" : "🤡"}
          </div>
          <div className="font-black text-xs tracking-widest -rotate-90 absolute right-1 top-1/2 -translate-y-1/2">
            JOKER
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div className="font-black text-lg leading-none">{card.label}</div>
            <div className="text-xs opacity-50">{suitSymbol}</div>
          </div>

          <div className="text-3xl self-center drop-shadow-sm">
            {suitSymbol}
          </div>

          <div className="flex justify-between items-end rotate-180">
            <div className="font-black text-lg leading-none">{card.label}</div>
            <div className="text-xs opacity-50">{suitSymbol}</div>
          </div>
        </>
      )}

      {/* Eggy pattern background */}
      {!isJoker && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="text-6xl font-black">EGGY</div>
        </div>
      )}
    </div>
  );
};
