"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

interface WorkRow {
  섹션: string;
  상태: string;
  구분: string;
  고객사명: string;
  프로젝트명: string;
  착수: string;
  마감: string;
  weeks: Record<string, string>;
}

interface ParsedSheet {
  rows: WorkRow[];
  weekKeys: string[];
  title: string;
}

const SECTIONS = ["하이브리드러닝 제안", "하이브리드러닝 수행", "APL", "기타"];

const SECTION_COLORS: Record<string, { header: string }> = {
  "하이브리드러닝 제안": { header: "bg-[#7B3535] text-white" },
  "하이브리드러닝 수행": { header: "bg-[#5A3A7A] text-white" },
  APL:                  { header: "bg-[#2E4A7A] text-white" },
  기타:                 { header: "bg-[#3D5C3D] text-white" },
};

function formatDate(date: string): string {
  if (!date) return "";
  // YYYY-MM-DD
  const isoMatch = date.match(/\d{4}-(\d{2})-(\d{2})/);
  if (isoMatch) return `${Number(isoMatch[1])}/${Number(isoMatch[2])}`;
  // M. D 형식 (예: "4. 30")
  const kdMatch = date.match(/^(\d{1,2})\.\s*(\d{1,2})$/);
  if (kdMatch) return `${kdMatch[1]}/${kdMatch[2]}`;
  return date;
}

function isWeekKey(col: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(col.trim());
}

function formatWeekLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const friday = new Date(date);
  friday.setDate(date.getDate() + 4);
  const weekNum = Math.ceil(day / 7);
  const fm = friday.getMonth() + 1;
  const fd = friday.getDate();
  return `${month}월 ${weekNum}주 (${month}/${day}-${fm}/${fd})`;
}

const STATUS_STYLES: Record<string, string> = {
  진행중: "bg-emerald-50 text-emerald-700 border-emerald-200",
  완료:   "bg-gray-100 text-gray-500 border-gray-200",
  대기:   "bg-amber-50 text-amber-600 border-amber-200",
};

const GUBUN_STYLES: Record<string, string> = {
  결과대기: "bg-sky-50 text-sky-600 border-sky-200",
  수주:     "bg-blue-50 text-blue-700 border-blue-200",
  실주:     "bg-red-50 text-red-500 border-red-200",
  연간:     "bg-violet-50 text-violet-600 border-violet-200",
  단건:     "bg-orange-50 text-orange-600 border-orange-200",
  PMO:      "bg-indigo-50 text-indigo-600 border-indigo-200",
};

function StatusBadge({ status, gubun }: { status: string; gubun?: string }) {
  const statusStyle = STATUS_STYLES[status] ?? "bg-emerald-50 text-emerald-700 border-emerald-200";
  const gubunStyle = gubun ? (GUBUN_STYLES[gubun] ?? "bg-gray-50 text-gray-500 border-gray-200") : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`inline-block px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${statusStyle}`}>
        {status}
      </span>
      {gubun && gubunStyle && (
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${gubunStyle}`}>
          {gubun}
        </span>
      )}
    </div>
  );
}

function WeekCell({ content }: { content: string }) {
  if (!content) {
    return <td className="px-3 py-3 text-gray-300 text-sm align-top">—</td>;
  }
  const lines = content.split("\n").filter(Boolean);
  return (
    <td className="px-3 py-3 text-sm text-gray-700 align-top">
      <ul className="space-y-0.5">
        {lines.map((line, i) => (
          <li key={i} className="leading-snug">
            · {line}
          </li>
        ))}
      </ul>
    </td>
  );
}

function SectionTable({
  section,
  rows,
  currentWeek,
}: {
  section: string;
  rows: WorkRow[];
  currentWeek: string;
}) {
  const color = SECTION_COLORS[section] ?? { header: "bg-gray-700 text-white" };
  const hasGuestCol = rows.some((r) => r.고객사명);

  return (
    <div className="mb-8">
      <h2 className="text-[19px] font-bold mb-2 text-gray-800">{section}</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-[15px] border-collapse min-w-[700px]">
          <thead>
            <tr className={color.header}>
              <th className="px-3 py-2 text-center font-medium w-px">
                <div className="text-[11px] leading-tight whitespace-nowrap">
                  <div>구분1</div>
                  <div className="opacity-70">구분2</div>
                </div>
              </th>
              {hasGuestCol && (
                <th className="px-3 py-2 text-center font-medium w-36">고객사명</th>
              )}
              <th className="px-3 py-2 text-center font-medium w-[190px]">프로젝트명</th>
              <th className="px-3 py-2 text-center font-medium whitespace-nowrap w-px">착수</th>
              <th className="px-3 py-2 text-center font-medium w-60">추진 내용</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-t border-gray-100 ${
                  row.상태 === "완료"
                    ? "bg-gray-50 opacity-60"
                    : row.상태 === "대기"
                    ? "bg-amber-50/20 hover:bg-amber-50/40"
                    : "bg-white hover:bg-gray-50/60"
                }`}
              >
                <td className="px-3 py-3 align-top text-center">
                  <StatusBadge status={row.상태} gubun={row.구분 || undefined} />
                </td>
                {hasGuestCol && (
                  <td className="px-3 py-3 text-gray-700 align-top font-medium">{row.고객사명}</td>
                )}
                <td className={`px-3 py-3 text-gray-800 align-top font-bold whitespace-pre-line ${!hasGuestCol ? "text-center" : ""}`}>{row.프로젝트명}</td>
                <td className="px-3 py-3 text-gray-400 align-top text-sm whitespace-nowrap text-center">{formatDate(row.착수)}</td>
                <WeekCell content={row.weeks[currentWeek] ?? ""} />
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-gray-400">
                  데이터 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5분

function parseCSV(text: string): ParsedSheet {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const headers = parsed.meta.fields ?? [];
  const weekKeys = headers.filter(isWeekKey).sort((a, b) => (a < b ? 1 : -1));

  const configRow = parsed.data.find((r) => r["섹션"]?.trim() === "__설정__");
  const title = configRow?.["프로젝트명"]?.trim() || "주간 업무 현황";

  const rows: WorkRow[] = parsed.data
    .filter((r) => r["섹션"]?.trim() && r["섹션"]?.trim() !== "__설정__")
    .map((r) => {
      const weeks: Record<string, string> = {};
      weekKeys.forEach((k) => { weeks[k] = r[k]?.trim() ?? ""; });
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

  return { rows, weekKeys, title };
}

export default function DashboardPage() {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = (isManual = false) => {
    const url = process.env.NEXT_PUBLIC_SHEET_CSV_URL!;
    if (isManual) setRefreshing(true);
    fetch(`${url}&t=${Date.now()}`)
      .then((r) => r.text())
      .then((text) => {
        const data = parseCSV(text);
        setSheet(data);
        setSelectedWeek((prev) =>
          !prev || !data.weekKeys.includes(prev) ? (data.weekKeys[0] ?? prev) : prev
        );
        setLastUpdated(new Date());
        setError(null);
      })
      .catch(() => setError("구글 시트를 불러오지 못했습니다. URL을 확인해 주세요."))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gubun1Options = sheet ? [...new Set(sheet.rows.map((r) => r.상태).filter(Boolean))] : [];
  const gubun2Options = sheet ? [...new Set(sheet.rows.map((r) => r.구분).filter(Boolean))] : [];

  const sectionRows = (section: string) =>
    (sheet?.rows ?? []).filter((r) => {
      if (r.섹션 !== section) return false;
      if (statusFilter === "전체") return true;
      if (gubun1Options.includes(statusFilter)) return r.상태 === statusFilter;
      return r.구분 === statusFilter;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-white">
              {sheet?.title ?? "주간 업무 현황"}
            </h1>
            {lastUpdated && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                업데이트: {lastUpdated.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {sheet && sheet.weekKeys.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">주차</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="text-xs bg-transparent text-gray-300 focus:outline-none cursor-pointer"
                >
                  {sheet.weekKeys.map((k) => (
                    <option key={k} value={k} className="bg-gray-800 text-white">
                      {formatWeekLabel(k)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-px h-3 bg-gray-600" />

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500">구분</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-transparent text-gray-300 focus:outline-none cursor-pointer"
              >
                <option value="전체" className="bg-gray-800 text-white">전체</option>
                {gubun1Options.length > 0 && (
                  <optgroup label="구분1" className="bg-gray-800 text-gray-400">
                    {gubun1Options.map((s) => (
                      <option key={s} value={s} className="bg-gray-800 text-white">{s}</option>
                    ))}
                  </optgroup>
                )}
                {gubun2Options.length > 0 && (
                  <optgroup label="구분2" className="bg-gray-800 text-gray-400">
                    {gubun2Options.map((s) => (
                      <option key={s} value={s} className="bg-gray-800 text-white">{s}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <a
              href="https://docs.google.com/spreadsheets/d/1_opr1pCueFHjziIhov8xnGOgPrfI5QwZaYfV9Ei-MRU/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="구글 시트 열기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>

      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {!loading && sheet && selectedWeek &&
          SECTIONS.filter((s) => sectionRows(s).length > 0).map((section) => (
            <SectionTable
              key={section}
              section={section}
              rows={sectionRows(section)}
              currentWeek={selectedWeek}
            />
          ))
        }
      </main>
    </div>
  );
}
