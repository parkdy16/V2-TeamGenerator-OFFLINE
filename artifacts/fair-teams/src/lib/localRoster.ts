import { Gender } from "@/lib/types";

export interface RoomPlayer {
  id: string;
  roomId: number;
  name: string;
  gender: Gender;
  skill: number;
  speed: number;
  attending: boolean;
  createdAt: string;
}

const STORAGE_KEY = "lazy-lousy-local-roster-v1";

function normalizePlayer(player: Partial<RoomPlayer> & { name?: string }, index = 0): RoomPlayer {
  return {
    id: player.id || crypto.randomUUID(),
    roomId: 1,
    name: (player.name || `Player ${index + 1}`).trim(),
    gender: player.gender === "female" || player.gender === "other" ? player.gender : "male",
    skill: Math.min(10, Math.max(0, Number(player.skill ?? 5))),
    speed: Math.min(3, Math.max(1, Number(player.speed ?? 1))),
    attending: Boolean(player.attending ?? false),
    createdAt: player.createdAt || new Date().toISOString(),
  };
}

export function loadPlayers(): RoomPlayer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p, i) => normalizePlayer(p, i)).filter(p => p.name);
  } catch {
    return [];
  }
}

export function savePlayers(players: RoomPlayer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

export function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function playersToCsv(players: RoomPlayer[]) {
  const headers = ["name", "gender", "skill", "speed", "attending"];
  const rows = players.map(p => [p.name, p.gender, p.skill, p.speed, p.attending ? "yes" : "no"]);
  return [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\n");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseBoolean(value: string | undefined) {
  const v = (value || "").toLowerCase().trim();
  return v === "true" || v === "yes" || v === "1" || v === "y";
}

export function csvToPlayers(csvText: string): RoomPlayer[] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const first = parseCsvLine(lines[0]).map(h => h.toLowerCase());
  const hasHeader = first.includes("name") || first.includes("skill") || first.includes("gender");
  const headers = hasHeader ? first : ["name", "gender", "skill", "speed", "attending"];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const cells = parseCsvLine(line);
    const get = (key: string) => cells[headers.indexOf(key)] ?? "";
    return normalizePlayer({
      name: get("name") || cells[0],
      gender: get("gender") as Gender,
      skill: Number(get("skill") || 5),
      speed: Number(get("speed") || 1),
      attending: parseBoolean(get("attending")),
    }, index);
  }).filter(p => p.name);
}

export function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
