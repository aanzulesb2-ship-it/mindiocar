"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Send, Trash2, Maximize2, Minimize2 } from "lucide-react";

const SYSTEM_HINT =
  "Eres el asistente tecnico de Rectificadora Mindiocar. Responde claro, corto y util. " +
  "Cuando hables de motores, se preciso. Si faltan datos, pregunta 1 cosa a la vez.";

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
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hola. Soy el asistente de Rectificadora Mindiocar. Que motor estas trabajando hoy?",
    },
  ]);

  const canSend = useMemo(() => {
    return input.trim().length > 0 && !loading && !listening;
  }, [input, loading, listening]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, expanded, loading, listening, liveTranscript]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "es-EC";
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
        const text = event.results[i]?.[0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalText += text + " ";
        } else {
          interimText += text + " ";
        }
      }

      if (finalText.trim()) {
        finalTranscriptRef.current = (finalTranscriptRef.current + " " + finalText).trim();
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
      setMicError(event?.error || "No se pudo usar el microfono");
    };

    rec.onend = () => {
      const dictated = liveTranscriptRef.current.trim() || finalTranscriptRef.current.trim();

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

  const startMic = async () => {
    const rec = recognitionRef.current;

    if (!rec) {
      alert("Tu navegador no soporta dictado por microfono. Usa Chrome o Edge.");
      return;
    }

    setMicError("");
    setLiveTranscript("");
    finalTranscriptRef.current = "";
    liveTranscriptRef.current = "";

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      rec.start();
    } catch {
      setListening(false);
      setMicError("No diste permiso al microfono o el microfono no esta disponible.");
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
      return;
    }
    startMic();
  };

  const clearChat = () => {
    stopMic();
    setMessages([
      {
        role: "assistant",
        content: "Listo. Empecemos de nuevo. Que necesitas revisar del motor?",
      },
    ]);
    setInput("");
    setLiveTranscript("");
    finalTranscriptRef.current = "";
    liveTranscriptRef.current = "";
    setMicError("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
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
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "No pude responder ahora.\n\nDetalle: " + (e?.message || "Error desconocido"),
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
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

  const Shell = ({ children }) => (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[9999] bg-stone-100 p-3 md:p-6"
          : "max-w-5xl mx-auto p-4 md:p-8"
      }
    >
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        {children}
      </div>
    </div>
  );

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-stone-200 bg-white">
        <div>
          <div className="text-xs uppercase tracking-widest font-black text-stone-500">
            Asistente AI
          </div>
          <div className="text-xl md:text-2xl font-black text-stone-900">
            Rectificadora <span className="text-yellow-400">Mindiocar</span>
          </div>
        </div>

        <div />
      </div>

      <div className="p-4 md:p-6">
        <div
          ref={listRef}
          className="h-[55vh] md:h-[60vh] overflow-y-auto mb-4 bg-white rounded-xl p-3 border border-stone-100"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={"mb-3 flex " + (msg.role === "user" ? "justify-end" : "justify-start")}
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
                Escuchando...
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
                ? "Dictando por microfono..."
                : "Escribe tu pregunta... (Enter envia, Shift+Enter salto de linea)"
            }
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              className={
                "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50 " +
                (listening ? "ring-2 ring-yellow-400 animate-pulse" : "")
              }
              title={listening ? "Detener microfono" : "Hablar por microfono"}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              onClick={clearChat}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50"
              title="Limpiar chat"
            >
              <Trash2 size={18} />
            </button>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 text-white hover:bg-stone-800"
              title={expanded ? "Salir pantalla completa (Esc)" : "Expandir"}
            >
              {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400 text-black hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Enviar"
            >
              <Send size={18} />
            </button>
          </div>
        </form>

        <div className="mt-2 text-xs text-stone-500">
          Tip: Dime el motor + el problema. Ejemplo: 1NZ humo azul al acelerar.
        </div>
      </div>
    </Shell>
  );
}
