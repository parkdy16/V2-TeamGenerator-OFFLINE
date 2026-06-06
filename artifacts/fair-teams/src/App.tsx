import React, { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CalendarCheck, Shield, Download, Upload } from "lucide-react";
import { PlayersTab } from "@/components/PlayersTab";
import { TodayTab } from "@/components/TodayTab";
import { TeamsTab } from "@/components/TeamsTab";
import { Button } from "@/components/ui/button";
import {
  RoomPlayer,
  csvToPlayers,
  downloadText,
  loadPlayers,
  playersToCsv,
  savePlayers,
} from "@/lib/localRoster";

function App() {
  const [players, setPlayers] = useState<RoomPlayer[]>(() => loadPlayers());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  const replacePlayers = (nextPlayers: RoomPlayer[]) => {
    setPlayers(nextPlayers);
  };

  const exportCsv = () => {
    downloadText("lazy-lousy-roster.csv", playersToCsv(players), "text/csv;charset=utf-8");
  };

  const exportJson = () => {
    downloadText(
      "lazy-lousy-roster-backup.json",
      JSON.stringify(players, null, 2),
      "application/json;charset=utf-8",
    );
  };

  const importFile = async (file: File) => {
    const text = await file.text();
    const imported = file.name.toLowerCase().endsWith(".json")
      ? JSON.parse(text)
      : csvToPlayers(text);

    if (!Array.isArray(imported)) {
      throw new Error("Import file does not contain a roster list.");
    }

    const normalized = file.name.toLowerCase().endsWith(".json")
      ? imported.map((p, index) => ({
          id: p.id || crypto.randomUUID(),
          roomId: 1,
          name: String(p.name || `Player ${index + 1}`).trim(),
          gender: p.gender === "female" || p.gender === "other" ? p.gender : "male",
          skill: Math.min(10, Math.max(0, Number(p.skill ?? 5))),
          speed: Math.min(3, Math.max(1, Number(p.speed ?? 1))),
          attending: Boolean(p.attending ?? false),
          createdAt: p.createdAt || new Date().toISOString(),
        })).filter(p => p.name)
      : imported;

    if (normalized.length === 0) {
      alert("No players found in that file.");
      return;
    }

    const ok = window.confirm(`Import ${normalized.length} players? This replaces the current roster on this device.`);
    if (ok) setPlayers(normalized);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background w-full max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <header className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase italic leading-none">Lazy &amp; Lousy Teams</h1>
          <p className="text-[10px] font-bold tracking-widest uppercase opacity-70 mt-0.5">Offline roster on this device</p>
        </div>
        <div className="flex gap-1">
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={exportCsv} title="Export CSV" disabled={players.length === 0}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} title="Import CSV or JSON">
            <Upload className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                await importFile(file);
              } catch (error) {
                alert(error instanceof Error ? error.message : "Import failed.");
              }
            }}
          />
        </div>
      </header>

      <Tabs defaultValue="players" className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <TabsContent value="players" className="m-0 data-[state=active]:animate-in data-[state=active]:fade-in-50">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={exportJson} disabled={players.length === 0} className="text-xs font-bold uppercase">
                Backup JSON
              </Button>
            </div>
            <PlayersTab players={players} setPlayers={replacePlayers} />
          </TabsContent>
          <TabsContent value="today" className="m-0 data-[state=active]:animate-in data-[state=active]:fade-in-50">
            <TodayTab players={players} setPlayers={replacePlayers} />
          </TabsContent>
          <TabsContent value="teams" className="m-0 data-[state=active]:animate-in data-[state=active]:fade-in-50">
            <TeamsTab players={players} />
          </TabsContent>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <TabsList className="w-full h-14 bg-muted grid grid-cols-3 rounded-xl p-1 gap-1">
            <TabsTrigger value="players" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg flex flex-col items-center justify-center gap-1 h-full">
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Roster</span>
            </TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg flex flex-col items-center justify-center gap-1 h-full">
              <CalendarCheck className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Today</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg flex flex-col items-center justify-center gap-1 h-full">
              <Shield className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Teams</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}

export default App;
