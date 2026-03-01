import React, { useState, useEffect } from "react";
import {
  Card as CardType,
  Play,
  createDeck,
  analyzePlay,
  canBeat,
} from "./game/rules";
import { getBestPlay } from "./game/ai";
import { playSound } from "./game/sounds";
import { playCardVoice, playPassVoice, playBombVoice, playWinVoice, initVoices, isSoundEnabled, setSoundEnabled } from "./game/voice";
import { CardView } from "./components/Card";
import { getBotChatResponse } from "./services/geminiService";
import { io, Socket } from "socket.io-client";
import {
  Users,
  User,
  Bot,
  Play as PlayIcon,
  SkipForward,
  RefreshCw,
  Plus,
  X,
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Player = {
  id: number;
  name: string;
  isAI: boolean;
  hand: CardType[];
  avatar: string;
  coins: number;
  gender?: "male" | "female";
  isHosted?: boolean;
};

type RoundResult = {
  playerId: number;
  name: string;
  avatar: string;
  coinsChange: number;
  coinsTotal: number;
  isEliminated: boolean;
  remainingCards: number;
  baseMultiplier: number;
  personalMultiplier: number;
  totalMultiplier: number;
  neverPlayed: boolean;
};

type ChatMessage = {
  id: string;
  senderId: number;
  text: string;
  timestamp: number;
};

type GameState = {
  status: "setup" | "rolling" | "playing" | "roundover" | "gameover";
  players: Player[];
  deck: CardType[];
  currentPlayerIndex: number;
  currentPlay: Play | null;
  lastPlayPlayerIndex: number | null;
  winner: number | null;
  logs: string[];
  multiplier: number;
  roundResults: RoundResult[];
  chatMessages: ChatMessage[];
  diceRolls: Record<number, number | null>;
  hostId: number | null;
  gameKey: string;
  hasPlayedCards: Record<number, boolean>;
};

type UserRole = "host" | "participant" | null;

const IDLE_MEMBERS = [
  { name: "Soyeon", avatar: "https://i.pinimg.com/originals/9e/3d/8c/9e3d8c1b7b1b1b1b1b1b1b1b1b1b1b1b.jpg" }, // Placeholder pattern
  { name: "Miyeon", avatar: "https://i.pinimg.com/originals/8d/2c/7b/8d2c7b1b1b1b1b1b1b1b1b1b1b1b1b1b.jpg" },
  { name: "Minnie", avatar: "https://i.pinimg.com/originals/7c/1b/6a/7c1b6a1b1b1b1b1b1b1b1b1b1b1b1b1b.jpg" },
  { name: "Yuqi", avatar: "https://i.pinimg.com/originals/6b/0a/5f/6b0a5f1b1b1b1b1b1b1b1b1b1b1b1b1b.jpg" },
  { name: "Shuhua", avatar: "https://i.pinimg.com/originals/5a/9e/4d/5a9e4d1b1b1b1b1b1b1b1b1b1b1b1b1b.jpg" },
];

// Using more reliable high-quality placeholder images for the members
const IDLE_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop", // Soyeon style
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop", // Miyeon style
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop", // Minnie style
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop", // Yuqi style
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop", // Shuhua style
];

const BOT_AVATAR = "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop"; // Eggy character style

const MEMBER_NAMES = ["Soyeon", "Miyeon", "Minnie", "Yuqi", "Shuhua"];

const TRANSLATIONS = {
  en: {
    title: "EGGY PARTY!",
    subtitle: "GAN DENG YAN EDITION",
    yourName: "Your Eggy Name",
    initialCoins: "Initial Coins",
    hostOnline: "HOST ONLINE",
    room: "ROOM",
    copyLink: "COPY LINK",
    addBot: "ADD BOT",
    start: "START!",
    rollToStart: "ROLL TO START!",
    rollDice: "🎲 ROLL DICE",
    multiplier: "MULTIPLIER",
    cardsLeft: "CARDS LEFT",
    pass: "PASS",
    play: "PLAY",
    chat: "CHAT",
    saySomething: "Say something...",
    gameOver: "GAME OVER!",
    roundOver: "ROUND OVER!",
    wins: "WINS!",
    out: "OUT",
    nextRound: "NEXT ROUND",
    newGame: "NEW GAME",
    invalidPlay: "Invalid play!",
    needPlayers: "At least 2 players needed!",
    copied: "Invite link copied to clipboard!",
    eggyTable: "EGGY TABLE",
    logGameStarted: "Game started! Good luck!",
    logNewRound: "⭐ New round! {0} won last round and goes first.",
    logDiceRolls: "🎲 Dice rolls: {0}",
    logGoesFirst: "⭐ {0} rolled highest and goes first!",
    logPlayed: "{0} played {1} ({2})",
    logMultiplierUp: "💥 Multiplier x{0}!",
    logWonRound: "{0} won the round{1}!",
    logAndDrew: " and drew a card",
    enterGameKey: "Enter Game Key",
    gameKeyPlaceholder: "Enter key to become host...",
    verifyKey: "VERIFY",
    wrongKey: "Wrong key!",
    becomeHost: "BECOME HOST",
    joinAsParticipant: "JOIN AS PARTICIPANT",
    hostControls: "Host: Create room, set coins, add bots",
    participantControls: "Participant: Choose seat, edit name",
    waitingForHost: "Waiting for host to start...",
    youAreHost: "You are the HOST",
    youAreParticipant: "You are a PARTICIPANT",
    selectRole: "Select Role",
    iAmHost: "HOST",
    iAmParticipant: "PARTICIPANT",
    hostVerify: "Host Verification",
    enterHostKey: "Enter host key",
    verify: "VERIFY",
    createRoom: "Create Room",
    joinRoom: "Join Room",
    enter4DigitRoom: "Enter 4-digit room number",
    back: "BACK",
    keyError: "Wrong key!"
  },
  zh: {
    title: "蛋仔派对！",
    subtitle: "干瞪眼特别版",
    yourName: "你的蛋仔昵称",
    initialCoins: "初始金币",
    hostOnline: "创建联机房间",
    room: "房间号",
    copyLink: "复制邀请链接",
    addBot: "添加机器人",
    start: "开始游戏！",
    rollToStart: "掷骰子决定先手！",
    rollDice: "🎲 掷骰子",
    multiplier: "当前倍数",
    cardsLeft: "张牌",
    pass: "要不起",
    play: "出牌",
    chat: "聊天",
    saySomething: "说点什么...",
    gameOver: "游戏结束！",
    roundOver: "回合结束！",
    wins: "获胜！",
    out: "出局",
    nextRound: "下一局",
    newGame: "重新开始",
    invalidPlay: "出牌无效！",
    needPlayers: "至少需要2名玩家！",
    copied: "邀请链接已复制到剪贴板！",
    eggyTable: "蛋仔牌桌",
    logGameStarted: "游戏开始！祝你好运！",
    logNewRound: "⭐ 新回合！{0} 上局获胜，优先出牌。",
    logDiceRolls: "🎲 掷骰子结果: {0}",
    logGoesFirst: "⭐ {0} 点数最大，优先出牌！",
    logPlayed: "{0} 打出了 {1} ({2})",
    logMultiplierUp: "💥 倍数翻倍 x{0}!",
    logWonRound: "{0} 赢得了这轮{1}!",
    logAndDrew: " 并摸了一张牌",
    enterGameKey: "输入游戏密钥",
    gameKeyPlaceholder: "输入密钥成为主持人...",
    verifyKey: "验证",
    wrongKey: "密钥错误！",
    becomeHost: "成为主持人",
    joinAsParticipant: "以参与人加入",
    hostControls: "主持人：创建房间、设置金币、添加机器人",
    participantControls: "参与人：选择座位、修改昵称",
    waitingForHost: "等待主持人开始游戏...",
    youAreHost: "你是主持人",
    youAreParticipant: "你是参与人",
    selectRole: "选择角色",
    iAmHost: "主持人",
    iAmParticipant: "参与者",
    hostVerify: "主持人验证",
    enterHostKey: "请输入主持人密钥",
    verify: "验证",
    createRoom: "创建房间",
    joinRoom: "加入房间",
    enter4DigitRoom: "输入4位房间号",
    back: "返回",
    keyError: "密钥错误！"
  }
};

let socket: Socket | null = null;

export default function App() {
  const [lang, setLang] = useState<"en" | "zh">("zh");
  const [roomId, setRoomId] = useState("");
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [setupPlayers, setSetupPlayers] = useState<(Player | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [userName, setUserName] = useState("主持人");
  const [userAvatar, setUserAvatar] = useState(IDLE_AVATARS[0]);
  const [initialCoins, setInitialCoinsState] = useState(100);
  const [showChat, setShowChat] = useState(false);
  
  // Wrapper for setInitialCoins that syncs in multiplayer
  const setInitialCoins = (coins: number) => {
    setInitialCoinsState(coins);
    if (isMultiplayer && socket && roomId) {
      socket.emit("update_initial_coins", roomId, coins);
    }
  };
  const [chatInput, setChatInput] = useState("");
  const [bubbles, setBubbles] = useState<Record<number, string>>({});
  const [isRolling, setIsRolling] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [state, setState] = useState<GameState>({
    status: "setup",
    players: [],
    deck: [],
    currentPlayerIndex: null,
    currentPlay: null,
    lastPlayPlayerIndex: null,
    winner: null,
    logs: [],
    multiplier: 1,
    roundResults: [],
    chatMessages: [],
    diceRolls: {},
    hostId: null,
    gameKey: "",
    hasPlayedCards: {},
  });
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  
  // Role and key verification states
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomError, setRoomError] = useState("");
  const [showRoomInput, setShowRoomInput] = useState<"host" | "participant" | null>(null);
  const [showHostKeyInput, setShowHostKeyInput] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const GAME_KEY = "001";

  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, []);

  const toggleSoundEnabled = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setSoundEnabledState(newState);
  };

  const t = (key: keyof typeof TRANSLATIONS["en"], ...args: any[]) => {
    let str = TRANSLATIONS[lang][key] || TRANSLATIONS["en"][key];
    args.forEach((arg, i) => {
      str = str.replace(`{${i}}`, String(arg));
    });
    return str;
  };

  useEffect(() => {
    // Check URL for room ID
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setRoomId(room);
      setIsMultiplayer(true);
      initSocket(room);
    }
  }, []);

  const initSocket = (room: string) => {
    if (!socket) {
      socket = io();
      socket.on("connect", () => {
        console.log("Connected to server");
        socket?.emit("join_room", room);
      });

      socket.on("state_updated", (newState: GameState) => {
        setState(newState);
      });
      
      socket.on("room_state", (roomData: any) => {
        if (roomData.state) {
          setState(roomData.state);
        }
        // Sync setup phase data
        if (roomData.setupPlayers) {
          setSetupPlayers(roomData.setupPlayers);
        }
        if (roomData.hostId !== undefined) {
          // If there's already a host, we are participant
          if (roomData.hostId !== null && userRole === null) {
            setUserRole("participant");
            // Participant needs to manually choose a seat
          }
        }
        if (roomData.initialCoins) {
          setInitialCoinsState(roomData.initialCoins);
        }
      });

      // Setup phase synchronization
      socket.on("setup_players_updated", (newSetupPlayers: (Player | null)[]) => {
        setSetupPlayers(newSetupPlayers);
      });

      socket.on("host_updated", (hostId: number | null) => {
        if (hostId !== null && userRole === null) {
          setUserRole("participant");
        }
      });

      socket.on("initial_coins_updated", (coins: number) => {
        setInitialCoinsState(coins);
      });

      socket.on("player_joined", () => {
        // When a new player joins, broadcast our setup state if we're the host
        if (isHost && socket) {
          socket.emit("update_setup_players", roomId, setupPlayers);
          socket.emit("update_host", roomId, myPlayerId);
          socket.emit("update_initial_coins", roomId, initialCoins);
        }
      });

      // Handle host disconnection
      socket.on("host_disconnected", () => {
        alert("主持人已退出，游戏结束！");
        // Reset to initial state
        window.location.href = window.location.pathname;
      });
    }
  };

  const updateState = (newState: GameState) => {
    setState(newState);
    if (isMultiplayer && socket) {
      socket.emit("update_state", roomId, newState);
    }
  };

  const sendChatMessage = (text: string, senderId?: number) => {
    if (!text.trim()) return;
    const sid = senderId ?? state.players.find((p) => !p.isAI)?.id;
    if (sid === undefined) return;

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: sid,
      text,
      timestamp: Date.now(),
    };

    const newState = {
      ...state,
      chatMessages: [...state.chatMessages, newMessage].slice(-50),
    };
    updateState(newState);
    if (senderId === undefined) setChatInput("");

    setBubbles((prev) => ({ ...prev, [sid]: text }));
    setTimeout(() => {
      setBubbles((prev) => {
        if (prev[sid] === text) {
          const next = { ...prev };
          delete next[sid];
          return next;
        }
        return prev;
      });
    }, 3000);

    // AI Interaction
    const sender = state.players.find((p) => p.id === sid);
    if (sender && !sender.isAI) {
      const aiPlayers = state.players.filter((p) => p.isAI);
      if (aiPlayers.length > 0) {
        // Pick a random AI to reply
        const randomAI = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
        setTimeout(async () => {
          const reply = await getBotChatResponse(
            randomAI.name,
            sender.name,
            text,
            state.multiplier
          );
          if (reply) {
            sendChatMessage(reply, randomAI.id);
          }
        }, 1000 + Math.random() * 2000);
      }
    }
  };

  const joinTable = (index: number) => {
    const newSetup = [...setupPlayers];
    
    // If clicking the same seat, leave it
    if (newSetup[index] && myPlayerId === index) {
      newSetup[index] = null;
      setMyPlayerId(null);
    } else {
      // Clear previous seat if any
      if (myPlayerId !== null && myPlayerId !== index) {
        newSetup[myPlayerId] = null;
      }
      // Take new seat
      newSetup[index] = {
        id: index,
        name: userName,
        isAI: false,
        hand: [],
        avatar: userAvatar,
        coins: initialCoins,
      };
      setMyPlayerId(index);
    }
    setSetupPlayers(newSetup);
    
    // Sync setup state in multiplayer
    if (isMultiplayer && socket) {
      socket.emit("update_setup_players", roomId, newSetup);
    }
  };

  const addAI = () => {
    const emptyIndex = setupPlayers.findIndex((p) => p === null);
    if (emptyIndex === -1) return;
    const newSetup = [...setupPlayers];
    const botCount = setupPlayers.filter(p => p?.isAI).length + 1;
    const aiName = `Bot ${botCount}`;
    newSetup[emptyIndex] = {
      id: emptyIndex,
      name: aiName,
      isAI: true,
      hand: [],
      avatar: BOT_AVATAR,
      coins: initialCoins,
    };
    setSetupPlayers(newSetup);
    
    // Sync setup state in multiplayer
    if (isMultiplayer && socket) {
      socket.emit("update_setup_players", roomId, newSetup);
    }
  };

  const startGame = () => {
    // Initialize voices on game start (requires user interaction)
    initVoices();
    
    const activePlayers = setupPlayers.filter((p) => p !== null) as Player[];
    if (activePlayers.length < 2) {
      alert(t("needPlayers"));
      return;
    }

    const deck = createDeck();
    // Keep original seat index as player id to maintain consistency with myPlayerId
    // Winner gets 6 cards, others get 5 cards
    const players: Player[] = activePlayers.map((p) => ({
      ...p,
      hand: deck.splice(0, p.id === state.winner ? 6 : 5),
      coins: initialCoins,
    }));

    players.forEach((p) => p.hand.sort((a, b) => a.rank - b.rank));
    playSound("start");

    updateState({
      status: "rolling",
      players,
      deck,
      currentPlayerIndex: players[0].id,
      currentPlay: null,
      lastPlayPlayerIndex: null,
      winner: null,
      logs: [],
      multiplier: 1,
      roundResults: [],
      chatMessages: [],
      diceRolls: Object.fromEntries(players.map(p => [p.id, null])),
      hostId: state.hostId,
      gameKey: state.gameKey,
      hasPlayedCards: Object.fromEntries(players.map(p => [p.id, false])),
    });
    setSelectedCards([]);
  };

  const rollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    playSound("play");

    const myRoll = Math.floor(Math.random() * 6) + 1;
    
    if (isMultiplayer) {
      // In multiplayer, send own dice roll to server
      if (myPlayerId !== null) {
        // Also handle AI players if host
        const newRolls = { ...state.diceRolls, [myPlayerId]: myRoll };
        
        if (myPlayerId === 0) {
          // Host also rolls for AI
          state.players.forEach(p => {
            if (p.isAI) {
              newRolls[p.id] = Math.floor(Math.random() * 6) + 1;
            }
          });
        }
        
        // Send to server for merging
        socket?.emit("update_dice_roll", roomId, myPlayerId, myRoll);
        
        // If host with AI, also update AI rolls
        if (myPlayerId === 0) {
          state.players.forEach(p => {
            if (p.isAI) {
              socket?.emit("update_dice_roll", roomId, p.id, newRolls[p.id]);
            }
          });
        }
      }
    } else {
      // Single player: roll for everyone
      const newRolls = { ...state.diceRolls };
      state.players.forEach(p => {
        newRolls[p.id] = Math.floor(Math.random() * 6) + 1;
      });
      updateState({ ...state, diceRolls: newRolls });
    }
  };

  // Effect to auto-roll for AI players (host only)
  useEffect(() => {
    if (state.status !== "rolling") return;
    if (isMultiplayer && userRole !== "host") return;
    
    // Auto-roll for AI players
    const aiPlayers = state.players.filter(p => p.isAI && (state.diceRolls[p.id] === null || state.diceRolls[p.id] === undefined));
    if (aiPlayers.length > 0) {
      aiPlayers.forEach(p => {
        const aiRoll = Math.floor(Math.random() * 6) + 1;
        socket?.emit("update_dice_roll", roomId, p.id, aiRoll);
      });
    }
  }, [state.status, state.players, state.diceRolls, isMultiplayer, userRole]);

  // Effect to check if all players have rolled and process results (host only)
  useEffect(() => {
    if (state.status !== "rolling") return;
    if (isMultiplayer && userRole !== "host") return;
    
    const allRolled = state.players.every(p => 
      state.diceRolls[p.id] !== null && state.diceRolls[p.id] !== undefined
    );
    
    if (allRolled) {
      // Reset rolling state
      setIsRolling(false);
      
      // All have rolled, process results
      const rolls = state.players.map(p => ({ id: p.id, name: p.name, roll: state.diceRolls[p.id] || 1 }));
      const maxRoll = Math.max(...rolls.map(r => r.roll));
      const topRollers = rolls.filter(r => r.roll === maxRoll);
      const starter = topRollers[Math.floor(Math.random() * topRollers.length)];
      const starterArrayIndex = state.players.findIndex(p => p.id === starter.id);
      const starterPlayerId = starter.id;

      const newPlayers = [...state.players];
      const newDeck = [...state.deck];
      if (newDeck.length > 0) {
        newPlayers[starterArrayIndex] = {
          ...newPlayers[starterArrayIndex],
          hand: [...newPlayers[starterArrayIndex].hand, newDeck.pop()!].sort((a, b) => a.rank - b.rank)
        };
      }

      const nextState: GameState = {
        ...state,
        players: newPlayers,
        deck: newDeck,
        status: "playing",
        currentPlayerIndex: starterPlayerId,
        logs: [
          t("logDiceRolls", rolls.map(r => `${r.name}(${r.roll})`).join(", ")),
          t("logGoesFirst", starter.name)
        ]
      };
      updateState(nextState);
    }
  }, [state.diceRolls, state.status]);

  const nextRound = () => {
    const activePlayers = state.players.filter((p) => p.coins > 0);
    if (activePlayers.length < 2) {
      setState((s) => ({ ...s, status: "gameover" }));
      return;
    }

    const deck = createDeck();
    // Find winner's position in activePlayers array
    const winnerArrayIndex = activePlayers.findIndex(p => p.id === state.winner);
    const starterArrayIndex = winnerArrayIndex !== -1 ? winnerArrayIndex : 0;

    const newPlayers = activePlayers.map((p, i) => ({
      ...p,
      hand: deck.splice(0, i === starterArrayIndex ? 6 : 5),
    }));

    newPlayers.forEach((p) => p.hand.sort((a, b) => a.rank - b.rank));
    playSound("start");

    // Get the actual player id of the starter
    const starterPlayerId = newPlayers[starterArrayIndex].id;

    updateState({
      ...state,
      status: "playing",
      players: newPlayers,
      deck,
      currentPlayerIndex: newPlayers[starterArrayIndex].id,
      currentPlay: null,
      lastPlayPlayerIndex: null,
      winner: null,
      multiplier: 1,
      logs: [t("logNewRound", newPlayers[starterArrayIndex].name)],
      roundResults: [],
    });
    setSelectedCards([]);
  };

  const addLog = (msg: string) => {
    setState((s) => ({ ...s, logs: [msg, ...s.logs].slice(0, 10) }));
  };

  const nextTurn = (
    currentState: GameState,
    nextPlayerId: number,
    newDeck: CardType[],
    newPlayers: Player[],
    newCurrentPlay: Play | null,
    newLastPlayPlayerId: number | null,
  ) => {
    let currentPlay = newCurrentPlay;
    if (newLastPlayPlayerId === nextPlayerId) {
      currentPlay = null;
      let drawnCard = null;
      if (newDeck.length > 0) {
        drawnCard = newDeck.pop()!;
        const winnerIndex = newPlayers.findIndex(p => p.id === nextPlayerId);
        const winner = newPlayers[winnerIndex];
        const newHand = [...winner.hand, drawnCard].sort(
          (a, b) => a.rank - b.rank,
        );
        newPlayers[winnerIndex] = { ...winner, hand: newHand };
      }
      const winnerPlayer = newPlayers.find(p => p.id === nextPlayerId)!;
      addLog(
        t("logWonRound", winnerPlayer.name, drawnCard ? t("logAndDrew") : "")
      );
    }

    updateState({
      ...currentState,
      players: newPlayers,
      deck: newDeck,
      currentPlayerIndex: nextPlayerId,
      currentPlay: currentPlay,
      lastPlayPlayerIndex: newLastPlayPlayerId,
    });
    setSelectedCards([]);
  };

  const handlePlay = (cardsToPlay: CardType[]) => {
    const play = analyzePlay(cardsToPlay);
    if (!play || !canBeat(play, state.currentPlay)) {
      alert(t("invalidPlay"));
      return;
    }

    let newMultiplier = state.multiplier;
    if (play.type === "bomb3" || play.type === "bomb4" || play.type === "rocket") {
      newMultiplier *= 2;
    }

    const currentPlayer = state.players.find(p => p.id === state.currentPlayerIndex)!;
    const newHand = currentPlayer.hand.filter(
      (c) => !cardsToPlay.find((pc) => pc.id === c.id),
    );

    const newPlayers = state.players.map(p => 
      p.id === currentPlayer.id ? { ...currentPlayer, hand: newHand } : p
    );

    // Mark player as having played cards
    const newHasPlayedCards = { ...state.hasPlayedCards, [currentPlayer.id]: true };

    playSound("play");
    // Play voice for card playing
    const playerGender = currentPlayer.gender || (currentPlayer.id % 2 === 0 ? "male" : "female");
    playCardVoice(cardsToPlay.map((c) => c.label), playerGender);
    
    addLog(
      t("logPlayed", currentPlayer.name, play.type, cardsToPlay.map((c) => c.label).join(","))
    );
    if (newMultiplier > state.multiplier) {
      addLog(t("logMultiplierUp", newMultiplier));
      // Play bomb voice
      playBombVoice(playerGender);
      
      // AI Reaction to Bomb/Rocket
      const aiPlayers = state.players.filter((p) => p.isAI && p.id !== currentPlayer.id);
      if (aiPlayers.length > 0 && Math.random() < 0.7) {
        const randomAI = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
        setTimeout(async () => {
          const reply = await getBotChatResponse(
            randomAI.name,
            currentPlayer.name,
            `I just played a ${play.type} and doubled the multiplier to x${newMultiplier}!`,
            newMultiplier,
            true
          );
          if (reply) {
            sendChatMessage(reply, randomAI.id);
          }
        }, 1500);
      }
    }

    if (newHand.length === 0) {
      playSound("win");
      // Play win voice
      const winnerGender = currentPlayer.gender || (currentPlayer.id % 2 === 0 ? "male" : "female");
      playWinVoice(currentPlayer.name, winnerGender);
      
      let totalWon = 0;
      const roundResults: RoundResult[] = [];
      
      const finalPlayers = newPlayers.map(p => {
        if (p.id === currentPlayer.id) return p;
        
        // Check if player never played cards (only for human players, not AI)
        const neverPlayed = !state.hasPlayedCards[p.id];
        // Personal multiplier: if human player never played, double their penalty
        const personalMultiplier = (!p.isAI && neverPlayed) ? 2 : 1;
        const totalMultiplier = newMultiplier * personalMultiplier;
        
        const penalty = p.hand.length * totalMultiplier;
        const actualPenalty = Math.min(penalty, p.coins);
        totalWon += actualPenalty;
        
        const newCoins = p.coins - actualPenalty;
        roundResults.push({
          playerId: p.id,
          name: p.name,
          avatar: p.avatar,
          coinsChange: -actualPenalty,
          coinsTotal: newCoins,
          isEliminated: newCoins <= 0,
          remainingCards: p.hand.length,
          baseMultiplier: newMultiplier,
          personalMultiplier,
          totalMultiplier,
          neverPlayed,
        });
        
        return { ...p, coins: newCoins };
      });
      
      const winnerIndex = finalPlayers.findIndex(p => p.id === currentPlayer.id);
      finalPlayers[winnerIndex].coins += totalWon;
      
      roundResults.push({
        playerId: currentPlayer.id,
        name: currentPlayer.name,
        avatar: currentPlayer.avatar,
        coinsChange: totalWon,
        coinsTotal: finalPlayers[winnerIndex].coins,
        isEliminated: false,
        remainingCards: 0,
        baseMultiplier: newMultiplier,
        personalMultiplier: 1,
        totalMultiplier: newMultiplier,
        neverPlayed: false,
      });

      roundResults.sort((a, b) => b.coinsChange - a.coinsChange);
      const activePlayersCount = finalPlayers.filter(p => p.coins > 0).length;

      updateState({
        ...state,
        status: activePlayersCount <= 1 ? "gameover" : "roundover",
        winner: currentPlayer.id,
        players: finalPlayers,
        multiplier: newMultiplier,
        roundResults,
        hasPlayedCards: newHasPlayedCards,
      });
      return;
    }

    // Find next player by array index
    const currentPlayerArrayIndex = state.players.findIndex(p => p.id === state.currentPlayerIndex);
    const nextPlayerArrayIndex = (currentPlayerArrayIndex + 1) % state.players.length;
    const nextPlayerId = state.players[nextPlayerArrayIndex].id;
    
    nextTurn(
      { ...state, multiplier: newMultiplier, hasPlayedCards: newHasPlayedCards },
      nextPlayerId,
      state.deck,
      newPlayers,
      play,
      state.currentPlayerIndex,
    );
  };

  const handlePass = () => {
    if (!state.currentPlay) {
      alert("You must play a card on a free turn!");
      return;
    }

    const currentPlayer = state.players.find(p => p.id === state.currentPlayerIndex)!;
    playSound("pass");
    // Play pass voice
    const playerGender = currentPlayer.gender || (currentPlayer.id % 2 === 0 ? "male" : "female");
    playPassVoice(playerGender);
    addLog(`${currentPlayer.name} passed.`);

    // Find next player by ID
    const currentPlayerArrayIndex = state.players.findIndex(p => p.id === state.currentPlayerIndex);
    const nextPlayerArrayIndex = (currentPlayerArrayIndex + 1) % state.players.length;
    const nextPlayerId = state.players[nextPlayerArrayIndex].id;
    
    nextTurn(
      state,
      nextPlayerId,
      state.deck,
      state.players,
      state.currentPlay,
      state.lastPlayPlayerIndex,
    );
  };

  useEffect(() => {
    if (state.status !== "playing") return;

    const currentPlayer = state.players.find(p => p.id === state.currentPlayerIndex);
    if (!currentPlayer) return;
    
    // Check if current player is AI or hosted (auto-play)
    const shouldAutoPlay = currentPlayer.isAI || currentPlayer.isHosted;
    if (!shouldAutoPlay) return;
    
    // In multiplayer, only the host runs AI/hosted logic to prevent duplicate actions
    if (isMultiplayer && userRole !== "host") return;

    const timer = setTimeout(() => {
      const bestPlay = getBestPlay(currentPlayer.hand, state.currentPlay);
      
      if (Math.random() < 0.15) {
        const emojis = ["🤔", "😎", "😅", "🔥", "👍"];
        sendChatMessage(emojis[Math.floor(Math.random() * emojis.length)], currentPlayer.id);
      }

      if (bestPlay) {
        handlePlay(bestPlay);
      } else {
        if (Math.random() < 0.3) {
          sendChatMessage("😭", currentPlayer.id);
        }
        handlePass();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [state.currentPlayerIndex, state.status, state.players]);

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  };

  const playSelected = () => {
    const currentPlayer = state.players.find(p => p.id === state.currentPlayerIndex)!;
    const cardsToPlay = currentPlayer.hand.filter((c) =>
      selectedCards.includes(c.id),
    );
    handlePlay(cardsToPlay);
  };

  const createMultiplayerRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
    setIsMultiplayer(true);
    initSocket(newRoomId);
    
    // Update URL so it can be shared
    const url = new URL(window.location.href);
    url.searchParams.set("room", newRoomId);
    window.history.pushState({}, "", url);
    
    // Broadcast host info after a short delay to ensure socket is connected
    setTimeout(() => {
      if (socket && myPlayerId !== null) {
        socket.emit("register_host", newRoomId);
        socket.emit("update_host", newRoomId, myPlayerId);
        socket.emit("update_setup_players", newRoomId, setupPlayers);
        socket.emit("update_initial_coins", newRoomId, initialCoins);
      }
    }, 500);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert(t("copied"));
  };

  const verifyGameKey = () => {
    if (keyInput === GAME_KEY) {
      setUserRole("host");
      setShowKeyInput(false);
      setKeyError("");
      // Set first available seat for host
      const emptyIndex = setupPlayers.findIndex((p) => p === null);
      if (emptyIndex !== -1) {
        joinTable(emptyIndex);
      }
      // Register as host for disconnect detection
      if (socket && roomId) {
        socket.emit("register_host", roomId);
      }
    } else {
      setKeyError(t("wrongKey"));
    }
  };

  const isHost = userRole === "host";
  const isParticipant = userRole === "participant";

  if (state.status === "setup") {
    // Check if user joined via room link (participant)
    const params = new URLSearchParams(window.location.search);
    const hasRoomParam = params.has("room");
    
    // If has room param and no role set yet, auto-set as participant
    if (hasRoomParam && !userRole && !showKeyInput) {
      // Don't set immediately, wait for room state to check if host exists
      // This will be handled in initSocket when room_state is received
    }
    
    // Host key verification screen
    if (showHostKeyInput) {
      return (
        <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-4 font-sans">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              onClick={toggleSoundEnabled}
              className={`px-4 py-2 rounded-full shadow-md font-black transition-colors border-2 ${
                soundEnabled 
                  ? "bg-green-400 text-white border-green-500" 
                  : "bg-gray-200 text-gray-600 border-gray-300"
              }`}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md font-black text-sky-500 hover:bg-white transition-colors border-2 border-sky-100"
            >
              {lang === "en" ? "中文" : "English"}
            </button>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-black text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] tracking-tighter italic mb-4">
              {t("title")}
            </h1>
            <p className="text-yellow-900 font-bold text-lg opacity-80">
              {t("subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
          >
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-black text-zinc-800 text-center mb-4">
                {t("hostVerify")}
              </h2>
              <p className="text-sm text-zinc-500 text-center mb-2">
                {t("enterHostKey")}
              </p>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="***"
                className="w-full text-4xl font-black text-zinc-800 border-b-4 border-yellow-400 focus:outline-none text-center py-4 tracking-widest"
              />
              {keyError && (
                <p className="text-rose-500 font-bold text-center">{t("keyError")}</p>
              )}
              <button
                onClick={() => {
                  if (keyInput === GAME_KEY) {
                    setKeyError("");
                    setShowHostKeyInput(false);
                    setShowRoomInput("host");
                    setKeyInput("");
                  } else {
                    setKeyError(t("keyError"));
                  }
                }}
                className="py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-lg shadow-[0_5px_0_#e11d48] active:translate-y-1 active:shadow-none transition-all"
              >
                {t("verify")}
              </button>
              <button
                onClick={() => {
                  setShowHostKeyInput(false);
                  setKeyInput("");
                  setKeyError("");
                }}
                className="py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-2xl font-bold text-base transition-all"
              >
                {t("back")}
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Role selection screen
    if (!userRole && !hasRoomParam && !showRoomInput) {
      return (
        <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-4 font-sans">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              onClick={toggleSoundEnabled}
              className={`px-4 py-2 rounded-full shadow-md font-black transition-colors border-2 ${
                soundEnabled 
                  ? "bg-green-400 text-white border-green-500" 
                  : "bg-gray-200 text-gray-600 border-gray-300"
              }`}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md font-black text-sky-500 hover:bg-white transition-colors border-2 border-sky-100"
            >
              {lang === "en" ? "中文" : "English"}
            </button>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-black text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] tracking-tighter italic mb-4">
              {t("title")}
            </h1>
            <p className="text-yellow-900 font-bold text-lg opacity-80">
              {t("subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-2xl"
          >
            <h2 className="text-3xl font-black text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.2)] text-center mb-12">
              {t("selectRole")}
            </h2>

            <div className="flex justify-center items-center gap-12">
              {/* Host Option - 3D Circle */}
              <button
                onClick={() => {
                  initVoices();
                  setShowHostKeyInput(true);
                }}
                className="w-40 h-40 bg-gradient-to-br from-rose-400 to-rose-600 hover:from-rose-500 hover:to-rose-700 rounded-full font-black text-3xl text-white transition-all flex flex-col items-center justify-center gap-2 border-4 border-rose-300 shadow-[0_8px_0_#be123c,0_12px_20px_rgba(0,0,0,0.3)] active:shadow-[0_4px_0_#be123c,0_6px_10px_rgba(0,0,0,0.3)] active:translate-y-1"
              >
                <span className="drop-shadow-md">{t("iAmHost")}</span>
              </button>

              {/* Participant Option - 3D Circle */}
              <button
                onClick={() => {
                  initVoices();
                  setShowRoomInput("participant");
                }}
                className="w-40 h-40 bg-gradient-to-br from-sky-400 to-sky-600 hover:from-sky-500 hover:to-sky-700 rounded-full font-black text-3xl text-white transition-all flex flex-col items-center justify-center gap-2 border-4 border-sky-300 shadow-[0_8px_0_#0369a1,0_12px_20px_rgba(0,0,0,0.3)] active:shadow-[0_4px_0_#0369a1,0_6px_10px_rgba(0,0,0,0.3)] active:translate-y-1"
              >
                <span className="drop-shadow-md">{t("iAmParticipant")}</span>
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Room number input screen
    if (showRoomInput) {
      const isHostMode = showRoomInput === "host";
      return (
        <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-4 font-sans">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              onClick={toggleSoundEnabled}
              className={`px-4 py-2 rounded-full shadow-md font-black transition-colors border-2 ${
                soundEnabled 
                  ? "bg-green-400 text-white border-green-500" 
                  : "bg-gray-200 text-gray-600 border-gray-300"
              }`}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md font-black text-sky-500 hover:bg-white transition-colors border-2 border-sky-100"
            >
              {lang === "en" ? "中文" : "English"}
            </button>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-black text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] tracking-tighter italic mb-4">
              {t("title")}
            </h1>
            <p className="text-yellow-900 font-bold text-lg opacity-80">
              {t("subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
          >
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-black text-zinc-800 text-center mb-4">
                {isHostMode ? t("createRoom") : t("joinRoom")}
              </h2>
              <p className="text-sm text-zinc-500 text-center mb-2">
                {t("enter4DigitRoom")}
              </p>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setRoomNumber(val);
                }}
                placeholder="0000"
                maxLength={4}
                className="w-full text-4xl font-black text-zinc-800 border-b-4 border-yellow-400 focus:outline-none text-center py-4 tracking-widest"
              />
              {roomError && (
                <p className="text-rose-500 font-bold text-center">{roomError}</p>
              )}
              <button
                onClick={() => {
                  if (roomNumber.length !== 4) {
                    setRoomError(t("enter4DigitRoom"));
                    return;
                  }
                  setRoomError("");
                  if (isHostMode) {
                    // Host creates room with custom number
                    setRoomId(roomNumber);
                    setIsMultiplayer(true);
                    setUserRole("host");
                    initSocket(roomNumber);
                    // Update URL
                    const url = new URL(window.location.href);
                    url.searchParams.set("room", roomNumber);
                    window.history.pushState({}, "", url);
                    // Register as host after socket connects
                    setTimeout(() => {
                      if (socket) {
                        socket.emit("register_host", roomNumber);
                        socket.emit("update_setup_players", roomNumber, setupPlayers);
                        socket.emit("update_initial_coins", roomNumber, initialCoins);
                      }
                    }, 500);
                    setShowRoomInput(null);
                  } else {
                    // Participant joins room
                    setRoomId(roomNumber);
                    setIsMultiplayer(true);
                    setUserRole("participant");
                    initSocket(roomNumber);
                    // Update URL
                    const url = new URL(window.location.href);
                    url.searchParams.set("room", roomNumber);
                    window.history.pushState({}, "", url);
                    setShowRoomInput(null);
                  }
                }}
                className={`py-4 text-white rounded-2xl font-black text-lg shadow-[0_5px_0_#10b981] active:translate-y-1 active:shadow-none transition-all ${
                  isHostMode ? "bg-rose-500 hover:bg-rose-600 shadow-[0_5px_0_#e11d48]" : "bg-sky-500 hover:bg-sky-600 shadow-[0_5px_0_#0284c7]"
                }`}
              >
                {isHostMode ? t("createRoom") : t("joinRoom")}
              </button>
              <button
                onClick={() => {
                  setShowRoomInput(null);
                  setRoomNumber("");
                  setRoomError("");
                }}
                className="py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-2xl font-bold text-base transition-all"
              >
                {t("back")}
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Main game setup screen
    return (
      <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <button
            onClick={toggleSoundEnabled}
            className={`px-4 py-2 rounded-full shadow-md font-black transition-colors border-2 ${
              soundEnabled 
                ? "bg-green-400 text-white border-green-500" 
                : "bg-gray-200 text-gray-600 border-gray-300"
            }`}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md font-black text-sky-500 hover:bg-white transition-colors border-2 border-sky-100"
          >
            {lang === "en" ? "中文" : "English"}
          </button>
        </div>
        
        {/* Role indicator */}
        <div className="absolute top-4 left-4 z-50">
          <div className={`px-4 py-2 rounded-full shadow-md font-black text-white ${isHost ? "bg-rose-500" : "bg-sky-500"}`}>
            {isHost ? t("youAreHost") : t("youAreParticipant")}
          </div>
        </div>

        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-black text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.2)] tracking-tighter italic">
            {t("title")}
          </h1>
          <p className="text-yellow-900 font-bold text-xl opacity-80">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="relative w-full max-w-4xl aspect-[16/9] bg-yellow-500/30 rounded-[100px] border-8 border-yellow-300/50 flex items-center justify-center">
          {/* Table */}
          <div className="absolute w-2/3 h-2/3 bg-yellow-300 rounded-full border-8 border-yellow-200 shadow-2xl flex items-center justify-center">
            <div className="text-yellow-600 font-black text-4xl opacity-20 rotate-12">
              {t("eggyTable")}
            </div>
          </div>

          {/* Seats */}
          {setupPlayers.map((p, i) => {
            const angles = [90, 162, 234, 306, 18];
            const angle = angles[i];
            const x = 40 * Math.cos((angle * Math.PI) / 180);
            const y = 40 * Math.sin((angle * Math.PI) / 180);
            const isMySeat = myPlayerId === i;

            return (
              <motion.div
                key={i}
                style={{ left: `${50 + x}%`, top: `${50 + y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                {p ? (
                  <div className="relative group">
                    <motion.img
                      whileHover={{ scale: 1.1 }}
                      src={p.avatar}
                      className={`w-24 h-24 rounded-full bg-white border-4 shadow-xl ${isMySeat ? "border-rose-400" : "border-white"}`}
                    />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md text-xs font-black text-zinc-800 whitespace-nowrap">
                      {p.name} {isMySeat && "(我)"}
                    </div>
                    {/* Only allow leaving own seat */}
                    {isMySeat && (
                      <button
                        onClick={() => joinTable(i)}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  /* Only show empty seat button if not occupied and user hasn't joined yet */
                  (isHost || myPlayerId === null) && (
                    <button
                      onClick={() => joinTable(i)}
                      className="w-20 h-20 rounded-full bg-yellow-200/50 border-4 border-dashed border-yellow-100 flex items-center justify-center text-yellow-100 hover:bg-yellow-200 transition-colors"
                    >
                      <Plus size={32} />
                    </button>
                  )
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-center gap-6 w-full max-w-md">
          <div className="bg-white p-6 rounded-3xl shadow-xl w-full flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <img
                src={userAvatar}
                className="w-16 h-16 rounded-full bg-zinc-100 border-2 border-zinc-200"
              />
              <div className="flex-1">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                  {t("yourName")}
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full text-xl font-black text-zinc-800 border-b-4 border-yellow-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto py-2">
              {IDLE_AVATARS.map((av, idx) => (
                <button
                  key={av}
                  onClick={() => {
                    setUserAvatar(av);
                    setUserName(MEMBER_NAMES[idx]);
                  }}
                  className={`flex-shrink-0 w-12 h-12 rounded-full border-4 transition-all ${userAvatar === av ? "border-yellow-400 scale-110" : "border-transparent opacity-50"}`}
                >
                  <img src={av} className="w-full h-full rounded-full object-cover" />
                </button>
              ))}
            </div>
            {/* Only host can set initial coins */}
            {isHost && (
              <div className="mt-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                  {t("initialCoins")}
                </label>
                <input
                  type="number"
                  value={initialCoins}
                  onChange={(e) => setInitialCoins(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full text-xl font-black text-zinc-800 border-b-4 border-yellow-400 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Host controls */}
          {isHost ? (
            <div className="flex flex-wrap gap-3 w-full">
              {!isMultiplayer ? (
                <button
                  onClick={createMultiplayerRoom}
                  className="flex-1 min-w-[140px] py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-base shadow-[0_5px_0_#10b981] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Users size={20} /> {t("hostOnline")}
                </button>
              ) : (
                <button
                  onClick={copyInviteLink}
                  className="flex-1 min-w-[140px] py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-base shadow-[0_5px_0_#10b981] active:translate-y-1 active:shadow-none transition-all flex flex-col items-center justify-center leading-tight"
                >
                  <span className="text-xs opacity-80">{t("room")}: {roomId}</span>
                  <span>{t("copyLink")}</span>
                </button>
              )}
              <button
                onClick={addAI}
                className="flex-1 min-w-[120px] py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-base shadow-[0_5px_0_#3b82f6] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Bot size={20} /> {t("addBot")}
              </button>
              <button
                onClick={startGame}
                className="flex-[2] min-w-[140px] py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xl shadow-[0_5px_0_#e11d48] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <PlayIcon size={24} /> {t("start")}
              </button>
            </div>
          ) : (
            /* Participant waiting message */
            <div className="w-full py-4 bg-zinc-200 rounded-2xl font-bold text-zinc-600 text-center">
              {t("waitingForHost")}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentPlayer = state.players.find(p => p.id === state.currentPlayerIndex) || state.players[0];
  const humanPlayer = isMultiplayer 
    ? state.players.find((p) => p.id === myPlayerId)
    : state.players.find((p) => !p.isAI);
    
  const isHumanTurn =
    !currentPlayer.isAI &&
    !currentPlayer.isHosted &&
    state.status === "playing" &&
    currentPlayer.id === humanPlayer?.id;
    
  const viewingPlayer = humanPlayer || state.players[0];

  return (
    <div className="min-h-screen bg-sky-400 text-zinc-800 flex flex-col font-sans overflow-hidden">
      <header className="bg-white/90 backdrop-blur p-4 flex justify-between items-center shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 p-2 rounded-xl shadow-inner">
            <PlayIcon className="text-white fill-white" size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter italic text-sky-600">
            EGGY GAN DENG YAN
          </h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={toggleSoundEnabled}
            className={`px-4 py-2 rounded-2xl flex items-center gap-2 font-black transition-all ${
              soundEnabled 
                ? "bg-green-400 text-white shadow-[0_3px_0_#16a34a]" 
                : "bg-gray-300 text-gray-600 shadow-[0_3px_0_#6b7280]"
            }`}
            title={soundEnabled ? "关闭声音" : "开启声音"}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div className="bg-rose-100 px-4 py-2 rounded-2xl flex items-center gap-2 font-black text-rose-500">
            {t("multiplier")}: x{state.multiplier}
          </div>
          <div className="bg-sky-100 px-4 py-2 rounded-2xl flex items-center gap-2 font-black text-sky-600">
            <Users size={20} /> {state.players.length}
          </div>
          <div className="bg-yellow-400 px-4 py-2 rounded-2xl flex items-center gap-2 font-black text-white shadow-[0_3px_0_#d97706]">
            DECK: {state.deck.length}
          </div>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-8">
        {/* Table Background */}
        <div className="absolute w-[80%] h-[80%] bg-sky-500/20 rounded-[100px] border-8 border-sky-300/30" />
        <div className="absolute w-[60%] h-[60%] bg-white/10 rounded-full border-8 border-white/20 shadow-inner" />

        {/* Players Around Table */}
        <div className="absolute inset-0 pointer-events-none">
          {state.players.map((p, i) => {
            const angles = [90, 162, 234, 306, 18];
            const angle = angles[i];
            const x = 38 * Math.cos((angle * Math.PI) / 180);
            const y = 38 * Math.sin((angle * Math.PI) / 180);

            const isCurrent = p.id === state.currentPlayerIndex;

            return (
              <motion.div
                key={p.id}
                style={{ left: `${50 + x}%`, top: `${50 + y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-auto"
              >
                <div className="relative">
                  <motion.img
                    animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    src={p.avatar}
                    className={`w-20 h-20 rounded-full bg-white border-4 shadow-xl transition-all ${isCurrent ? "border-yellow-400 scale-110" : "border-white/50"}`}
                  />
                  {isCurrent && (
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-1 rounded-full shadow-lg animate-bounce">
                      <PlayIcon size={16} className="fill-white" />
                    </div>
                  )}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-white px-2 py-0.5 rounded-full shadow-md text-[10px] font-black whitespace-nowrap flex items-center gap-1">
                    💰 {p.coins}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md text-[10px] font-black whitespace-nowrap flex items-center gap-1">
                    <span>{p.name}</span>
                    {p.isHosted && <span className="text-orange-500">🤖</span>}
                    {state.winner === p.id && <span className="text-amber-500">👑</span>}
                    <span className="text-sky-500">({p.hand.length})</span>
                  </div>

                  {/* Speech Bubble */}
                  <AnimatePresence>
                    {bubbles[p.id] && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl shadow-xl text-sm font-black text-zinc-800 whitespace-nowrap z-20 border-2 border-zinc-100"
                      >
                        {bubbles[p.id]}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-b-2 border-r-2 border-zinc-100"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Central Play Area */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {state.status === "rolling" ? (
              <motion.div
                key="rolling"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-center bg-white p-12 rounded-[50px] shadow-2xl border-8 border-yellow-400 flex flex-col items-center gap-6"
              >
                <h2 className="text-4xl font-black text-sky-500 italic tracking-tighter">
                  {t("rollToStart")}
                </h2>
                <div className="flex gap-4">
                  {state.players.map(p => (
                    <div key={p.id} className="flex flex-col items-center gap-2">
                      <img src={p.avatar} className="w-12 h-12 rounded-full border-2 border-zinc-200 object-cover" />
                      <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-4xl font-black shadow-inner">
                        {state.diceRolls[p.id] ? ["⚀","⚁","⚂","⚃","⚄","⚅"][state.diceRolls[p.id]! - 1] : "?"}
                      </div>
                    </div>
                  ))}
                </div>
                {!isRolling && (
                  <button
                    onClick={rollDice}
                    className="px-12 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-3xl font-black text-2xl shadow-[0_8px_0_#e11d48] active:translate-y-2 active:shadow-none transition-all mt-4"
                  >
                    {t("rollDice")}
                  </button>
                )}
              </motion.div>
            ) : state.status === "gameover" || state.status === "roundover" ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-center bg-white p-8 rounded-[50px] shadow-2xl border-8 border-yellow-400 max-w-4xl w-full"
              >
                <h2 className="text-5xl font-black mb-2 text-rose-500 italic tracking-tighter">
                  {state.status === "gameover" ? t("gameOver") : t("roundOver")}
                </h2>
                <div className="flex flex-col items-center gap-2 mb-6">
                  <img
                    src={state.players.find((p) => p.id === state.winner)?.avatar}
                    className="w-24 h-24 rounded-full border-8 border-yellow-200 object-cover"
                  />
                  <p className="text-2xl font-black text-zinc-600">
                    {state.players.find((p) => p.id === state.winner)?.name} {t("wins")}
                  </p>
                  <p className="text-lg font-bold text-yellow-500 bg-yellow-50 px-4 py-1 rounded-full">
                    {t("multiplier")}: x{state.multiplier}
                  </p>
                </div>

                {/* Horizontal player cards */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {state.roundResults.map(r => (
                    <div 
                      key={r.playerId} 
                      className={`flex flex-col items-center p-4 rounded-2xl min-w-[140px] ${
                        r.playerId === state.winner 
                          ? "bg-yellow-100 border-4 border-yellow-400" 
                          : "bg-zinc-50 border-2 border-zinc-200"
                      }`}
                    >
                      {/* Avatar and Name */}
                      <div className="relative mb-2">
                        <img 
                          src={r.avatar} 
                          className={`w-16 h-16 rounded-full object-cover border-4 ${
                            r.playerId === state.winner ? "border-yellow-400" : "border-white"
                          }`} 
                        />
                        {r.playerId === state.winner && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 text-white p-1 rounded-full shadow-lg">
                            👑
                          </div>
                        )}
                        {r.isEliminated && (
                          <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {t("out")}
                          </div>
                        )}
                      </div>
                      
                      <span className={`font-bold text-sm mb-2 ${r.isEliminated ? "line-through text-zinc-400" : "text-zinc-700"}`}>
                        {r.name}
                      </span>
                      
                      {/* Stats for non-winners */}
                      {r.playerId !== state.winner && (
                        <div className="flex flex-col items-center gap-1 text-xs text-zinc-500 mb-2">
                          <span>剩余: {r.remainingCards}张</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sky-500">基础x{r.baseMultiplier}</span>
                            {r.personalMultiplier > 1 && (
                              <span className="text-rose-500 font-bold">个人x{r.personalMultiplier}</span>
                            )}
                          </div>
                          {r.neverPlayed && (
                            <span className="text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full text-[10px]">未出牌</span>
                          )}
                          <span className="font-bold text-zinc-700">总x{r.totalMultiplier}</span>
                        </div>
                      )}
                      
                      {/* Coins change */}
                      <div className={`font-black text-lg ${
                        r.coinsChange > 0 ? "text-emerald-500" : r.coinsChange < 0 ? "text-rose-500" : "text-zinc-400"
                      }`}>
                        {r.coinsChange > 0 ? "+" : ""}{r.coinsChange}
                      </div>
                      
                      {/* Total coins */}
                      <div className="text-yellow-500 font-bold text-sm mt-1">
                        💰 {r.coinsTotal}
                      </div>
                    </div>
                  ))}
                </div>

                {state.status === "roundover" ? (
                  <button
                    onClick={nextRound}
                    className="px-12 py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-3xl font-black text-xl shadow-[0_8px_0_#0ea5e9] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-3 mx-auto w-full"
                  >
                    <PlayIcon size={24} className="fill-white" /> {t("nextRound")}
                  </button>
                ) : (
                  <button
                    onClick={() => setState((s) => ({ ...s, status: "setup" }))}
                    className="px-12 py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-3xl font-black text-xl shadow-[0_8px_0_#0ea5e9] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-3 mx-auto w-full"
                  >
                    <RefreshCw size={24} /> {t("newGame")}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={state.currentPlay?.cards.map((c) => c.id).join("-") || "empty"}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="text-white/50 font-black text-sm uppercase tracking-[0.3em] mb-6">
                  {state.currentPlay ? "Current Play" : "Free Turn!"}
                </div>
                <div className="flex justify-center -space-x-8">
                  {state.currentPlay ? (
                    state.currentPlay.cards.map((c, i) => (
                      <motion.div
                        key={c.id}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: (i - (state.currentPlay!.cards.length - 1) / 2) * 10 }}
                      >
                        <CardView card={c} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="w-32 h-44 border-4 border-dashed border-white/20 rounded-[40px] flex items-center justify-center text-white/20">
                      <Plus size={48} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logs Overlay */}
        <div className="absolute bottom-4 left-4 w-72 max-h-40 overflow-y-auto bg-white/10 backdrop-blur p-4 rounded-3xl text-[10px] font-bold text-white/60 space-y-1 pointer-events-none">
          {state.logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="opacity-30">#</span>
              {log}
            </div>
          ))}
        </div>

        {/* Chat Toggle Button */}
        {state.status === "playing" && (
          <button
            onClick={() => setShowChat(!showChat)}
            className="absolute bottom-4 right-4 bg-white p-4 rounded-full shadow-xl text-sky-500 hover:bg-sky-50 transition-colors z-40 border-4 border-sky-100"
          >
            <MessageCircle size={28} />
          </button>
        )}

        {/* Chat Window */}
        <AnimatePresence>
          {showChat && state.status === "playing" && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-24 right-4 w-80 bg-white rounded-3xl shadow-2xl border-4 border-sky-100 flex flex-col overflow-hidden z-50"
            >
              <div className="bg-sky-500 text-white p-3 font-black text-lg flex justify-between items-center">
                <span>{t("chat")}</span>
                <button onClick={() => setShowChat(false)} className="hover:bg-sky-600 p-1 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 h-64 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50">
                {state.chatMessages.map(msg => {
                  const sender = state.players.find(p => p.id === msg.senderId);
                  if (!sender) return null;
                  const isMe = sender.id === myPlayerId;
                  return (
                    <div key={msg.id} className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : ''}`}>
                      <img src={sender.avatar} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                      <div className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm font-bold shadow-sm ${isMe ? 'bg-sky-500 text-white rounded-br-sm' : 'bg-white text-zinc-800 rounded-bl-sm border border-zinc-100'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="p-3 bg-white border-t border-zinc-100">
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  {["😂", "😡", "😭", "👍", "👎", "😎", "😱", "🎉", "🔥"].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => sendChatMessage(emoji)}
                      className="text-2xl hover:scale-125 transition-transform flex-shrink-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChatMessage(chatInput)}
                    placeholder={t("saySomething")}
                    className="flex-1 bg-zinc-100 border-2 border-transparent rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-sky-400 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={() => sendChatMessage(chatInput)}
                    className="bg-sky-500 text-white p-2 rounded-xl hover:bg-sky-600 transition-colors shadow-md"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Player Controls */}
      {state.status === "playing" && (
        <motion.div
          initial={{ y: 200 }}
          animate={{ y: 0 }}
          className="bg-white p-8 rounded-t-[60px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-30"
        >
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img
                  src={viewingPlayer.avatar}
                  className="w-16 h-16 rounded-full border-4 border-sky-100"
                />
                <div>
                  <div className="text-2xl font-black text-zinc-800">
                    {viewingPlayer.name}
                  </div>
                  {currentPlayer.id === viewingPlayer.id && <span className="text-amber-500 text-lg">👑</span>}
                  <div className="text-sm font-bold text-sky-500 flex items-center gap-3">
                    <span>{viewingPlayer.hand.length} {t("cardsLeft")}</span>
                    <span className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-1 rounded-lg">
                      💰 {viewingPlayer.coins}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handlePass}
                  disabled={!isHumanTurn || !state.currentPlay}
                  className="px-8 py-4 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 text-zinc-400 rounded-3xl font-black text-xl transition-all flex items-center gap-2"
                >
                  <SkipForward size={24} /> {t("pass")}
                </button>
                <button
                  onClick={playSelected}
                  disabled={!isHumanTurn || selectedCards.length === 0}
                  className="px-12 py-4 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-30 text-white rounded-3xl font-black text-2xl shadow-[0_8px_0_#d97706] active:translate-y-2 active:shadow-none transition-all flex items-center gap-3"
                >
                  <PlayIcon size={28} className="fill-white" /> {t("play")}
                </button>
              </div>
              
              {/* Hosting toggle for human players */}
              {humanPlayer && !humanPlayer.isAI && (
                <button
                  onClick={() => {
                    const updatedPlayers = state.players.map(p => 
                      p.id === humanPlayer.id ? { ...p, isHosted: !p.isHosted } : p
                    );
                    updateState({ ...state, players: updatedPlayers });
                  }}
                  className={`mt-4 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                    humanPlayer.isHosted 
                      ? "bg-orange-400 text-white shadow-[0_4px_0_#ea580c]" 
                      : "bg-zinc-200 text-zinc-600 shadow-[0_4px_0_#a1a1aa]"
                  }`}
                >
                  {humanPlayer.isHosted ? (
                    <>
                      <Bot size={20} /> 托管中 (点击取消)
                    </>
                  ) : (
                    <>
                      <User size={20} /> 开启托管
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 justify-center min-h-[140px] py-4">
              {viewingPlayer.hand.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CardView
                    card={card}
                    selected={selectedCards.includes(card.id)}
                    onClick={() => isHumanTurn && toggleCardSelection(card.id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
