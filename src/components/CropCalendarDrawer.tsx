import { useEffect } from 'react';
import { CropPlan, Season } from '../domain/types';
import { CropCalendarView } from './CropCalendarView';
import { Icon } from './Icon';

interface Props {
  plan: CropPlan;
  season: Season;
  day: number;
  onClose: () => void;
  onTrack?: () => void;
  tracked?: boolean;
}

export function CropCalendarDrawer({ plan, season, day, onClose, onTrack, tracked }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const crop = plan.crop;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`${crop.name} calendar`}>
        <header className="drawer-head">
          <div className="drawer-title">
            <Icon emoji={crop.emoji ?? '🌱'} className="emoji" />
            <div>
              <div className="crop-name">{crop.name}</div>
              <div className="source-line">{crop.seasons.join(' / ')}</div>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <CropCalendarView plan={plan} season={season} day={day} />

        {onTrack && (
          <button
            className={'track-btn drawer-track-btn' + (tracked ? ' is-tracked' : '')}
            onClick={onTrack}
            title={tracked ? 'Already tracking — track another batch' : 'Track this plan on your farm'}
          >
            <Icon emoji="📌" /> {tracked ? 'Tracked — pin another' : 'Track this plan'}
          </button>
        )}
      </aside>
    </>
  );
}
