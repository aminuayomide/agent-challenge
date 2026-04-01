import { type Plugin, type Action, type IAgentRuntime, type Memory, type State, type HandlerCallback } from "@elizaos/core";
import { character } from "./character";

const helloAction: Action = {
  name: "HELLO_IDEAMINER",
  description: "Confirms IdeaMiner plugin is loaded and working.",
  similes: ["PING", "TEST", "STATUS"],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => true,
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    if (callback) {
      await callback({ text: "IdeaMiner is online. Ready to scan for opportunities." });
    }
  },
  examples: [
    [
      { name: "user", content: { text: "are you working?" } },
      { name: "IdeaMiner", content: { text: "IdeaMiner is online. Ready to scan for opportunities." } },
    ],
  ],
};

export const customPlugin: Plugin = {
  name: "plugin-ideaminer",
  description: "IdeaMiner — scans the web for problems worth solving",
  actions: [helloAction],
  providers: [],
  evaluators: [],
};

export { character };
export default customPlugin;