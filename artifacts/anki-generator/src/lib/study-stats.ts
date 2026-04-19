export type StudySession = {
  id: string;
  deckId: number;
  deckName: string;
  total: number;
  known: number;
  unknown: number;
  completedAt: string; // ISO string
  date: string; // YYYY-MM-DD
};

export type StudySavePoint = {
  deckId: number;
  cardIds: number[];   // ordered card IDs (preserves shuffle order)
  index: number;
  knownIds: number[];
  unknownIds: number[];
  savedAt: string;     // ISO string
};

const STORAGE_KEY = "ankigen_study_sessions";
const SAVE_POINT_KEY = "ankigen_save_points";
const MAX_SESSIONS = 500;

export function getSavePoint(deckId: number): StudySavePoint | null {
  try {
    const raw = localStorage.getItem(SAVE_POINT_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<number, StudySavePoint>;
    return map[deckId] ?? null;
  } catch {
    return null;
  }
}

export function saveSavePoint(point: StudySavePoint): void {
  try {
    const raw = localStorage.getItem(SAVE_POINT_KEY);
    const map: Record<number, StudySavePoint> = raw ? JSON.parse(raw) : {};
    map[point.deckId] = point;
    localStorage.setItem(SAVE_POINT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function clearSavePoint(deckId: number): void {
  try {
    const raw = localStorage.getItem(SAVE_POINT_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<number, StudySavePoint>;
    delete map[deckId];
    localStorage.setItem(SAVE_POINT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getSessions(): StudySession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StudySession[];
  } catch {
    return [];
  }
}

export function saveSession(session: Omit<StudySession, "id" | "date">): StudySession {
  const sessions = getSessions();
  const newSession: StudySession = {
    ...session,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: session.completedAt.slice(0, 10),
  };
  const updated = [newSession, ...sessions].slice(0, MAX_SESSIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newSession;
}

export function getStudyStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map(s => s.date));
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (dates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // If today has no session yet, check yesterday to preserve streak
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        const yesterday = cursor.toISOString().slice(0, 10);
        if (dates.has(yesterday)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }
  return streak;
}

export function getLast7Days(): { date: string; label: string; known: number; total: number }[] {
  const sessions = getSessions();
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
    const daySessions = sessions.filter(s => s.date === dateStr);
    const known = daySessions.reduce((sum, s) => sum + s.known, 0);
    const total = daySessions.reduce((sum, s) => sum + s.total, 0);
    result.push({ date: dateStr, label, known, total });
  }
  return result;
}

export function getDeckStats(sessions: StudySession[]): Map<number, { deckName: string; total: number; known: number; sessions: number }> {
  const map = new Map<number, { deckName: string; total: number; known: number; sessions: number }>();
  for (const s of sessions) {
    const existing = map.get(s.deckId) ?? { deckName: s.deckName, total: 0, known: 0, sessions: 0 };
    map.set(s.deckId, {
      deckName: s.deckName,
      total: existing.total + s.total,
      known: existing.known + s.known,
      sessions: existing.sessions + 1,
    });
  }
  return map;
}

export function getTodayStats(sessions: StudySession[]): { cardsStudied: number; known: number } {
  const t = today();
  const todaySessions = sessions.filter(s => s.date === t);
  return {
    cardsStudied: todaySessions.reduce((sum, s) => sum + s.total, 0),
    known: todaySessions.reduce((sum, s) => sum + s.known, 0),
  };
}
