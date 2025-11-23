import {
  gemini,
  openai,
  createAgent,
  createTool,
  createNetwork,
  type Message,
  createState,
  type Tool,
} from "@inngest/agent-kit";

import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import {
  getSandbox,
  lastAssistantTextMessageContent,
  parseAgentOutput,
} from "./utils";
import z from "zod";
import {
  PROMPT,
  FRAGMENT_TITLE_PROMPT,
  RESPONSE_PROMPT,
} from "@/prompt";
import { prisma } from "@/lib/db";

interface AgentState {
  summary: string;
  files: { [path: string]: string };
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },

  async ({ event, step }) => {
    console.log("Code Agent Function Started");

    // ---------------------
    // SANDBOX
    // ---------------------
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-nextjs-testyash-2");
      await sandbox.setTimeout(60_000 * 30);
      return sandbox.sandboxId;
    });

    // ---------------------
    // PREVIOUS MESSAGES
    // ---------------------
    const previousMessages = await step.run(
      "get-previous-messages",
      async () => {
        const formattedMessages: Message[] = [];

        const messages = await prisma.message.findMany({
          where: { projectId: event.data.projectId },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        for (const message of messages) {
          formattedMessages.push({
            type: "text",
            role: message.role === "ASSISTANT" ? "assistant" : "user",
            content: message.content,
          });
        }

        return formattedMessages.reverse();
      }
    );

    const state = createState<AgentState>(
      {
        summary: "",
        files: {},
      },
      { messages: previousMessages }
    );

    // ---------------------
    // CODE AGENT
    // ---------------------
    const codeAgent = createAgent<AgentState>({
      name: "code-agent",
      description: "An expert coding agent",
      system: PROMPT,

      model: openai({
        model: "deepseek/deepseek-chat",
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: "https://openrouter.ai/api/v1",
      }),

      tools: [
        // ------------------------
        // TERMINAL TOOL
        // ------------------------
        createTool({
          name: "terminal",
          description: "Run terminal commands in the sandbox",
          parameters: z.object({
            command: z.string(),
          }),

          // UPDATED: Destructuring step from options
          handler: async ({ command }) => {
            return await step.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (d: string) => {
                    buffers.stdout += d;
                  },
                  onStderr: (d: string) => {
                    buffers.stderr += d;
                  },
                });
                return result.stdout;
              } catch (e) {
                return `command failed: ${e}\nstdout:${buffers.stdout}\nstderr:${buffers.stderr}`;
              }
            });
          },
        }),

        // ------------------------
        // WRITE FILE TOOL
        // ------------------------
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            ),
          }),

          handler: async (
            { files },
            { network }: Tool.Options<AgentState>
          ) => {
            const newFiles = await step.run(
              "create-or-update-files",
              async () => {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId);

                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }

                return updatedFiles;
              }
            );

            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),

        // ------------------------
        // READ FILE TOOL
        // ------------------------
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),

          handler: async ({ files }) => {
            return await step.run("read-files", async () => {
              const sandbox = await getSandbox(sandboxId);
              const contents = [];
              for (const file of files) {
                const content = await sandbox.files.read(file);
                contents.push({ path: file, content });
              }
              return JSON.stringify(contents);
            });
          },
        }),
      ],

      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (
            lastAssistantMessageText &&
            network &&
            lastAssistantMessageText.includes("<task_summary>")
          ) {
            network.state.data.summary = lastAssistantMessageText;
          }

          return result;
        },
      },
    });

    // ---------------------
    // NETWORK
    // ---------------------
    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      defaultState: state,

      router: async ({ network }) => {
        const summary = network.state.data.summary;

        if (summary) {
          return;
        }

        return codeAgent;
      },
    });

    // ---------------------
    // RUN NETWORK
    // ---------------------
    // BREAKING CHANGE: network.run(value)
    const result = await network.run(event.data.value);

    // ---------------------
    // TITLE + RESPONSE AGENTS
    // ---------------------
    const fragmentTitleGenerator = createAgent({
      name: "fragment-title-generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: gemini({ model: "gemini-2.5-flash" }),
    });

    const responseGenerator = createAgent({
      name: "response-generator",
      system: RESPONSE_PROMPT,
      model: gemini({ model: "gemini-2.5-flash" }),
    });

    const { output: fragmentTitleOutput } =
      await fragmentTitleGenerator.run(result.state.data.summary);

    const { output: responseOutput } =
      await responseGenerator.run(result.state.data.summary);

    // ---------------------
    // ERROR CHECK
    // ---------------------
    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    // ---------------------
    // SAVE TO DB
    // ---------------------
    await step.run("save-to-db", async () => {
      if (isError) {
        return prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong. Please try again",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }

      return prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: parseAgentOutput(responseOutput),
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl,
              title: parseAgentOutput(fragmentTitleOutput),
              files: result.state.data.files,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
      title: "Fragments",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  }
);
