import type { Player } from "./lib/types";

export function PlayerBar({ players }: { players: Player[] }) {
  return (
    <footer className="player-bar" aria-label="プレイヤー情報">
      {players.map((player) => (
        <button key={player.id} className="player-card" type="button">
          <span className="player-dot" style={{ backgroundColor: player.color }} />
          <span className="player-name">{player.name}</span>
          <strong>{player.periodPoints}pt</strong>
        </button>
      ))}
    </footer>
  );
}
