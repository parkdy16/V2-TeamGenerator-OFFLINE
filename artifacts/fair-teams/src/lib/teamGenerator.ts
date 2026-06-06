import { Player, Team, TeamColor } from "./types";

const DEFAULT_COLORS: TeamColor[] = ["red", "blue", "lime", "yellow", "orange", "black"];

export function generateTeams(
  players: Player[],
  numTeams: number,
  shuffleEquals: boolean = false
): Team[] {
  if (numTeams < 2 || players.length === 0) return [];

  const teams: Team[] = Array.from({ length: numTeams }, (_, i) => ({
    id: String(i + 1),
    name: `Team ${i + 1}`,
    players: [],
    totalSkill: 0,
    averageSkill: 0,
    color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  // Always assign to the team with the lowest current total skill
  const assignToLowest = (player: Player) => {
    const t = teams.reduce((a, b) => (a.totalSkill <= b.totalSkill ? a : b));
    t.players.push(player);
    t.totalSkill += player.skill;
  };

  // Pre-compute stable noise per player so sorting is consistent within one call
  const noise = new Map(
    players.map(p => [
      p.id,
      shuffleEquals ? (Math.random() - 0.5) * 0.99 : 0,
    ])
  );
  const sk = (p: Player) => p.skill + (noise.get(p.id) ?? 0);
  const bySkillDesc = (a: Player, b: Player) => sk(b) - sk(a);

  // Split into buckets
  const females = players.filter(p => p.gender === "female").sort(bySkillDesc);
  const runners = players.filter(p => p.gender !== "female" && p.speed >= 2).sort(bySkillDesc);
  const rest    = players.filter(p => p.gender !== "female" && p.speed < 2).sort(bySkillDesc);

  // Pass 1: Give each team at most one female (greedy — avoids stacking top females on one team)
  const femalesForPass1 = females.splice(0, Math.min(numTeams, females.length));
  femalesForPass1.forEach(assignToLowest);

  // Pass 2: Give each team at most one runner (greedy)
  const runnersForPass1 = runners.splice(0, Math.min(numTeams, runners.length));
  runnersForPass1.forEach(assignToLowest);

  // Pass 3: All remaining players distributed greedily by skill descending
  [...females, ...runners, ...rest].sort(bySkillDesc).forEach(assignToLowest);

  // Compute averages
  teams.forEach(t => {
    t.averageSkill =
      t.players.length > 0
        ? Number((t.totalSkill / t.players.length).toFixed(1))
        : 0;
  });

  return teams;
}

export function recomputeStats(teams: Team[]): Team[] {
  return teams.map(t => ({
    ...t,
    totalSkill: t.players.reduce((sum, p) => sum + p.skill, 0),
    averageSkill:
      t.players.length > 0
        ? Number((t.players.reduce((sum, p) => sum + p.skill, 0) / t.players.length).toFixed(1))
        : 0,
  }));
}
