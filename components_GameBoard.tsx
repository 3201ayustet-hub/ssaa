import { initialGameState } from "./lib/mockData";
import { JapanMap } from "./components_JapanMap";
import { PlayerBar } from "./components_PlayerBar";

export function GameBoard() {
  return (
    <main className="game-shell">
      <section className="map-stage" aria-label="日本全国の勢力図">
        <JapanMap state={initialGameState} />
      </section>
      <PlayerBar players={initialGameState.players} />
    </main>
  );
}
