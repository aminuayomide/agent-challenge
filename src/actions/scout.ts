import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
} from "@elizaos/core";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
}

async function searchTavily(
  query: string,
  apiKey: string,
  options: { domains?: string[]; days?: number } = {}
): Promise<TavilyResponse> {
  const body: Record<string, unknown> = {
    query,
    max_results: 8,
    search_depth: "basic",
    include_answer: true,
  };
  if (options.domains) body.include_domains = options.domains;
  if (options.days) body.days = options.days;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Tavily error: ${response.status}`);
  }
  return response.json() as Promise<TavilyResponse>;
}

function extractTopic(text: string): string {
  const lower = text.toLowerCase();
  const triggers = [
    "find problems in",
    "scan for problems in",
    "what problems in",
    "problems in",
    "issues in",
    "pain points in",
    "complaints about",
    "find opportunities in",
  ];
  for (const trigger of triggers) {
    if (lower.includes(trigger)) {
      return text.slice(lower.indexOf(trigger) + trigger.length).trim();
    }
  }
  return text.replace(/find|scan|search|problems|issues|pain points/gi, "").trim();
}

function scoreOpportunity(results: TavilyResult[]): number {
  const count = results.length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / (count || 1);
  return Math.min(10, Math.round((count * 0.5 + avgScore * 5) * 10) / 10);
}

export const scoutAction: Action = {
  name: "SCOUT_PROBLEMS",
  description:
    "Scans Reddit, X, GitHub, news and the web for real problems people are experiencing in a given space. Returns a structured Opportunity Intelligence Report.",
  similes: [
    "FIND_PROBLEMS",
    "SCAN_PROBLEMS",
    "SEARCH_PROBLEMS",
    "FIND_OPPORTUNITIES",
    "MINE_IDEAS",
    "DISCOVER_PROBLEMS",
  ],
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();
    const hasApiKey = !!runtime.getSetting("TAVILY_API_KEY");
    const hasTrigger =
      text.includes("problem") ||
      text.includes("issue") ||
      text.includes("pain point") ||
      text.includes("complaint") ||
      text.includes("opportunity") ||
      text.includes("find") ||
      text.includes("scan") ||
      text.includes("mine");
    return hasApiKey && hasTrigger;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    const apiKey = runtime.getSetting("TAVILY_API_KEY") as string;
if (!apiKey) {
      if (callback) {
        await callback({ text: "TAVILY_API_KEY is not configured. Please add it to your .env file." });
      }
      return;
    }

    const topic = extractTopic(message.content.text ?? "");

    if (callback) {
      await callback({
        text: `🔍 Scanning Reddit, X, GitHub and news sources for problems in **${topic}**...`,
      });
    }

    try {
      const [webResults, redditResults, xResults, githubResults, newsResults] =
        await Promise.allSettled([
          searchTavily(`${topic} problems complaints frustrations`, apiKey, { days: 30 }),
          searchTavily(`${topic} problems complaints`, apiKey, {
            domains: ["reddit.com"],
            days: 30,
          }),
          searchTavily(`${topic} frustrated annoyed broken`, apiKey, {
            domains: ["x.com", "twitter.com"],
            days: 14,
          }),
          searchTavily(`${topic} issue feature request`, apiKey, {
            domains: ["github.com"],
            days: 60,
          }),
          searchTavily(`${topic} problem challenge pain`, apiKey, { days: 7 }),
        ]);

      const allResults: TavilyResult[] = [];
      const sources: string[] = [];

      if (webResults.status === "fulfilled") {
        allResults.push(...webResults.value.results);
      }
      if (redditResults.status === "fulfilled" && redditResults.value.results.length > 0) {
        allResults.push(...redditResults.value.results);
        sources.push("Reddit");
      }
      if (xResults.status === "fulfilled" && xResults.value.results.length > 0) {
        allResults.push(...xResults.value.results);
        sources.push("X");
      }
      if (githubResults.status === "fulfilled" && githubResults.value.results.length > 0) {
        allResults.push(...githubResults.value.results);
        sources.push("GitHub");
      }
      if (newsResults.status === "fulfilled" && newsResults.value.results.length > 0) {
        allResults.push(...newsResults.value.results);
        sources.push("News");
      }

      if (sources.length === 0) sources.push("Web");

      const score = scoreOpportunity(allResults);
      const topResults = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const problemSummary =
        topResults.length > 0
          ? topResults
              .map((r) => `• ${r.title}`)
              .join("\n")
          : `• People are struggling with core ${topic} workflows`;

      const trend =
        score >= 8
          ? "🚀 Rapidly growing"
          : score >= 6
          ? "📈 Growing steadily"
          : "➡️ Stable signal";

      const report = `📊 **OPPORTUNITY INTELLIGENCE REPORT**

🔴 **Space scanned:** ${topic}
📍 **Platforms:** ${sources.join(", ")}
⚡ **Opportunity Score:** ${score} / 10
${trend}

**Top signals detected:**
${problemSummary}

🛠 **Things to build:**
- A tool that solves the most common ${topic} pain point
- An AI-powered assistant for ${topic} workflows
- A monitoring/alerting system for ${topic} issues

💡 *Ask me to go deeper on any of these signals.*`;

      if (callback) {
        await callback({ text: report });
      }
    } catch (error) {
      if (callback) {
        await callback({
          text: `❌ Scout failed: ${error instanceof Error ? error.message : "Unknown error"}. Check your TAVILY_API_KEY.`,
        });
      }
    }
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Find problems in fintech" },
      },
      {
        name: "IdeaMiner",
        content: {
          text: "🔍 Scanning Reddit, X, GitHub and news sources for problems in fintech...",
        },
      },
    ],
  ],
};

export default scoutAction;