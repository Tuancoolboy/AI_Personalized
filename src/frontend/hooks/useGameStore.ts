"use client";

import { useSyncExternalStore } from "react";
import type { GameMode, GameState, Player, Question, RoomStatus } from "@/types/quiz";

interface GameStore extends GameState {
  setRoomCode: (code: string | null) => void;
  setRoomId: (id: string | null) => void;
  setPlayerName: (name: string) => void;
  setIsHost: (isHost: boolean) => void;
  setPlayers: (players: Player[]) => void;
  setQuestions: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setStatus: (status: RoomStatus | "idle") => void;
  setScore: (score: number) => void;
  addScore: (points: number) => void;
  setTopic: (topic: string) => void;
  setMode: (mode: GameMode) => void;
  reset: () => void;
}

const initialState: GameState = {
  roomCode: null,
  roomId: null,
  playerName: "",
  isHost: false,
  players: [],
  questions: [],
  currentQuestionIndex: 0,
  status: "idle",
  score: 0,
  topic: "",
  mode: "classic",
};

let state = initialState;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(update: Partial<GameState>) {
  state = { ...state, ...update };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useGameStore(): GameStore {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    setRoomCode: (code) => setState({ roomCode: code }),
    setRoomId: (id) => setState({ roomId: id }),
    setPlayerName: (name) => setState({ playerName: name }),
    setIsHost: (isHost) => setState({ isHost }),
    setPlayers: (players) => setState({ players }),
    setQuestions: (questions) => setState({ questions }),
    setCurrentQuestionIndex: (index) => setState({ currentQuestionIndex: index }),
    setStatus: (status) => setState({ status }),
    setScore: (score) => setState({ score }),
    addScore: (points) => setState({ score: snapshot.score + points }),
    setTopic: (topic) => setState({ topic }),
    setMode: (mode) => setState({ mode }),
    reset: () => {
      state = initialState;
      emit();
    },
  };
}
