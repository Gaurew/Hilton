export type EventConversationPreview = {
  id: string;
  eventName: string;
  propertyName: string;
  eventDate: string;
};

export type WeddingProfile = {
  id: string;
  eventId: string;
  eventCode: string;
  coupleName: string;
  venueName: string;
  venueDisplayName: string;
  bookingStartDate: string;
  bookingEndDate: string;
  weddingDate: string;
  guestCount: number;
  tableSize: number;
  shuttleCapacityPerCoach: number;
  vendorCrewMeals: number;
  stylingHeadcount: number;
  rooms: number;
  roomNights: number;
  dinnerTables: number;
  guestCountWithBuffer: number;
  meals: number;
  brunchGuests: number;
  requiredShuttles: number;
  requiredSecurityOfficerHours: number;
  totalEstimatedCost: number;
  rawSource: Record<string, unknown> | null;
};

export type ScheduleItem = {
  id: string;
  sortOrder: number;
  scheduleDate: string;
  displayTime: string;
  startTime: string;
  endTime: string | null;
  eventName: string;
  space: string;
  attendees: number;
  dependencies: string | null;
};

export type VendorService = {
  id: string;
  sortOrder: number;
  category: string;
  confirmedVendor: string;
  confirmedScope: string;
  pricingBasis: string;
  unitRate: number;
  confirmedQty: number;
  estimatedCost: number;
  dependencyFormulaDriver: string | null;
  latestChangeCutoff: string | null;
  changeRipple: string | null;
};

export type ManagedEventCard = {
  id: string;
  slug: string;
  name: string;
  property: string;
  date: string;
  eventDateRaw: string | null;
  metric: string;
  delta: string;
  status: string;
  updated: string;
  tone: "emerald" | "amber" | "sky" | "slate";
  coupleName?: string | null;
  eventCode?: string | null;
  totalCost?: number | null;
};

export type EventPlanRevision = {
  id: string;
  revisionNumber: number;
  status: "baseline" | "approved";
  effectiveAt: string;
  summary: string;
  planSnapshot: Record<string, unknown>;
};

export type EventMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type GeneratedAsset = {
  id: string;
  name: string;
  mimeType: "application/pdf";
  url: string;
};
