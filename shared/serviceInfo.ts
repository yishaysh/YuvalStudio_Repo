import type { Service } from '../types';

/**
 * Extracts an explicit healing duration from the service record without inventing
 * category-based fallback timelines.
 */
export function extractHealingTime(service?: Partial<Service> | null): string | null {
  if (!service) return null;

  const direct = typeof service.healing_time === 'string' ? service.healing_time.trim() : '';
  if (direct) return direct;

  const desc = typeof service.description === 'string' ? service.description : '';
  if (!desc) return null;

  const match = desc.match(/(?:זמן החלמה(?:\s+משוער)?|החלמה(?:\s+מלאה)?)\s*:\s*([^.;\n]+)/i);
  if (match && match[1]) {
    const cleaned = match[1].trim();
    return cleaned || null;
  }

  return null;
}

/**
 * Returns pain level metadata only when an explicit positive rating (1-10) exists.
 */
export function getPainDisplay(
  painLevel: unknown
): { value: number; max: 10; label: string } | null {
  if (typeof painLevel !== 'number' || !Number.isFinite(painLevel)) return null;
  if (painLevel <= 0) return null;
  const clamped = Math.min(10, Math.max(1, Math.round(painLevel)));
  return {
    value: clamped,
    max: 10,
    label: `${clamped}/10`,
  };
}
