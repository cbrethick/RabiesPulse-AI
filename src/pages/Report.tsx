import { useEffect, useState, type FormEvent } from 'react';
import { Camera, CheckCircle2, Crosshair, X, ClipboardList, Plus, ShieldAlert } from 'lucide-react';
import { go, useApp, useRoute } from '../lib/app';
import { coarse, getPosition, type GeoErr } from '../lib/geo';
import { saveReport, shrinkImage } from '../lib/reports';
import { ErrorBox, Topbar } from '../components/ui';
import type { Key } from '../lib/i18n';

const ANIMALS: { v: string; k: Key }[] = [
  { v: 'dog', k: 'a_dog' },
  { v: 'cat', k: 'a_cat' },
  { v: 'monkey', k: 'a_monkey' },
  { v: 'other', k: 'a_other' },
];
const TYPES: { v: string; k: Key }[] = [
  { v: 'bite', k: 't_bite' },
  { v: 'scratch', k: 't_scratch' },
  { v: 'lick', k: 't_lick' },
  { v: 'other', k: 't_other' },
];

export const animalKey = (v: string) => ANIMALS.find((a) => a.v === v)?.k ?? 'a_other';
export const typeKey = (v: string) => TYPES.find((a) => a.v === v)?.k ?? 't_other';
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

export default function Report() {
  const { t, user, origin } = useApp();
  const { params } = useRoute();
  const [animal, setAnimal] = useState(params.get('animal') || '');
  const [type, setType] = useState(params.get('type') || '');
  const [date, setDate] = useState(today());
  const [area, setArea] = useState('');
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState<GeoErr | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  async function addLocation() {
    setLocErr(null);
    // reuse live GPS if it is already on, otherwise ask once (user tapped)
    if (origin?.source === 'gps') return setLoc({ lat: coarse(origin.lat), lon: coarse(origin.lon) });
    setLocBusy(true);
    try {
      const p = await getPosition();
      setLoc({ lat: coarse(p.lat), lon: coarse(p.lon) });
    } catch (e) {
      setLocErr(e as GeoErr);
    } finally {
      setLocBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!animal || !type) return setErr(true);
    await saveReport({
      id: crypto.randomUUID(),
      owner: user!,
      createdAt: new Date().toISOString(),
      date,
      animal,
      exposure: type,
      area: area.trim() || undefined,
      lat: loc?.lat,
      lon: loc?.lon,
      note: note.trim() || undefined,
      photo: photo || undefined,
    });
    setDone(true);
  }

  if (done)
    return (
      <div className="app">
        <Topbar title={t('tile_report')} />
        <main className="page">
          <div className="empty" style={{ color: 'var(--text)' }}>
            <CheckCircle2 size={56} color="var(--accent-ink)" />
            <h2>{t('saved')}</h2>
          </div>
          <div className="card warn stack small">
            <b>{t('savedNote')}</b>
            <span>{t('notConfirmed')}</span>
          </div>
          <button className="btn primary big block" onClick={() => go('/reports')}>
            <ClipboardList size={20} /> {t('viewReports')}
          </button>
          <button className="btn block" onClick={() => go('/care')}>
            {t('findCare')}
          </button>
          <button
            className="btn ghost block"
            onClick={() => {
              setDone(false);
              setAnimal('');
              setType('');
              setNote('');
              setPhoto(null);
              setLoc(null);
              setArea('');
            }}
          >
            <Plus size={18} /> {t('newReport')}
          </button>
        </main>
      </div>
    );

  return (
    <div className="app">
      <Topbar title={t('tile_report')} />
      <form className="page" onSubmit={submit} noValidate>
        <div className="card warn row small" style={{ alignItems: 'flex-start' }}>
          <ShieldAlert size={20} style={{ flex: 'none' }} />
          <span>{t('savedNote')}</span>
        </div>

        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="bold" style={{ marginBottom: 8 }}>
            {t('animal')} *
          </legend>
          <div className="choices">
            {ANIMALS.map((a) => (
              <button type="button" key={a.v} className="choice" style={{ minHeight: 52 }} aria-pressed={animal === a.v} onClick={() => setAnimal(a.v)}>
                {t(a.k)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="bold" style={{ marginBottom: 8 }}>
            {t('type')} *
          </legend>
          <div className="choices">
            {TYPES.map((a) => (
              <button type="button" key={a.v} className="choice" style={{ minHeight: 52 }} aria-pressed={type === a.v} onClick={() => setType(a.v)}>
                {t(a.k)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field">
          {t('date')}
          <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="stack" style={{ gap: 8 }}>
          <span className="bold">{t('locationOpt')}</span>
          {loc ? (
            <div className="ok row">
              <span className="grow">
                {t('gpsAdded')} <span className="muted nums">({loc.lat}, {loc.lon})</span>
              </span>
              <button type="button" className="btn sm" onClick={() => setLoc(null)}>
                <X size={16} /> {t('remove')}
              </button>
            </div>
          ) : (
            <button type="button" className="btn" onClick={addLocation} disabled={locBusy}>
              <Crosshair size={18} /> {locBusy ? t('locating') : t('addGps')}
            </button>
          )}
          {locErr && <ErrorBox>{t(`loc_${locErr}` as Key)}</ErrorBox>}
          <input className="input" placeholder={t('areaName')} value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} aria-label={t('areaName')} />
        </div>

        <label className="field">
          {t('note')}
          <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </label>

        <div className="stack" style={{ gap: 8 }}>
          <span className="bold">{t('photo')}</span>
          {preview ? (
            <div className="row">
              <img className="thumb" src={preview} alt="" />
              <button type="button" className="btn sm" onClick={() => setPhoto(null)}>
                <X size={16} /> {t('remove')}
              </button>
            </div>
          ) : (
            <label className="btn" style={{ cursor: 'pointer' }}>
              <Camera size={18} /> {t('addPhoto')}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhoto(await shrinkImage(f).catch(() => f));
                }}
              />
            </label>
          )}
        </div>

        {err && (!animal || !type) && <ErrorBox>{t('required')}</ErrorBox>}
        <button className="btn primary big block">{t('submit')}</button>
        <p className="tiny muted center">{t('notConfirmed')}</p>
      </form>
    </div>
  );
}
