// Shapes returned by the public share-link endpoints. They mirror the
// Asteroid OpenAPI spec at https://odyssey.asteroid.ai/agents/public_v2/openapi.yaml.

export type FieldType =
  | "username"
  | "email"
  | "url"
  | "phone"
  | "text"
  | "password"
  | "hidden"
  | "totp_seed"
  | "api_key"
  | "card_number"
  | "card_expiry"
  | "card_cvv"
  | "cardholder_name";

export type ItemKind = "login" | "api_key" | "card" | "custom";

export type ShareLinkStatus = "pending" | "completed" | "expired" | "revoked";

export type FieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  hint?: string;
};

export type TemplateStep = {
  key: string;
  title: string;
  /** Markdown. */
  instructions?: string;
  fieldKeys: string[];
};

export type PublicShareLink = {
  title: string;
  description?: string;
  requesterOrgName: string;
  kind: ItemKind;
  fields: FieldSpec[];
  steps: TemplateStep[];
  status: ShareLinkStatus;
  expiresAt: string;
};

export type FieldValue = { key: string; value: string };
