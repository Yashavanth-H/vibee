import { gemini, createAgent } from "@inngest/agent-kit"
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  
  async ({ event }) => {

    const summarizer = createAgent({
      name: "summarizer",
      system: "You are an expert summarizer.  You summarize in two words.",
      model: gemini({ model:"gemini-2.5-pro"}),
    });

    const { output } = await summarizer.run(
    `Summarize the following the text: ${event.data.value}`,
    );

    console.log(output);

    return { output };
  },
);