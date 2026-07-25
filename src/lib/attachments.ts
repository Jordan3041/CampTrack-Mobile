import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

import type { IconName } from "@/components/ui/Icon";

export type PendingAttachment = { name: string; url?: string; data?: string };

// Mirrors fileToDataURL() + the 15MB guard in CampTrack/js/maintenance.js.
export async function pickAttachments(): Promise<PendingAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*", "application/msword", "application/vnd.ms-excel", "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  const out: PendingAttachment[] = [];
  for (const asset of result.assets) {
    if ((asset.size || 0) > 15 * 1024 * 1024) continue;
    try {
      const file = new File(asset.uri);
      const base64 = await file.base64();
      const mime = asset.mimeType || "application/octet-stream";
      out.push({ name: asset.name, data: `data:${mime};base64,${base64}` });
    } catch (_) {
      /* skip unreadable file */
    }
  }
  return out;
}

export function fileKindIcon(name: string): IconName {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "document";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext)) return "wordDoc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "spreadsheet";
  return "attachment";
}
