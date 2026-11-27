export type LangCode = "ja" | "cn" | "en";
export type TrilingualTuple = [ja: string, cn: string, en: string];
export type MessageKind = "warning" | "request" | "other";

export interface ParadigmItem {
  kind: MessageKind;
  text: string;
  label?: TrilingualTuple;
  isOther?: boolean;
}

export interface ParadigmGroup {
  label: TrilingualTuple;
  items: ParadigmItem[];
}

export interface StandingReply {
  label: TrilingualTuple;
  kind: MessageKind;
  text: string;
}

export interface SiteCopy {
  version: string;
  siteName: Record<LangCode, string>;
  footerDeclaration: Record<LangCode, string>;
  brandAssets: {
    adminDashPuff: string;
  };
}
