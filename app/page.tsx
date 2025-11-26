"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader, ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import {
  AI_NAME,
  CLEAR_CHAT_TEXT,
  OWNER_NAME,
  WELCOME_MESSAGE,
} from "@/config";
import Image from "next/image";
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

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="w-full min-h-screen relative">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background/95 via-background/90 to-background/0 dark:from-slate-950/95 dark:via-slate-950/90 dark:to-slate-950/0 backdrop-blur-md pb-4 border-b border-border/60">
          <div className="relative">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center">
                <Avatar className="size-8 ring-1 ring-primary">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={36} height={36} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="tracking-tight text-sm font-semibold">
                    Chat with {AI_NAME}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    India-first personal finance copilot
                  </p>
                </div>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={clearChat}
                >
                  <Plus className="size-4" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* Main content */}
        <div className="px-5 py-4 w-full pt-[96px] pb-[150px]">
          <div className="flex flex-col items-center justify-start min-h-full">
            {isClient ? (
              <>
                {showIntro && (
                  <div className="w-full max-w-3xl mb-6 text-center text-sm text-muted-foreground space-y-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
                        Plan your dreams with{" "}
                        <span className="text-primary">{AI_NAME}</span>
                      </h1>
                      <p>
                        Ask anything about budgeting, SIPs, FDs, goals and money
                        basics in India. Wealth Sarthi explains without giving
                        stock tips or pushing products.
                      </p>
                    </div>
                    <div className="grid gap-2 w-full md:grid-cols-2">
                      {SUGGESTED_QUERIES.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleSuggestionClick(q)}
                          className="rounded-2xl border border-border bg-card/60 px-4 py-3 text-left text-xs md:text-sm text-foreground hover:border-primary/60 hover:bg-card transition"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
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
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom input + footer */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background/95 via-background/90 to-background/0 dark:from-slate-950/95 dark:via-slate-950/90 dark:to-slate-950/0 backdrop-blur-md pt-4">
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
                            className="h-12 pr-16 pl-5 bg-card/95 rounded-full border border-border/70 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary/70"
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full"
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
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
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
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {OWNER_NAME}&nbsp;
            <span className="hidden sm:inline">All rights reserved.&nbsp;</span>
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

