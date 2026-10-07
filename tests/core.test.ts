import { describe, expect, it } from 'vitest';
import { hashPassword, normaliseMobile, passwordOk } from '../src/lib/auth';
import { coarse, directionsUrl, haversineKm, telUrl } from '../src/lib/geo';
import { DICTS } from '../src/lib/i18n';
import { retrieve, FIRST_AID } from '../src/lib/kb';
import { buildPrompt } from '../src/lib/ai';
import facilities from '../public/data/facilities.json';
import wards from '../public/data/wards.json';

describe('auth helpers', () => {
  it('normalises Indian mobile numbers', () => {
    expect(normaliseMobile('+91 98765 43210')).toBe('9876543210');
    expect(normaliseMobile('09876543210')).toBe('9876543210');
    expect(normaliseMobile('12345')).toBeNull();
    expect(normaliseMobile('5876543210')).toBeNull(); // must start 6-9
  });
  it('checks password strength', () => {
    expect(passwordOk('abc12345')).toBe(true);
    expect(passwordOk('abcdefgh')).toBe(false);
    expect(passwordOk('a1')).toBe(false);
  });
  it('hashes deterministically with salt and never returns the password', async () => {
    const a = await hashPassword('secret123', '00112233445566778899aabbccddeeff', 1000);
    const b = await hashPassword('secret123', '00112233445566778899aabbccddeeff', 1000);
    const c = await hashPassword('secret123', 'ffeeddccbbaa99887766554433221100', 1000);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toContain('secret');
    expect(a).toHaveLength(64);
  });
});

describe('geo helpers', () => {
  it('haversine: Chennai Central to Guindy is ~10 km', () => {
    const d = haversineKm({ lat: 13.0827, lon: 80.2707 }, { lat: 13.0067, lon: 80.2206 });
    expect(d).toBeGreaterThan(9);
    expect(d).toBeLessThan(11);
  });
  it('builds Google Maps directions, origin only when given', () => {
    expect(directionsUrl({ lat: 13, lon: 80 })).not.toContain('origin');
    expect(directionsUrl({ lat: 13, lon: 80 }, { lat: 13.1, lon: 80.2 })).toContain('origin=13.1%2C80.2');
  });
  it('only makes tel links for dialable numbers', () => {
    expect(telUrl('044 2489 3172')).toBe('tel:04424893172');
    expect(telUrl('123')).toBeNull();
    expect(telUrl(null)).toBeNull();
  });
  it('coarsens coordinates to 3 decimals', () => expect(coarse(13.056789)).toBe(13.057));
});

describe('i18n', () => {
  it('Tamil and Hindi have every English key, non-empty', () => {
    for (const lang of ['ta', 'hi'] as const) for (const k of Object.keys(DICTS.en)) expect(DICTS[lang][k as keyof typeof DICTS.en]?.length, `${lang}.${k}`).toBeGreaterThan(0);
  });
});

describe('bundled data', () => {
  it('every anti-rabies badge has a documented source; exactly 5 official listings (4 Chennai + Chengalpattu)', () => {
    const listed = (facilities as { arv?: { status: string; url: string; date: string } }[]).filter((f) => f.arv);
    for (const f of listed) {
      expect(['official', 'news']).toContain(f.arv!.status);
      expect(f.arv!.url).toMatch(/^https:\/\//);
      expect(f.arv!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(listed.filter((f) => f.arv!.status === 'official')).toHaveLength(5);
  });
  it('all facility coordinates are inside the Chennai box', () => {
    for (const f of facilities as { lat: number; lon: number }[]) {
      expect(f.lat).toBeGreaterThan(12.6);
      expect(f.lat).toBeLessThan(13.4);
      expect(f.lon).toBeGreaterThan(79.8);
      expect(f.lon).toBeLessThan(80.5);
    }
  });
  it('ward rows are internally consistent', () => {
    expect(wards).toHaveLength(201);
    for (const w of wards as { gcc: number; govh: number; govtTotal: number; nearestGovtKm: number }[]) {
      expect(w.govtTotal).toBe(w.gcc + w.govh);
      expect(w.nearestGovtKm).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('offline knowledge base', () => {
  it('finds first aid for a bite question in English, Tamil and Hindi', () => {
    expect(retrieve('a dog bit my hand what do I do').map((c) => c.id)).toContain('firstaid');
    expect(retrieve('நாய் கடித்தது என்ன செய்வது')[0].id).toBe('firstaid');
    expect(retrieve('कुत्ते ने काटा क्या करूँ').map((c) => c.id)).toContain('firstaid');
    expect(retrieve('Dog bit me. What now?')[0].id).toBe('firstaid');
  });
  it('finds Chennai clinics for a vaccine question', () => {
    expect(retrieve('where can I get anti rabies vaccine in chennai')[0].id).toBe('where');
  });
  it('never returns nothing', () => expect(retrieve('xyz qqq').length).toBeGreaterThan(0));
  it('keeps the exact official first-aid sentence', () => expect(FIRST_AID).toContain('at least 15 minutes'));
  it('prompt forbids diagnosis and dose schedules', () => {
    const { system } = buildPrompt('dog bite', 'ta');
    expect(system).toMatch(/Never diagnose/);
    expect(system).toMatch(/Never give vaccine doses/);
    expect(system).toMatch(/Tamil/);
  });
});

import { answer, matchIntents, INTENTS } from '../src/lib/intents';

describe('offline answer bank', () => {
  const top = (q: string) => matchIntents(q)[0]?.id;
  it('understands bites in many ways of writing', () => {
    expect(top('a dog bit my leg')).toBe('dog_bite');
    expect(top('naai kadichidu')).toBe('dog_bite');
    expect(top('நாய் கடித்தது')).toBe('dog_bite');
    expect(top('कुत्ते ने काटा')).toBe('dog_bite');
    expect(top('kutte ne kaat liya')).toBe('dog_bite');
  });
  it('picks the specific animal / situation', () => {
    expect(top('my cat scratched me')).toBe('cat_bite');
    expect(top('பூனை கீறியது')).toBe('cat_bite');
    expect(top('monkey bite at temple')).toBe('monkey_bite');
    expect(top('lots of blood after dog bite')).toBe('bleeding');
    expect(top('I missed my second dose')).toBe('missed');
    expect(top('do I need 14 injections in stomach')).toBe('myth_14');
    expect(top('where to get vaccine near me')).toBe('where_vaccine');
  });
  it('answers in the chosen language', () => {
    expect(answer('dog bite', 'ta').text).toContain('நாய் கடி');
    expect(answer('dog bite', 'hi').text).toContain('कुत्ते ने काटा');
  });
  it('falls back with first-aid advice when nothing matches', () => {
    const a = answer('qwerty zzz', 'en');
    expect(a.ids).toHaveLength(0);
    expect(a.text).toContain('15 minutes');
  });
  it('does not match English words inside other words', () => {
    expect(matchIntents('petrol bunk').map((i) => i.id)).not.toContain('myth_14');
  });
  it('every answer exists in all 3 languages and never promises safety', () => {
    for (const it of INTENTS)
      for (const l of ['en', 'ta', 'hi'] as const) {
        expect(it.a[l].length, `${it.id}.${l}`).toBeGreaterThan(20);
        expect(it.a[l].toLowerCase()).not.toMatch(/you are safe|no need to see a doctor/);
      }
  });
});

import sim from '../public/data/sim.json';
import { DEFAULT_WEIGHTS, FACTORS, FACTOR_INFO, allRisk, levelOf, priority, recommend, wardRisk, type Sim, type SimWard } from '../src/lib/risk';
import type { Ward } from '../src/lib/data';

describe('simulated demo dataset', () => {
  const s = sim as unknown as Sim;
  it('is labelled simulated and covers every real ward for 24 months', () => {
    expect(s.simulated).toBe(true);
    expect(s.label).toMatch(/SIMULATED/);
    expect(s.months).toHaveLength(24);
    expect(Object.keys(s.wards).sort()).toEqual((wards as { ward: string }[]).map((w) => w.ward).sort());
  });
  it('breakdowns add up to the case count', () => {
    for (const w of Object.values(s.wards)) {
      w.cases.forEach((c, i) => {
        expect(w.dog[i] + w.cat[i] + w.monkey[i] + w.other[i]).toBe(c);
        expect(w.a0[i] + w.a1[i] + w.a2[i]).toBe(c);
        expect(w.completed[i]).toBeLessThanOrEqual(c);
        expect(w.dogVax[i]).toBeGreaterThanOrEqual(0);
        expect(w.dogVax[i]).toBeLessThanOrEqual(100);
      });
    }
  });
});

describe('rabies risk indicator', () => {
  const ward = { ward: 'T', label: 'Ward T', zoneName: 'Z', population: 10000, nearestArvKm: 10 } as Ward;
  const flat = (cases: number, completed: number, dogVax: number): SimWard => {
    const a = (v: number) => [v, v, v];
    return { cases: a(cases), dog: a(cases), cat: a(0), monkey: a(0), other: a(0), a0: a(0), a1: a(cases), a2: a(0), completed: a(completed), dogVax: a(dogVax) };
  };
  it('scores 100 when every factor is at its worst and 0 at its best', () => {
    expect(wardRisk(ward, flat(15, 0, 20), 2).score).toBe(100);
    expect(wardRisk({ ...ward, nearestArvKm: 0 }, flat(0, 0, 80), 2).score).toBe(0);
  });
  it('uses the published weights', () => {
    const r = wardRisk({ ...ward, nearestArvKm: 0 }, flat(15, 15, 80), 2);
    expect(r.score).toBe(35);
    expect(r.drivers).toEqual(['incidence']);
    expect(DEFAULT_WEIGHTS).toEqual({ incidence: 35, lowVax: 25, dropout: 20, access: 20 });
  });
  it('recommends actions only from the ward drivers', () => {
    const r = wardRisk({ ...ward, nearestArvKm: 0 }, flat(1, 1, 20), 2);
    expect(r.drivers[0]).toBe('lowVax');
    expect(recommend(r)[0].action).toBe(FACTOR_INFO.lowVax.action);
  });
  it('maps scores to levels', () => {
    expect([0, 25, 50, 75, 100].map((v) => levelOf(v).id)).toEqual(['low', 'moderate', 'high', 'veryHigh', 'veryHigh']);
  });
  it('ranks the real wards and keeps points equal to the score', () => {
    const rows = allRisk(wards as unknown as Ward[], s, 23);
    expect(rows).toHaveLength((wards as unknown[]).length);
    const top = priority(rows, 10);
    expect(top).toHaveLength(10);
    expect(top[0].score).toBeGreaterThanOrEqual(top[9].score);
    for (const r of rows) expect(Math.abs(FACTORS.reduce((a, f) => a + r.points[f], 0) - r.score)).toBeLessThan(0.06);
  });
  const s = sim as unknown as Sim;
});

import { wardOf } from '../src/lib/cloud';
import wardGeo from '../public/data/wards.geojson?raw';

describe('ward lookup for anonymous reports', () => {
  const geo = JSON.parse(wardGeo as string) as GeoJSON.FeatureCollection;
  it('finds the ward for a point inside Chennai and null outside', () => {
    const w = (wards as { ward: string; lat: number; lon: number }[])[0];
    expect(wardOf(w.lat, w.lon, geo)).toBe(w.ward);
    expect(wardOf(12.0, 79.0, geo)).toBeNull();
  });
});
