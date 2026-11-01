import { Message, SourceSite } from "../shared/types";

export interface SiteAdapter {
  site: SourceSite;
  matches(url: URL): boolean;
  getConversationId(url: URL): string | null;
  getMessageElements(): HTMLElement[];
  readMessage(el: HTMLElement, index: number): Message;
  getInputElement(): HTMLElement | null;
  insertText(input: HTMLElement, text: string): boolean;
  newChatUrl(): string;
  getChatTitle?(): string | null;
  getChatContainer?(): HTMLElement | null;
}

