export type Gender = "male" | "female" | "other";

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  skill: number;    // 1-10
  speed: number;    // 1-3 (1=slow, 2=moderate, 3=fast/runner)
}

export type AttendanceMap = Record<string, boolean>;

export type TeamColor = "red" | "blue" | "lime" | "yellow" | "orange" | "black";

export interface Team {
  id: string;
  name: string;
  players: Player[];
  totalSkill: number;
  averageSkill: number;
  color: TeamColor;
}
