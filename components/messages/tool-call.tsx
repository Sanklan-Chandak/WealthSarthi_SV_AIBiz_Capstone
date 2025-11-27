import { ToolCallPart, ToolResultPart } from "ai";
import { Book, Globe, Search, Presentation, Wrench } from "lucide-react";
import { Shimmer } from "../ai-elements/shimmer";

export interface ToolDisplay {
    call_label: string;
    call_icon: React.ReactNode;
    result_label: string;
    result_icon: React.ReactNode;
    formatArgs?: (toolName: string, input: unknown) => string;
};

function formatWebSearchArgs(_: string, input: unknown): string {
    try {
        if (typeof input !== 'object' || input === null) {
            return "";
        }
        const args = input as Record<string, unknown>;
        return args.query ? String(args.query) : "";
    } catch {
        return "";
    }
}

const TOOL_DISPLAY_MAP: Record<string, ToolDisplay> = {
    webSearch: {
        call_label: "Searching the web",
        call_icon: <Search className="w-4 h-4" />,
        result_label: "Searched the web",
        result_icon: <Search className="w-4 h-4" />,
        formatArgs: formatWebSearchArgs,
    },
  mutualFundNav: {
    call_label: "Fetching mutual fund NAV",
    call_icon: <Book className="w-4 h-4" />,
    result_label: "Fetched mutual fund NAV",
    result_icon: <Book className="w-4 h-4" />,
  },
  nseStockQuote: {
    call_label: "Fetching NSE stock quote",
    call_icon: <Globe className="w-4 h-4" />,
    result_label: "Fetched NSE stock quote",
    result_icon: <Globe className="w-4 h-4" />,
  },
  nseIndexQuote: {
    call_label: "Fetching index quote",
    call_icon: <Presentation className="w-4 h-4" />,
    result_label: "Fetched index quote",
    result_icon: <Presentation className="w-4 h-4" />,
  },
  goldPriceInInr: {
    call_label: "Fetching gold price",
    call_icon: <Coins className="w-4 h-4" />,
    result_label: "Fetched gold price",
    result_icon: <Coins className="w-4 h-4" />,
  },
  fxRateInrTo: {
    call_label: "Fetching FX rate",
    call_icon: <Globe className="w-4 h-4" />,
    result_label: "Fetched FX rate",
    result_icon: <Globe className="w-4 h-4" />,
  },
  cryptoPriceInInr: {
    call_label: "Fetching crypto price",
    call_icon: <Globe className="w-4 h-4" />,
    result_label: "Fetched crypto price",
    result_icon: <Globe className="w-4 h-4" />,
  },
  globalStockQuote: {
    call_label: "Fetching global stock quote",
    call_icon: <Globe className="w-4 h-4" />,
    result_label: "Fetched global stock quote",
    result_icon: <Globe className="w-4 h-4" />,
  },
  mutualFundMeta: {
    call_label: "Fetching mutual fund details",
    call_icon: <Book className="w-4 h-4" />,
    result_label: "Fetched mutual fund details",
    result_icon: <Book className="w-4 h-4" />,
  },
  yahooFinanceQuote: {
    call_label: "Fetching Yahoo Finance quote",
    call_icon: <Globe className="w-4 h-4" />,
    result_label: "Fetched Yahoo Finance quote",
    result_icon: <Globe className="w-4 h-4" />,
  },
};

const DEFAULT_TOOL_DISPLAY: ToolDisplay = { call_label: "Using tool", call_icon: <Wrench className="w-4 h-4" />, result_label: "Used tool", result_icon: <Wrench className="w-4 h-4" /> };

function extractToolName(part: ToolCallPart | ToolResultPart): string | undefined {
    const partWithType = part as unknown as { type?: string; toolName?: string };
    if (partWithType.type && partWithType.type.startsWith("tool-")) {
        return partWithType.type.slice(5);
    }
    if (partWithType.toolName) {
        return partWithType.toolName;
    }
    if ('toolName' in part && part.toolName) {
        return part.toolName;
    }
    return undefined;
}

function formatToolArguments(toolName: string, input: unknown, toolDisplay?: ToolDisplay): string {
    if (toolDisplay?.formatArgs) {
        return toolDisplay.formatArgs(toolName, input);
    }

    try {
        if (typeof input !== 'object' || input === null) {
            return String(input);
        }

        const args = input as Record<string, unknown>;
        if (args.query) {
            return String(args.query);
        }
        return "Arguments not available";
    } catch {
        return "Arguments not available";
    }
}

export function ToolCall({ part }: { part: ToolCallPart }) {
    const { input } = part;
    const toolName = extractToolName(part);
    const toolDisplay = toolName ? (TOOL_DISPLAY_MAP[toolName] || DEFAULT_TOOL_DISPLAY) : DEFAULT_TOOL_DISPLAY;
    const formattedArgs = formatToolArguments(toolName || "", input, toolDisplay);

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                {toolDisplay.call_icon}
                <Shimmer duration={1}>{toolDisplay.call_label}</Shimmer>
            </div>
            {toolDisplay.formatArgs && formattedArgs && (
                <span className="text-muted-foreground/75 flex-1 min-w-0 truncate">
                    {formattedArgs}
                </span>
            )}
        </div >
    );
}

export function ToolResult({ part }: { part: ToolResultPart }) {
    const { output } = part;
    const toolName = extractToolName(part);
    const toolDisplay = toolName ? (TOOL_DISPLAY_MAP[toolName] || DEFAULT_TOOL_DISPLAY) : DEFAULT_TOOL_DISPLAY;

    const input = 'input' in part ? part.input : undefined;
    const formattedArgs = input !== undefined ? formatToolArguments(toolName || "", input, toolDisplay) : "";

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                {toolDisplay.result_icon}
                <span>{toolDisplay.result_label}</span>
            </div>
            {toolDisplay.formatArgs && formattedArgs && (
                <span className="text-muted-foreground/75 flex-1 min-w-0 truncate">
                    {formattedArgs}
                </span>
            )}
        </div>
    );
}   
