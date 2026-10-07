import { useEffect, useState } from 'react';
import { Trash2, Download, Plus, MapPin, FileText } from 'lucide-react';
import { go, useApp } from '../lib/app';
import { deleteReport, listReports, type Report } from '../lib/reports';
import { Spinner, Topbar } from '../components/ui';
import { native } from '../lib/ai';
import { animalKey, typeKey } from './Report';

function Thumb({ blob }: { blob: Blob }) {
  const [u, setU] = useState<string>();
  useEffect(() => {
    const x = URL.createObjectURL(blob);
    setU(x);
    return () => URL.revokeObjectURL(x);
  }, [blob]);
  return u ? <img className="thumb" src={u} alt="" /> : null;
}

export default function MyReports() {
  const { t, user, settings } = useApp();
  const [rows, setRows] = useState<Report[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const refresh = () => listReports(user!).then(setRows).catch(() => setRows([]));
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function download() {
    const data = (rows || []).map(({ photo, ...r }) => ({ ...r, hasPhoto: Boolean(photo) }));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'rabiespulse-my-reports.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const fmt = new Intl.DateTimeFormat(settings.lang === 'en' ? 'en-IN' : `${settings.lang}-IN`, { dateStyle: 'medium' });

  return (
    <div className="app">
      <Topbar title={t('tile_reports')} />
      <main className="page">
        <div className="row">
          <button className="btn primary grow" onClick={() => go('/report')}>
            <Plus size={18} /> {t('newReport')}
          </button>
          {/* blob downloads don't work inside the Android WebView */}
          {!native && rows && rows.length > 0 && (
            <button className="btn" onClick={download}>
              <Download size={18} /> {t('download')}
            </button>
          )}
        </div>
        <p className="tiny muted">
          {t('savedNote')} {t('notConfirmed')}
        </p>
        {!rows && <Spinner label={t('loading')} />}
        {rows?.length === 0 && (
          <div className="empty">
            <FileText size={36} />
            {t('noReports')}
          </div>
        )}
        {rows?.map((r) => (
          <article key={r.id} className="card row" style={{ alignItems: 'flex-start' }}>
            {r.photo && <Thumb blob={r.photo} />}
            <div className="grow stack" style={{ gap: 4 }}>
              <h3>
                {t(animalKey(r.animal))} · {t(typeKey(r.exposure))}
              </h3>
              <div className="small muted">{fmt.format(new Date(r.date + 'T00:00'))}</div>
              {(r.area || r.lat != null) && (
                <div className="small row" style={{ gap: 4 }}>
                  <MapPin size={14} /> {r.area || `${r.lat}, ${r.lon}`}
                </div>
              )}
              {r.note && <p className="small">{r.note}</p>}
            </div>
            <button
              className={`btn sm${confirm === r.id ? ' danger' : ''}`}
              onClick={async () => {
                if (confirm !== r.id) return setConfirm(r.id);
                await deleteReport(r.id);
                setConfirm(null);
                refresh();
              }}
              aria-label={t('delete')}
            >
              <Trash2 size={16} /> {confirm === r.id ? t('tapAgain') : ''}
            </button>
          </article>
        ))}
      </main>
    </div>
  );
}
