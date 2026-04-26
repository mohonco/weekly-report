import Papa from "papaparse";

export interface WorkRow {
  섹션: string;
  상태: string;
  구분: string;
  고객사명: string;
  프로젝트명: string;
  착수: string;
  마감: string;
  weeks: Record<string, string>; // key: YYYY-MM-DD, value: 업무내용
}

export interface ParsedSheet {
  rows: WorkRow[];
  weekKeys: string[]; // sorted desc (최신 주차 먼저)
}

const META_COLS = ["섹션", "상태", "구분", "고객사명", "프로젝트명", "착수", "마감"];

function isWeekKey(col: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(col.trim());
}

export function formatWeekLabel(key: string): string {
  const date = new Date(key);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  // 해당 주 월~금 범위 계산
  const friday = new Date(date);
  friday.setDate(date.getDate() + 4);
  const fMonth = friday.getMonth() + 1;
  const fDay = friday.getDate();
  // 몇째 주인지 계산
  const weekNum = Math.ceil(date.getDate() / 7);
  return `${month}월 ${weekNum}주 (${month}/${day}-${fMonth}/${fDay})`;
}

export async function fetchSheet(): Promise<ParsedSheet> {
  const url = process.env.NEXT_PUBLIC_SHEET_CSV_URL!;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const weekKeys = headers
    .filter(isWeekKey)
    .sort((a, b) => (a < b ? 1 : -1)); // 최신 먼저

  const rows: WorkRow[] = parsed.data
    .filter((r) => r["섹션"]?.trim())
    .map((r) => {
      const weeks: Record<string, string> = {};
      weekKeys.forEach((k) => {
        weeks[k] = r[k]?.trim() ?? "";
      });
      return {
        섹션: r["섹션"]?.trim() ?? "",
        상태: r["상태"]?.trim() ?? "",
        구분: r["구분"]?.trim() ?? "",
        고객사명: r["고객사명"]?.trim() ?? "",
        프로젝트명: r["프로젝트명"]?.trim() ?? "",
        착수: r["착수"]?.trim() ?? "",
        마감: r["마감"]?.trim() ?? "",
        weeks,
      };
    });

  return { rows, weekKeys };
}
