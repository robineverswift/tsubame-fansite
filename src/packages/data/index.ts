import paradigmsJson from "./paradigms.json";
import standingReplyJson from "./standing-reply.json";
import siteCopyJson from "./site-copy.json";
import type { ParadigmGroup, StandingReply, SiteCopy } from "./types";

export * from "./types";
export const PARADIGM_GROUPS: ParadigmGroup[] = paradigmsJson as ParadigmGroup[];
export const STANDING_REPLY: StandingReply = standingReplyJson as StandingReply;
export const SITE_COPY: SiteCopy = siteCopyJson as SiteCopy;
