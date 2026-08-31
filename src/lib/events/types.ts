export type EventConversationPreview = {
  id: string;
  eventName: string;
  propertyName: string;
  eventDate: string;
};

export type EventMessage = {
  id: string;
  role: "visitor" | "agent";
  content: string;
  createdAt: string;
};

export type GeneratedAsset = {
  id: string;
  name: string;
  mimeType: "application/pdf";
  url: string;
};
