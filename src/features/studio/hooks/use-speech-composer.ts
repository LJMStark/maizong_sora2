"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex?: number;
  results?: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
  message?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function getSpeechErrorMessage(error?: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "无法使用麦克风，请允许浏览器麦克风权限后重试。";
  }
  if (error === "audio-capture") {
    return "没有检测到麦克风。";
  }
  if (error === "no-speech") {
    return "没有听到语音，请再试一次。";
  }
  return "语音输入中断，请重试。";
}

export function useSpeechComposer({
  value,
  onChange,
  inputRef,
  lang = "zh-CN",
}: {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  lang?: string;
}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const finalTextRef = useRef("");
  const hasErrorRef = useRef(false);

  const stopSpeechInput = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startSpeechInput = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      toast.info("当前浏览器不支持语音输入，可直接输入提示词。");
      inputRef.current?.focus();
      return;
    }

    if (recognitionRef.current) {
      stopSpeechInput();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    baseTextRef.current = value.trim() ? `${value.trim()} ` : "";
    finalTextRef.current = "";
    hasErrorRef.current = false;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("正在听写，点麦克风可停止。");
      inputRef.current?.focus();
    };

    recognition.onresult = (event) => {
      const results = event.results;
      if (!results) return;

      let interimText = "";
      let finalText = "";
      const startIndex = event.resultIndex ?? 0;

      for (let index = startIndex; index < results.length; index += 1) {
        const result = results[index];
        const transcript = result?.[0]?.transcript ?? "";
        if (!transcript) continue;

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        finalTextRef.current += finalText;
      }

      const nextValue =
        `${baseTextRef.current}${finalTextRef.current}${interimText}`.trimStart();
      onChange(nextValue);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    recognition.onerror = (event) => {
      hasErrorRef.current = true;
      toast.error(getSpeechErrorMessage(event.error));
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      if (!hasErrorRef.current) {
        inputRef.current?.focus();
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      toast.error("语音输入启动失败，请稍后重试。");
    }
  }, [inputRef, lang, onChange, stopSpeechInput, value]);

  const toggleSpeechInput = useCallback(() => {
    if (recognitionRef.current) {
      stopSpeechInput();
      return;
    }

    startSpeechInput();
  }, [startSpeechInput, stopSpeechInput]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        // Detach onend first: abort() fires it, which would setIsListening
        // after the component has unmounted.
        recognition.onend = null;
        recognition.abort?.();
      }
      recognitionRef.current = null;
    };
  }, []);

  return {
    isListening,
    startSpeechInput,
    stopSpeechInput,
    toggleSpeechInput,
  };
}
