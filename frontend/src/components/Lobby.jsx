import { Leaderboard    } from './Leaderboard';
import { ArenaPanel     } from './lobby/ArenaPanel';
import { ArenaListPanel } from './lobby/ArenaListPanel';

export default function Lobby({ t, user, arenaID, arenaList, onUpdateArena, onLeaveArena }) {
  const currentArena = arenaList.find(a => a.id === arenaID);

  return (
    <div className="lobby-grid">
      <div>
        <ArenaPanel 
          t={t} 
          user={user} 
          arenaID={arenaID} 
          currentArena={currentArena}
          onUpdateArena={onUpdateArena} 
          onLeaveArena={onLeaveArena}
          arenaList={arenaList}
        />
      </div>

      <div>
        <ArenaListPanel
          t={t}
          user={user}
          arenaID={arenaID}
          arenaList={arenaList}
          onUpdateArena={onUpdateArena}
        />
      </div>

      <div className="lobby-grid-bottom">
        <Leaderboard t={t} currentUsername={user?.username} />
      </div>
    </div>
  );
}
