import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/** Zona horaria de la agencia. Todas las fechas se muestran y programan en esta zona. */
export const TZ = process.env.NEXT_PUBLIC_TIMEZONE || "America/Bogota";

export function inTZ(date: Date | string | number) {
  return new TZDate(new Date(date).getTime(), TZ);
}

/** Formatea en la zona de la agencia y en español. Patrones de date-fns (ej. "d MMM, HH:mm"). */
export function fmt(date: Date | string | number, pattern: string) {
  return format(inTZ(date), pattern, { locale: es });
}

/** "2026-11-17T09:30" (para <input type="datetime-local">) en la zona de la agencia. */
export function toInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  return format(inTZ(date), "yyyy-MM-dd'T'HH:mm");
}

/** Convierte el valor de <input type="datetime-local"> (hora de la agencia) a ISO UTC. */
export function fromInputValue(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new TZDate(y, mo - 1, d, h, mi, TZ).toISOString();
}

/** Fecha/hora "ahora" en la zona de la agencia, con día/hora ajustados. */
export function zonedAt(dayOffset: number, hour: number, minute = 0) {
  const now = inTZ(Date.now());
  return new TZDate(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, TZ);
}

/** Inicio del día (en la zona de la agencia) desplazado n días, como Date. */
export function startOfZonedDay(dayOffset = 0) {
  return zonedAt(dayOffset, 0);
}

export function monthKey(date: Date | string) {
  return format(inTZ(date), "yyyy-MM");
}

/**
 * FullCalendar trabaja en "UTC" y nosotros le damos la hora de pared de la agencia:
 * "2026-11-20T12:00:00" significa las 12:00 en Colombia. Estas dos funciones convierten.
 */
export function toWallClock(iso: string) {
  return format(inTZ(iso), "yyyy-MM-dd'T'HH:mm:ss");
}

export function fromWallClockDate(d: Date) {
  // d está en "coordenadas UTC" con la hora de pared de la agencia
  const p = (n: number) => String(n).padStart(2, "0");
  const wall = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  return fromInputValue(wall);
}

export function wallClockNow() {
  return toWallClock(new Date().toISOString());
}
