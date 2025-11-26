"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): {
  messages: UIMessage[];
  durations: Record<string, number>;
} => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error("Failed to load messages from localStorage:", error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (
  messages: UIMessage[],
  durations: Record<string, number>,
) => {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save messages to localStorage:", error);
  }
};

const SUGGESTED_QUERIES = [
  "Help me create a monthly budget for a ₹60,000 salary",
  "How much SIP per month to reach ₹10 lakh in 5 years at 12% returns?",
  "Explain the difference between FD, RD and SIP in simple terms",
  "I want to build an emergency fund. How much should I save?",
];

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  const stored =
    typeof window !== "undefined"
      ? loadMessagesFromStorage()
      : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  useEffect(() => {
    if (
      isClient &&
      initialMessages.length === 0 &&
      !welcomeMessageShownRef.current
    ) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const showIntro = messages.length <= 1;

  const handleSuggestionClick = (value: string) => {
    form.setValue("message", value);
    const el = document.getElementById(
      "chat-form-message",
    ) as HTMLInputElement | null;
    el?.focus();
  };

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-sky-50 via-slate-50 to-sky-100 text-slate-900">
      <main className="w-full min-h-screen relative">
        {/* Main content */}
        <div className="px-5 py-4 w-full pt-8 pb-[150px]">
          <div className="flex flex-col items-center justify-start min-h-full">
            {isClient ? (
              <>
                {showIntro && (
                  <div className="w-full max-w-3xl mb-6 text-center text-sm text-slate-600 space-y-4">
                    <div>
                      <h1 className="text-xl md:text-2xl font-medium text-slate-800">
                        Plan Your Dreams With
                      </h1>
                      <h2 className="text-3xl md:text-4xl font-extrabold mt-1 tracking-tight text-emerald-600">
                        Wealth Sarthi
                      </h2>
                      <p className="mt-3 text-sm md:text-base text-slate-600">
                        Take control of your budgeting, savings and investments
                        with our simple &amp; clear guidance.
                      </p>
                    </div>
                    <div className="grid gap-2 w-full md:grid-cols-2">
                      {SUGGESTED_QUERIES.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleSuggestionClick(q)}
                          className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm px-4 py-3 text-left text-xs md:text-sm text-slate-900 hover:border-emerald-400/80 hover:bg-white/90 transition"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Disclaimer: This assistant is for educational purposes
                      only. It does not provide personalized investment, tax, or
                      legal advice.
                    </p>
                  </div>
                )}

                <div className="w-full max-w-3xl">
                  <MessageWall
                    messages={messages}
                    status={status}
                    durations={durations}
                    onDurationChange={handleDurationChange}
                  />
                  {status === "submitted" && (
                    <div className="flex justify-start w-full mt-3">
                      <Loader2 className="size-4 animate-spin text-slate-500" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-slate-500" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom input + footer */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white/95 via-white/90 to-white/0 backdrop-blur-md pt-4 border-t border-slate-200/70">
          <div className="w-full px-5 pt-3 pb-1 items-center flex justify-center relative overflow-visible">
            <div className="message-fade-overlay" />
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel
                          htmlFor="chat-form-message"
                          className="sr-only"
                        >
                          Message
                        </FieldLabel>
                        <div className="relative h-13">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-12 pr-16 pl-5 bg-white rounded-full border border-slate-300 text-sm text-slate-900 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/70"
                            placeholder="Ask Wealth Sarthi about your money..."
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          {(status === "ready" || status === "error") && (
                            <Button
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-emerald-500 text-white hover:bg-emerald-400"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status === "streaming" ||
                            status === "submitted") && (
                            <Button
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-800 text-white hover:bg-slate-700"
                              size="icon"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-slate-500">
            © {new Date().getFullYear()} {OWNER_NAME}&nbsp;
            <span className="hidden sm:inline">
              All rights reserved.&nbsp;
            </span>
            <Link href="/terms" className="underline">
              Terms of Use
            </Link>
            &nbsp;Powered by{" "}
            <Link
              href="https://ringel.ai/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Ringel.AI
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}



