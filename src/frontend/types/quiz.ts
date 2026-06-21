export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type GameMode = 'classic' | 'team_battle';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar?: string;
  score: number;
  answers: PlayerAnswer[];
  isHost: boolean;
  joinedAt?: string;
}

export interface PlayerAnswer {
  questionId: string;
  answerIndex: number;
  timeSpent: number;
  isCorrect: boolean;
  points: number;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  topic: string;
  department?: string;
  difficulty: Difficulty;
  questionCount: number;
  questions: Question[];
  players: Player[];
  currentQuestionIndex: number;
  createdAt: string;
  mode: GameMode;
  maxPlayers: number;
}

export interface PublicRoom {
  code: string;
  topic: string;
  department?: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  difficulty: string;
  mode: string;
}

export interface CreateRoomData {
  hostName: string;
  topic: string;
  department?: string;
  difficulty: Difficulty;
  questionCount: number;
  mode: GameMode;
  maxPlayers?: number;
}

export interface JoinRoomData {
  roomCode: string;
  playerName: string;
}

export interface GameState {
  roomCode: string | null;
  roomId: string | null;
  playerName: string;
  isHost: boolean;
  players: Player[];
  questions: Question[];
  currentQuestionIndex: number;
  status: RoomStatus | 'idle';
  score: number;
  topic: string;
  mode: GameMode;
}
