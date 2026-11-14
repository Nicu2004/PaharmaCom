/**
 * Maps the user's symptoms (and the AI's summary) to the medical specialties that fit.
 * Plain keyword matching, so it is predictable and works without the AI: the text is
 * lower-cased and stripped of diacritics, then every pattern is a word-start regex.
 * It is a hint for ordering the doctors, not a diagnosis.
 */
export const FAMILY = 'Medicină de familie';

const RULES: { specialty: string; patterns: string[] }[] = [
  { specialty: 'ORL', patterns: ['gat', 'amigdal', 'nas\\b', 'nasul', 'sinus', 'sinuzit', 'urech', 'otit', 'raguseal', 'voce', 'stranut', 'miros'] },
  { specialty: 'Neurologie', patterns: ['cap\\b', 'migren', 'ameteal', 'vertij', 'furnicat', 'amortel', 'convuls', 'tremur', 'lesin'] },
  { specialty: 'Cardiologie', patterns: ['piept', 'inim', 'palpitat', 'tensiune', 'puls', 'tahicardi'] },
  { specialty: 'Dermatologie', patterns: ['piele', 'pielii', 'eruptie', 'eruptii', 'mancarim', 'urticari', 'pete\\b', 'acnee', 'basici', 'rosea', 'alunit', 'iritati'] },
  { specialty: 'Gastroenterologie', patterns: ['stomac', 'burta', 'abdomen', 'abdominal', 'great', 'varsatur', 'diare', 'constipat', 'arsur', 'reflux', 'indigest', 'balon'] },
  { specialty: FAMILY, patterns: ['febr', 'tuse', 'tusea', 'racea', 'raceal', 'gripa', 'gripal', 'oboseal', 'slabiciun', 'frison', 'dureri musculare', 'temperatur'] },
];

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Returns the specialties to recommend, best match first. The family doctor is always
 * included as a safe first step. With no text at all, it returns an empty list.
 */
export function suggestSpecialties(text: string, fromAi?: string[]): string[] {
  if (fromAi && fromAi.length > 0) return fromAi;

  const t = normalize(text);
  if (!t.trim()) return [];

  const scored = RULES.map((rule) => ({
    specialty: rule.specialty,
    score: rule.patterns.filter((p) => new RegExp('\\b' + p).test(t)).length,
  }))
    .filter((r) => r.score > 0 && r.specialty !== FAMILY)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((r) => r.specialty);

  return [...scored, FAMILY];
}
