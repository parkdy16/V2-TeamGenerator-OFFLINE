import React, { useState } from "react";
import type { RoomPlayer } from "@/lib/localRoster";
import { Player, Team, TeamColor } from "@/lib/types";
import { generateTeams, recomputeStats } from "@/lib/teamGenerator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shuffle, Zap, ArrowLeftRight, Venus, Download } from "lucide-react";

const COLOR_OPTIONS: { value: TeamColor; label: string; hex: string; textHex: string }[] = [
  { value: "red",    label: "Red",    hex: "#ef4444", textHex: "#fff"    },
  { value: "blue",   label: "Blue",   hex: "#3b82f6", textHex: "#fff"    },
  { value: "lime",   label: "Lime",   hex: "#84cc16", textHex: "#1a1a1a" },
  { value: "yellow", label: "Yellow", hex: "#facc15", textHex: "#1a1a1a" },
  { value: "orange", label: "Orange", hex: "#f97316", textHex: "#fff"    },
  { value: "black",  label: "Black",  hex: "#111827", textHex: "#fff"    },
];

function colorFor(color: TeamColor) {
  return COLOR_OPTIONS.find(c => c.value === color) ?? COLOR_OPTIONS[0]!;
}

interface SwapSelection { playerId: string; fromTeamId: string; }

function toLocalPlayer(p: RoomPlayer): Player {
  return { id: p.id, name: p.name, gender: p.gender as Player["gender"], skill: p.skill, speed: p.speed };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function exportTeamsAsJpg(teams: Team[]) {
  const SCALE = 2;
  const PAD = 20;
  const GAP = 14;
  const CARD_W = 280;
  const HEADER_H = 62;
  const PLAYER_H = 26;
  const FOOTER_PAD = 10;
  const TITLE_H = 54;
  const COLS = Math.min(2, teams.length);

  const colHeights = Array(COLS).fill(0) as number[];
  teams.forEach((team, i) => {
    const col = i % COLS;
    const cardH = HEADER_H + Math.max(1, team.players.length) * PLAYER_H + FOOTER_PAD;
    colHeights[col] += cardH + GAP;
  });

  const canvasW = COLS * CARD_W + (COLS - 1) * GAP + PAD * 2;
  const canvasH = TITLE_H + Math.max(...colHeights) + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW * SCALE;
  canvas.height = canvasH * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = "#f5f3ff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Title
  ctx.fillStyle = "#5b21b6";
  ctx.font = `bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText("LAZY & LOUSY TEAMS", PAD, 28);
  ctx.font = `11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#7c3aed";
  ctx.globalAlpha = 0.6;
  const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
  ctx.fillText(`${totalPlayers} players · ${teams.length} teams`, PAD, 44);
  ctx.globalAlpha = 1;

  const colY = Array(COLS).fill(TITLE_H) as number[];

  teams.forEach((team, i) => {
    const col = COLS === 1 ? 0 : i % COLS;
    const x = PAD + col * (CARD_W + GAP);
    const y = colY[col]!;
    const playersH = Math.max(1, team.players.length) * PLAYER_H;
    const cardH = HEADER_H + playersH + FOOTER_PAD;
    const colOpt = colorFor(team.color);

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, x, y, CARD_W, cardH, 10);
    ctx.fill();
    ctx.restore();

    // Header background
    ctx.fillStyle = colOpt.hex;
    roundRect(ctx, x, y, CARD_W, HEADER_H, [10, 10, 0, 0]);
    ctx.fill();

    // Team name
    ctx.fillStyle = colOpt.textHex;
    ctx.font = `bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(team.name.toUpperCase(), x + 12, y + 20);

    // Player count
    ctx.font = `10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(`${team.players.length} player${team.players.length !== 1 ? "s" : ""}`, x + 12, y + 36);
    ctx.globalAlpha = 1;

    // Divider
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + HEADER_H);
    ctx.lineTo(x + CARD_W, y + HEADER_H);
    ctx.stroke();

    // Players
    if (team.players.length === 0) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = `italic 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText("No players", x + 12, y + HEADER_H + 18);
    } else {
      team.players.forEach((player, pi) => {
        const py = y + HEADER_H + 18 + pi * PLAYER_H;
        if (pi > 0) {
          ctx.strokeStyle = "rgba(0,0,0,0.05)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 8, py - 8);
          ctx.lineTo(x + CARD_W - 8, py - 8);
          ctx.stroke();
        }
        // Bullet
        ctx.fillStyle = colOpt.hex;
        ctx.beginPath();
        ctx.arc(x + 18, py - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        // Name
        ctx.fillStyle = "#111827";
        ctx.font = `500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillText(player.name, x + 30, py);
      });
    }

    colY[col] = (colY[col] ?? TITLE_H) + cardH + GAP;
  });

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams.jpg";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/jpeg", 0.93);
}

export function TeamsTab({ players }: { players: RoomPlayer[] }) {
  const [numTeams, setNumTeams] = useState<number>(2);
  const [teams, setTeams] = useState<Team[]>([]);
  const [swap, setSwap] = useState<SwapSelection | null>(null);

  const attendingPlayers = players.filter(p => p.attending).map(toLocalPlayer);

  const handleGenerate = (shuffleEquals = false) => {
    if (attendingPlayers.length < 2) return;
    setSwap(null);
    setTeams(generateTeams(attendingPlayers, numTeams, shuffleEquals));
  };

  const handleColorChange = (teamId: string, color: TeamColor) => {
    const label = colorFor(color).label;
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, color, name: `${label} Team` } : t));
  };

  const handleSelectPlayer = (playerId: string, fromTeamId: string) => {
    if (swap?.playerId === playerId && swap?.fromTeamId === fromTeamId) setSwap(null);
    else setSwap({ playerId, fromTeamId });
  };

  const handleMoveTo = (toTeamId: string) => {
    if (!swap) return;
    const { playerId, fromTeamId } = swap;
    if (toTeamId === fromTeamId) { setSwap(null); return; }
    setTeams(prev => {
      const next = prev.map(t => ({ ...t, players: [...t.players] }));
      const fromTeam = next.find(t => t.id === fromTeamId);
      const toTeam = next.find(t => t.id === toTeamId);
      if (!fromTeam || !toTeam) return prev;
      const idx = fromTeam.players.findIndex(p => p.id === playerId);
      if (idx === -1) return prev;
      const [moved] = fromTeam.players.splice(idx, 1);
      toTeam.players.push(moved!);
      return recomputeStats(next);
    });
    setSwap(null);
  };

  if (attendingPlayers.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
          <Zap className="w-6 h-6 text-muted-foreground opacity-40" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Select at least 2 players in the Today tab to generate teams.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="bg-card border border-border px-3 py-2.5 rounded-xl shadow-sm flex items-end gap-2">
        <div className="flex flex-col gap-1 w-28 shrink-0">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Teams</Label>
          <Select value={numTeams.toString()} onValueChange={v => setNumTeams(parseInt(v))}>
            <SelectTrigger className="h-9 font-bold text-sm" data-testid="select-num-teams">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 4, 6].map(n => (
                <SelectItem key={n} value={n.toString()} data-testid={`option-teams-${n}`}>{n} Teams</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button className="flex-1 h-9 font-black uppercase tracking-wide text-sm shadow-sm" onClick={() => handleGenerate(false)} data-testid="button-generate">
          Generate
        </Button>

        {teams.length > 0 && (
          <>
            <Button variant="outline" size="icon" className="h-9 w-9 border-2 shrink-0" onClick={() => handleGenerate(true)} title="Shuffle" data-testid="button-shuffle">
              <Shuffle className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 border-2 shrink-0" onClick={() => exportTeamsAsJpg(teams)} title="Export as JPG" data-testid="button-export">
              <Download className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Swap banner */}
      {swap && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 flex items-center gap-2">
          <ArrowLeftRight className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-xs font-semibold text-primary flex-1">
            Moving <span className="font-black">{teams.flatMap(t => t.players).find(p => p.id === swap.playerId)?.name}</span> — tap a team to move there
          </p>
          <button className="text-[10px] text-muted-foreground underline shrink-0" onClick={() => setSwap(null)} data-testid="button-cancel-swap">Cancel</button>
        </div>
      )}

      {/* Teams grid — 2 columns */}
      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {teams.map(team => {
            const col = colorFor(team.color);
            const isSwapDest = swap && swap.fromTeamId !== team.id;

            return (
              <div
                key={team.id}
                className="rounded-xl overflow-hidden border-2 shadow-sm transition-all"
                style={{ borderColor: isSwapDest ? col.hex : "hsl(var(--border))" }}
                data-testid={`card-team-${team.id}`}
              >
                {/* Header */}
                <div className="px-2.5 pt-2 pb-1.5" style={{ backgroundColor: col.hex }}>
                  <div className="flex items-start justify-between mb-0.5">
                    <span className="text-xs font-black uppercase tracking-wide leading-tight" style={{ color: col.textHex }}>{team.name}</span>
                    <span className="text-[9px] font-bold opacity-70 shrink-0 ml-1 mt-px" style={{ color: col.textHex }}>{team.players.length}p</span>
                  </div>
                  {/* Skill stats */}
                  <div className="flex gap-2 mb-1">
                    <span className="text-[9px] font-bold opacity-80" style={{ color: col.textHex }}>
                      Total {team.totalSkill} · Avg {team.averageSkill}
                    </span>
                  </div>
                  {/* Color swatches */}
                  <div className="flex gap-1">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => handleColorChange(team.id, c.value)}
                        title={c.label}
                        data-testid={`color-${team.id}-${c.value}`}
                        className="rounded-full transition-transform hover:scale-110 active:scale-95 shrink-0"
                        style={{
                          width: 13, height: 13,
                          backgroundColor: c.hex,
                          border: team.color === c.value ? `2px solid ${col.textHex}` : "1.5px solid rgba(255,255,255,0.3)",
                        }}
                      />
                    ))}
                  </div>
                  {isSwapDest && (
                    <button
                      onClick={() => handleMoveTo(team.id)}
                      className="mt-1.5 w-full rounded-md py-1 text-[10px] font-black uppercase tracking-widest"
                      style={{ backgroundColor: col.textHex === "#fff" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)", color: col.textHex, border: `1px solid ${col.textHex}` }}
                      data-testid={`button-moveto-${team.id}`}
                    >
                      Move here
                    </button>
                  )}
                </div>

                {/* Player list */}
                <div className="bg-card divide-y divide-border">
                  {team.players.length === 0 ? (
                    <p className="py-3 text-center text-[10px] text-muted-foreground italic">Empty</p>
                  ) : (
                    team.players.map(player => {
                      const isSelected = swap?.playerId === player.id && swap?.fromTeamId === team.id;
                      return (
                        <button
                          key={player.id}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors"
                          style={{
                            backgroundColor: isSelected ? `${col.hex}20` : undefined,
                            borderLeft: isSelected ? `3px solid ${col.hex}` : "3px solid transparent",
                          }}
                          onClick={() => handleSelectPlayer(player.id, team.id)}
                          data-testid={`player-row-${player.id}-team-${team.id}`}
                        >
                          <ArrowLeftRight className="w-2.5 h-2.5 shrink-0" style={{ color: isSelected ? col.hex : "transparent" }} />
                          <span className="font-bold text-xs truncate flex-1">{player.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {player.gender === "female" && <Venus className="w-2.5 h-2.5 text-pink-400" />}
                            <div className="flex gap-px">
                              {Array.from({ length: 3 }, (_, i) => (
                                <Zap key={i} className="w-2.5 h-2.5" style={{ fill: i < (player.speed ?? 1) ? "#facc15" : "none", color: i < (player.speed ?? 1) ? "#facc15" : "hsl(var(--muted-foreground))", opacity: i < (player.speed ?? 1) ? 1 : 0.25 }} />
                              ))}
                            </div>
                            <span className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-black" style={{ backgroundColor: `${col.hex}22`, color: col.hex }}>
                              {player.skill === 0 ? "N" : player.skill}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
