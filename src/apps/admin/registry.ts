import type { TrilingualTuple } from "@data/index";

export type AdminModuleGroup = "core" | "content";

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
  { id: "core", label: ["ご本人様メニュー", "本人优先操作", "Artist Desk"] },
  { id: "content", label: ["表示設定・資料", "展示设置与资料", "Display & Archive"] },
];

export const ADMIN_MODULES: AdminModuleDef[] = [
  {
    id: "publication",
    group: "core",
    label: ["公開状態・連絡先", "网站公开与直通", "Site Status & Contact"],
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
    label: ["表示設定・バックアップ", "显示设置与备份", "Visibility & Backup"],
    mountId: "panel-site-controls",
    apiNamespace: "/api/owner/action, /api/owner/flags",
    kvKey: "hide_r18, custom_notice, flags_v1",
    iconPath: "M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6",
    mode: "active"
  },
  {
    id: "catalog-archive",
    group: "content",
    label: ["統計アーカイブ", "统计档案", "Catalog Archive"],
    mountId: "panel-catalog-archive",
    apiNamespace: "Private Reports",
    kvKey: null,
    iconPath: "M3 3v18h18M7 16v-5m5 5V8m5 8v-3",
    mode: "active"
  }
];
