"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Send, Trash2, Maximize2, Minimize2 } from "lucide-react";

const SYSTEM_HINT =
  "Eres el asistente técnico de Rectificadora Mindiocar. Responde claro, corto y útil. " +
  "Cuando hables de motores, sé preciso. Si faltan datos, pregunta 1 cosa a la vez.";

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function AsistenteMecanico() {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micError, setMicError] = useState("");

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hola 👋 Soy el asistente de Rectificadora Mindiocar. ¿Qué motor estás trabajando hoy?",
    },
  ]);

  const canSend = useMemo(() => {
    return input.trim().length > 0 && !loading && !listening;
  }, [input, loading, listening]);

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.lang = "es-EC";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      finalTranscriptRef.current = "";
      liveTranscriptRef.current = "";
      setLiveTranscript("");
      setMicError("");
      setListening(true);
    };

    rec.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalText += text + " ";
        } else {
          interimText += text + " ";
        }
      }

      if (finalText.trim()) {
        finalTranscriptRef.current =
          (finalTranscriptRef.current + " " + finalText).trim();
      }

      const screenText = [finalTranscriptRef.current, interimText.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();

      liveTranscriptRef.current = screenText;
      setLiveTranscript(screenText);
    };

    rec.onerror = (event) => {
      setListening(false);
      setMicError(event?.error || "No se pudo usar el micrófono");
    };

    rec.onend = () => {
      const dictated =
        liveTranscriptRef.current.trim() || finalTranscriptRef.current.trim();

      if (dictated) {
        setInput((prev) => {
          const base = prev.trim();
          return base ? `${base} ${dictated}` : dictated;
        });
      }

      finalTranscriptRef.current = "";
      liveTranscriptRef.current = "";
      setLiveTranscript("");
      setListening(false);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, listening, expanded]);

  const startMic = async () => {
    const rec = recognitionRef.current;

    if (!rec) {
      alert("Este navegador no soporta dictado por voz. Prueba en Chrome o Edge.");
      return;
    }

    setMicError("");
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    finalTranscriptRef.current = "";

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      rec.start();
    } catch {
      setListening(false);
      setMicError("No diste permiso al micrófono o el micrófono no está disponible.");
    }
  };

  const stopMic = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
  };

  const toggleMic = () => {
    if (listening) {
      stopMic();
    } else {
      startMic();
    }
  };

  const clearChat = () => {
    stopMic();
    setInput("");
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    finalTranscriptRef.current = "";
    setMicError("");
    setMessages([
      {
        role: "assistant",
        content: "Listo. Empecemos de nuevo. ¿Qué necesitas revisar del motor?",
      },
    ]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || listening) return;

    setLoading(true);
    setInput("");

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: SYSTEM_HINT }, ...nextMessages],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error consultando asistente");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content || "No hubo respuesta del asistente.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ No pude responder ahora.\n\nDetalle: ${
            error?.message || "Error desconocido"
          }`,
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  const onKeyDownInput = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[9999] bg-stone-100 p-3 md:p-6"
          : "max-w-5xl mx-auto p-4 md:p-8"
      }
    >
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-stone-200 bg-white">
          <div>
            <div className="text-xs uppercase tracking-widest font-black text-stone-500">
              Asistente AI
            </div>
            <div className="text-xl md:text-2xl font-black text-stone-900">
              Rectificadora <span className="text-yellow-400">Mindiocar</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleMic}
              className={
                "inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 font-semibold " +
                (listening ? "ring-2 ring-yellow-400 animate-pulse" : "")
              }
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
              {listening ? "Detener" : "Mic"}
            </button>

            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 font-semibold"
            >
              <Trash2 size={16} />
              Limpiar
            </button>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 font-semibold"
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {expanded ? "Salir" : "Expandir"}
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div
            ref={listRef}
            className="h-[55vh] md:h-[60vh] overflow-y-auto mb-4 bg-white rounded-xl p-3 border border-stone-100"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  "mb-3 flex " +
                  (msg.role === "user" ? "justify-end" : "justify-start")
                }
              >
                <div
                  className={
                    "max-w-[92%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed " +
                    (msg.role === "user"
                      ? "bg-yellow-400 text-black shadow"
                      : "bg-stone-100 text-stone-900 border border-stone-200")
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {listening && (
              <div className="mb-3 flex justify-start">
                <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm bg-yellow-50 text-stone-800 border border-yellow-300 whitespace-pre-wrap">
                  🎤 Escuchando...
                  {liveTranscript ? `\n${liveTranscript}` : ""}
                </div>
              </div>
            )}

            {loading && (
              <div className="mb-3 flex justify-start">
                <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm bg-stone-100 text-stone-700 border border-stone-200">
                  Escribiendo...
                </div>
              </div>
            )}
          </div>

          {micError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {micError}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDownInput}
              rows={2}
              disabled={listening}
              className="flex-1 resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-stone-100 disabled:text-stone-500"
              placeholder={
                listening
                  ? "Dictando por micrófono..."
                  : "Escribe tu pregunta... (Enter envía, Shift+Enter salto de línea)"
              }
            />

            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-yellow-400 text-black font-black hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}