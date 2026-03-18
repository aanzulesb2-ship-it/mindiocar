"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Mic, MicOff, Minimize2, Send, Trash2 } from "lucide-react";

const SYSTEM_HINT =
  "Eres el asistente tecnico de Rectificadora Mindiocar. Responde en una sola linea, directo y sin relleno. " +
  "No des introducciones, no expliques de mas, no pongas advertencias generales. " +
  "Si te piden una medida, especificacion o dato tecnico, responde solo con el dato exacto si lo sabes. " +
  "Si no tienes certeza real, di solo: no tengo el dato exacto. " +
  "No inventes medidas, no uses frases como depende de la configuracion salvo que sea estrictamente necesario y pedido por el usuario.";

function getSupportedMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function AsistenteMecanico() {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState("");

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hola. Soy el asistente de Rectificadora Mindiocar. Que motor estas trabajando hoy?",
    },
  ]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading && !listening && !transcribing,
    [input, loading, listening, transcribing]
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, listening, expanded, transcribing]);

  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
      mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop());
    };
  }, []);

  const startMic = async () => {
    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError("Este navegador no soporta grabacion de audio desde esta pagina.");
      return;
    }

    if (navigator.onLine === false) {
      setMicError("No hay conexion a internet para transcribir el audio.");
      return;
    }

    setMicError("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setListening(false);
        setMicError("No se pudo grabar el audio.");
      };

      recorder.onstop = async () => {
        setListening(false);
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (!chunks.length) {
          setMicError("No se detecto audio para transcribir.");
          return;
        }

        setTranscribing(true);

        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
          const file = new File([blob], `consulta.${extension}`, { type: blob.type || "audio/webm" });
          const formData = new FormData();
          formData.append("file", file);

          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 45000);
          const res = await fetch("/api/asistente/transcribir", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          window.clearTimeout(timeoutId);

          const raw = await res.text();
          let data = {};
          try {
            data = raw ? JSON.parse(raw) : {};
          } catch {
            throw new Error("La transcripcion no llego en un formato valido.");
          }

          if (!res.ok) {
            throw new Error(data?.error || "No se pudo transcribir el audio.");
          }

          const dictated = String(data?.text || "").trim();
          if (!dictated) {
            throw new Error("No se detecto texto en el audio.");
          }

          setInput((prev) => {
            const base = prev.trim();
            return base ? `${base} ${dictated}` : dictated;
          });
        } catch (error) {
          const isAbort = error?.name === "AbortError";
          setMicError(isAbort ? "La transcripcion tardo demasiado." : error?.message || "Fallo al transcribir el audio.");
        } finally {
          setTranscribing(false);
          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }
      };

      recorder.start();
      setListening(true);
    } catch {
      setListening(false);
      setMicError("No diste permiso al microfono o el microfono no esta disponible.");
    }
  };

  const stopMic = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    try {
      recorder.stop();
    } catch {}
  };

  const toggleMic = () => {
    if (listening) stopMic();
    else startMic();
  };

  const clearChat = () => {
    stopMic();
    setInput("");
    setMicError("");
    setMessages([
      {
        role: "assistant",
        content: "Listo. Empecemos de nuevo. Que necesitas revisar del motor?",
      },
    ]);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || listening || transcribing) return;

    setLoading(true);
    setInput("");

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: "system", content: SYSTEM_HINT }, ...nextMessages],
        }),
      });

      window.clearTimeout(timeoutId);
      const raw = await res.text();
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("La respuesta del asistente no llego en un formato valido.");
      }

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
      const isAbort = error?.name === "AbortError";
      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      const detail = isAbort
        ? "La consulta tardo demasiado."
        : isOffline
        ? "No hay conexion a internet."
        : error?.message || "Error desconocido";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `No pude responder ahora.\n\nDetalle: ${detail}`,
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
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={expanded ? "fixed inset-0 z-50 bg-stone-100 p-3 md:p-6" : "max-w-5xl mx-auto p-4 md:p-8"}>
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-stone-200 bg-white">
          <div>
            <div className="text-xs uppercase tracking-widest font-black text-stone-500">Asistente AI</div>
            <div className="text-xl md:text-2xl font-black text-stone-900">
              Rectificadora <span className="text-yellow-400">Mindiocar</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-white hover:bg-stone-800 font-semibold"
            title={expanded ? "Salir de pantalla completa" : "Expandir"}
          >
            {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        <div className="p-4 md:p-6">
          <div
            ref={listRef}
            className="h-[55vh] md:h-[60vh] overflow-y-auto mb-4 bg-white rounded-xl p-3 border border-stone-100"
          >
            {messages.map((msg, i) => (
              <div key={i} className={"mb-3 flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
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
                  Grabando audio...
                </div>
              </div>
            )}

            {transcribing && (
              <div className="mb-3 flex justify-start">
                <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm bg-yellow-50 text-stone-800 border border-yellow-300 whitespace-pre-wrap">
                  Transcribiendo audio...
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
              disabled={listening || transcribing}
              className="flex-1 resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-stone-100 disabled:text-stone-500"
              placeholder={
                listening
                  ? "Grabando..."
                  : transcribing
                  ? "Transcribiendo audio..."
                  : "Escribe tu pregunta... (Ctrl+Enter o Cmd+Enter envia, Enter salto de linea)"
              }
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                disabled={transcribing || loading}
                className={
                  "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50 " +
                  (listening ? "ring-2 ring-yellow-400 animate-pulse" : "")
                }
                title={listening ? "Detener microfono" : "Hablar por microfono"}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                type="button"
                onClick={clearChat}
                disabled={listening || transcribing || loading}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50"
                title="Limpiar chat"
              >
                <Trash2 size={18} />
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
        </div>
      </div>
    </div>
  );
}
