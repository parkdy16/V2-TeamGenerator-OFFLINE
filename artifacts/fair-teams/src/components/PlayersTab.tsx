import React, { useState, useRef, useEffect } from "react";
import type { RoomPlayer } from "@/lib/localRoster";
import { Gender } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserMinus, Plus, Star, Zap, Mic, MicOff, Search, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type AnySpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: { [n: number]: { [n: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSR(): (new () => AnySpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as Record<string, unknown>)["SpeechRecognition"] as (new () => AnySpeechRecognition) | null
    ?? (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as (new () => AnySpeechRecognition) | null
    ?? null;
}

function useSpeechRecognition(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<AnySpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(!!getSR());
  }, []);

  const start = () => {
    const SR = getSR();
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return { listening, supported, start, stop };
}

function SkillEditor({ playerId, skill, onUpdate }: { playerId: string; skill: number; onUpdate: (data: Partial<RoomPlayer>) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md hover:bg-primary/10 transition-colors" title="Tap to edit skill" data-testid={`skill-badge-${playerId}`}>
        {skill === 0
          ? <span className="font-black text-xs text-violet-500 uppercase tracking-wide">New</span>
          : <><Star className="w-3 h-3 text-primary fill-primary" /><span className="font-bold text-sm">{skill}</span></>
        }
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1 flex-wrap justify-end">
        <button
          onClick={() => { onUpdate({ skill: 0 }); setOpen(false); }}
          data-testid={`skill-option-${playerId}-0`}
          className="px-2 h-7 rounded-md text-[10px] font-black uppercase tracking-wide transition-colors"
          style={{
            backgroundColor: skill === 0 ? "hsl(var(--primary))" : "hsl(var(--muted))",
            color: skill === 0 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
          }}
        >
          New
        </button>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => { onUpdate({ skill: n }); setOpen(false); }}
            data-testid={`skill-option-${playerId}-${n}`}
            className="w-7 h-7 rounded-md text-xs font-black transition-colors"
            style={{
              backgroundColor: n === skill ? "hsl(var(--primary))" : "hsl(var(--muted))",
              color: n === skill ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground underline">cancel</button>
    </div>
  );
}

function SpeedEditor({ playerId, speed, onUpdate }: { playerId: string; speed: number; onUpdate: (data: Partial<RoomPlayer>) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-0.5 bg-muted px-2 py-1 rounded-md hover:bg-yellow-400/20 transition-colors" title="Tap to edit speed" data-testid={`speed-badge-${playerId}`}>
        {Array.from({ length: 3 }, (_, i) => (
          <Zap key={i} className="w-3 h-3" style={{ fill: i < speed ? "#facc15" : "none", color: i < speed ? "#facc15" : "hsl(var(--muted-foreground))" }} />
        ))}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        {[1, 2, 3].map(n => (
          <button
            key={n}
            onClick={() => { onUpdate({ speed: n }); setOpen(false); }}
            data-testid={`speed-option-${playerId}-${n}`}
            className="flex items-center gap-0.5 px-2 py-1.5 rounded-md border transition-colors"
            style={{ backgroundColor: n === speed ? "#fef9c3" : "hsl(var(--muted))", borderColor: n === speed ? "#facc15" : "transparent" }}
          >
            {Array.from({ length: n }, (_, i) => <Zap key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground underline">cancel</button>
    </div>
  );
}

export function PlayersTab({ players, setPlayers }: { players: RoomPlayer[]; setPlayers: (players: RoomPlayer[]) => void }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [skill, setSkill] = useState<number>(5);
  const [speed, setSpeed] = useState<number>(1);
  const [search, setSearch] = useState("");

  const { listening, supported: micSupported, start: startMic, stop: stopMic } = useSpeechRecognition(
    (text) => setName(prev => prev ? prev + " " + text : text)
  );

  const updatePlayer = (playerId: string, data: Partial<RoomPlayer>) => {
    setPlayers(players.map(player => player.id === playerId ? { ...player, ...data } : player));
  };

  const removePlayer = (playerId: string) => {
    setPlayers(players.filter(player => player.id !== playerId));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setPlayers([
      ...players,
      {
        id: crypto.randomUUID(),
        roomId: 1,
        name: name.trim(),
        gender,
        skill,
        speed,
        attending: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setName("");
    setSkill(5);
    setSpeed(1);
  };

  const filtered = search.trim()
    ? players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : players;

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Player Name</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="name"
                    placeholder="e.g. Mike"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-12 font-medium pr-3"
                    data-testid="input-player-name"
                  />
                </div>
                {micSupported && (
                  <button
                    type="button"
                    onClick={listening ? stopMic : startMic}
                    data-testid="button-mic"
                    title={listening ? "Stop listening" : "Speak player name"}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      listening
                        ? "border-red-400 bg-red-50 text-red-500 animate-pulse"
                        : "border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}
              </div>
              {listening && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Listening… speak the player's name
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Gender</Label>
                <Select value={gender} onValueChange={v => setGender(v as Gender)}>
                  <SelectTrigger className="h-12 font-medium" id="gender" data-testid="select-gender">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Skill</Label>
                <Select value={skill.toString()} onValueChange={v => setSkill(parseInt(v))}>
                  <SelectTrigger className="h-12 font-medium" id="skill" data-testid="select-skill">
                    <SelectValue placeholder="Skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">New member</SelectItem>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Speed / Runner</Label>
              <div className="flex gap-2">
                {[{ value: 1, label: "Slow" }, { value: 2, label: "Moderate" }, { value: 3, label: "Fast" }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setSpeed(opt.value)} data-testid={`speed-new-${opt.value}`}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all"
                    style={{ borderColor: speed === opt.value ? "#facc15" : "hsl(var(--border))", backgroundColor: speed === opt.value ? "#fef9c3" : "hsl(var(--muted))" }}
                  >
                    <div className="flex gap-0.5">
                      {Array.from({ length: opt.value }, (_, i) => <Zap key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: speed === opt.value ? "#a16207" : "hsl(var(--muted-foreground))" }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-12 mt-2 font-bold uppercase tracking-wide"  data-testid="button-add-player">
              <Plus className="w-4 h-4 mr-2" /> Add Player
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Roster</h3>
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
            {search ? `${filtered.length} / ${players.length}` : players.length}
          </span>
        </div>

        {players.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search roster…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 pl-9 pr-9 text-sm"
              data-testid="input-search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {players.length === 0 ? (
          <div className="text-center py-10 bg-muted/50 rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground font-medium text-sm">No players added yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 bg-muted/50 rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground font-medium text-sm">No players match "{search}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(player => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl shadow-sm gap-3" data-testid={`player-row-${player.id}`}>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold truncate">{player.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{player.gender}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SpeedEditor playerId={player.id} speed={player.speed ?? 1} onUpdate={(data) => updatePlayer(player.id, data)} />
                  <SkillEditor playerId={player.id} skill={player.skill} onUpdate={(data) => updatePlayer(player.id, data)} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive w-8 h-8 rounded-full" data-testid={`button-remove-${player.id}`}>
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-xs rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Player?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete {player.name} from the roster.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removePlayer(player.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
