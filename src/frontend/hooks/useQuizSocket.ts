"use client";

import { useCallback } from "react";
import { useGameStore } from "@/hooks/useGameStore";

export function useQuizSocket() {
  const { setRoomCode, setIsHost, setStatus, roomCode } = useGameStore();

  const hostRoom = useCallback(
    (code: string, playerName?: string) => {
      void playerName;
      setRoomCode(code);
      setIsHost(true);
      setStatus("waiting");
    },
    [setIsHost, setRoomCode, setStatus],
  );

  const joinRoom = useCallback(
    (code: string, playerName?: string) => {
      void playerName;
      setRoomCode(code);
      setIsHost(false);
      setStatus("waiting");
    },
    [setIsHost, setRoomCode, setStatus],
  );

  const startGame = useCallback(() => {
    if (roomCode) setStatus("playing");
  }, [roomCode, setStatus]);

  const submitAnswer = useCallback(() => {
    window.dispatchEvent(new CustomEvent("hoc-tap-room-answer"));
  }, []);

  const nextQuestion = useCallback(() => {
    window.dispatchEvent(new CustomEvent("hoc-tap-room-next"));
  }, []);

  const leaveRoom = useCallback(() => {
    setRoomCode(null);
    setIsHost(false);
    setStatus("idle");
  }, [setIsHost, setRoomCode, setStatus]);

  return {
    socket: null,
    hostRoom,
    joinRoom,
    startGame,
    submitAnswer,
    nextQuestion,
    leaveRoom,
  };
}
