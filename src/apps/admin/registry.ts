import type { TrilingualTuple } from "@data/index";

export type AdminModuleGroup = "archive" | "core" | "content";

export interface AdminModuleDef {
  id: string;
  group: AdminModuleGroup;
  label: TrilingualTuple;
  mountId: string;
  apiNamespace: string;
  kvKey: string | null;
  badgeId?: string;
  iconPath: string;
  mode: "active" | "slot";
}

export const ADMIN_GROUPS: { id: AdminModuleGroup; label: TrilingualTuple }[] = [
  { id: "archive", label: ["収録データ・資料", "收录数据与资料", "Catalog & Data"] },
  { id: "core", label: ["ご本人様メニュー", "本人优先操作", "Artist Desk"] },
  { id: "content", label: ["表示設定・ソース", "展示设置与源码", "Display & Source"] },
];

export const ADMIN_MODULES: AdminModuleDef[] = [
  {
    id: "overview",
    group: "archive",
    label: ["収録データの概要", "收录数据概览", "Catalog Overview"],
    mountId: "panel-overview",
    apiNamespace: "/data/*",
    kvKey: null,
    iconPath: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    mode: "active"
  },
  {
    id: "upcoming",
    group: "archive",
    label: ["発売予定一覧", "发售预定一览", "Upcoming Releases"],
    mountId: "panel-upcoming",
    apiNamespace: "/data/upcoming.json",
    kvKey: null,
    badgeId: "nav-badge-upcoming",
    iconPath: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    mode: "active"
  },
  {
    id: "catalog-archive",
    group: "archive",
    label: ["統計アーカイブ", "统计档案", "Catalog Archive"],
    mountId: "panel-catalog-archive",
    apiNamespace: "Drive Private Archive",
    kvKey: null,
    iconPath: "M3 3v18h18M7 16v-5m5 5V8m5 8v-3",
    mode: "active"
  },
  {
    id: "publication",
    group: "core",
    label: ["公開状態・直通連絡", "网站公开与直通", "Site Status & Contact"],
    mountId: "panel-publication",
    apiNamespace: "/api/owner/action",
    kvKey: "kill_switch",
    iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    mode: "active"
  },
  {
    id: "messages",
    group: "core",
    label: ["連絡ボックス", "联络信箱", "Messages"],
    mountId: "panel-messages",
    apiNamespace: "/api/owner/message",
    kvKey: "messages_v1",
    badgeId: "nav-badge-messages",
    iconPath: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    mode: "active"
  },
  {
    id: "site-controls",
    group: "content",
    label: ["公開制御・バックアップ", "显示开关与源码包", "Toggles & Backup"],
    mountId: "panel-site-controls",
    apiNamespace: "/api/owner/action, /api/owner/flags",
    kvKey: "hide_r18, custom_notice, flags_v1",
    iconPath: "M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6",
    mode: "active"
  },
  {
    id: "milestones",
    group: "content",
    label: ["記念日の表示設定", "纪念日卡片设置", "Milestones Data"],
    mountId: "panel-milestones",
    apiNamespace: "/api/owner/milestones",
    kvKey: "milestones_v1",
    badgeId: "nav-badge-milestones",
    iconPath: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    mode: "active"
  }
];
