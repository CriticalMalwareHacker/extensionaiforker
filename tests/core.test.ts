import { describe, it, expect } from "vitest";
import { buildForkMessage, formatMessageForContext } from "../src/core/primer";
import { estimateTokens, checkTokenLimits } from "../src/core/tokens";
import { prepareCompaction, fallbackSummarize } from "../src/core/compact";
import { buildMergeInsertText, getBranchExclusiveMessages } from "../src/core/merge";
import { Message } from "../src/shared/types";

describe("Core Utilities", () => {
  const sampleMessages: Message[] = [
    {
      index: 0,
      role: "user",
      text: "How do I build a scalable queue in Redis?",
    },
    {
      index: 1,
      role: "assistant",
      text: "You can use Redis Streams or Lists with BRPOP.",
      codeBlocks: [{ lang: "bash", code: "XADD mystream * sensor-id 1234 temperature 19.8" }],
    },
    {
      index: 2,
      role: "user",
      text: "What about dead letter queues?",
      hasAttachments: true,
    },
    {
      index: 3,
      role: "assistant",
      text: "Store failed items in a separate dlq stream after N retries.",
    },
  ];

  describe("Primer & Context Builder", () => {
    it("formats message turns with code blocks and attachment warnings", () => {
      const formatted = formatMessageForContext(sampleMessages[2]);
      expect(formatted).toContain("[User]");
      expect(formatted).toContain("dead letter queues");
      expect(formatted).toContain("attachment or image that could not be transferred");
    });

    it("builds the complete fork message with context delimiters", () => {
      const result = buildForkMessage(sampleMessages);
      expect(result.fullText).toContain("<<FORKLINE CONTEXT START>>");
      expect(result.fullText).toContain("<<FORKLINE CONTEXT END>>");
      expect(result.fullText).toContain("Reply with only \"Ready.\"");
      expect(result.contextText).toContain("XADD mystream");
    });

    it("respects excluded indexes", () => {
      const result = buildForkMessage(sampleMessages, { excludedIndexes: [1] });
      expect(result.contextText).not.toContain("XADD mystream");
      expect(result.contextText).toContain("dead letter queues");
    });
  });

  describe("Token Estimation", () => {
    it("estimates tokens based on characters and words", () => {
      const text = "Hello world! This is a test of token estimation.";
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(30);
    });

    it("flags threshold warnings when text is large", () => {
      const hugeText = "word ".repeat(7000);
      const status = checkTokenLimits(hugeText, "chatgpt");
      expect(status.exceedsWarning).toBe(true);
    });
  });

  describe("Compaction", () => {
    it("partitions older turns and preserves code blocks", () => {
      const manyMessages: Message[] = Array.from({ length: 10 }, (_, i) => ({
        index: i,
        role: i % 2 === 0 ? "user" : "assistant",
        text: `Message content turn ${i}`,
        codeBlocks: i === 1 ? [{ lang: "py", code: "print('keep me')" }] : undefined,
      }));

      const plan = prepareCompaction(manyMessages, 4);
      expect(plan.recentMessages.length).toBe(4);
      expect(plan.olderMessages.length).toBe(6);
      expect(plan.preservedCodeBlocks.length).toBe(1);
      expect(plan.preservedCodeBlocks[0].code).toBe("print('keep me')");

      const summary = fallbackSummarize(plan);
      expect(summary).toContain("Digest of 6 earlier turns");
      expect(summary).toContain("print('keep me')");
    });
  });

  describe("Merge", () => {
    it("filters messages created after fork point", () => {
      const exclusive = getBranchExclusiveMessages(sampleMessages, 1);
      expect(exclusive.length).toBe(2);
      expect(exclusive[0].index).toBe(2);
      expect(exclusive[1].index).toBe(3);
    });

    it("formats merge insert text", () => {
      const text = buildMergeInsertText("Resolved the Redis DLQ design with Redis Streams", "DLQ exploration");
      expect(text).toContain("[Update from side branch: \"DLQ exploration\"]");
      expect(text).toContain("Resolved the Redis DLQ design with Redis Streams");
    });
  });
});

