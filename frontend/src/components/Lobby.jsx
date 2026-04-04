import { IdentifyPanel  } from './lobby/IdentifyPanel';
import { ArenaPanel     } from './lobby/ArenaPanel';
import { ArenaListPanel } from './lobby/ArenaListPanel';

export default function Lobby({ t, playerID, arenaID, arenaList, onIdentify, onUpdateArena, onLeaveArena }) {
  return (
    <div className="container">
      <div>
        {!playerID
          ? <IdentifyPanel t={t} onIdentify={onIdentify}/>
          : <ArenaPanel    t={t} playerID={playerID} arenaID={arenaID} onUpdateArena={onUpdateArena} onLeaveArena={onLeaveArena}/>
        }
      </div>

      <div>
        <ArenaListPanel
          t={t}
          playerID={playerID}
          arenaID={arenaID}
          arenaList={arenaList}
          onUpdateArena={onUpdateArena}
        />
      </div>
    </div>
  );
}
