/**
 * Open-Meteo (no API key). Defaults to India centroid; override with NEXT_PUBLIC_WEATHER_LAT / NEXT_PUBLIC_WEATHER_LON.
 * @see https://open-meteo.com/en/docs
 */

const DEFAULT_LAT = 20.5937;
const DEFAULT_LON = 78.9629;

function wmoWeatherLabel(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Variable";
}

export type WelcomeWeather = {
  tempC: number;
  summary: string;
};

export async function getWelcomeWeather(): Promise<WelcomeWeather | null> {
  const lat = Number(process.env.NEXT_PUBLIC_WEATHER_LAT ?? DEFAULT_LAT);
  const lon = Number(process.env.NEXT_PUBLIC_WEATHER_LON ?? DEFAULT_LON);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  try {
    const u = new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude", String(lat));
    u.searchParams.set("longitude", String(lon));
    u.searchParams.set("current", "temperature_2m,weather_code");
    u.searchParams.set("timezone", "auto");

    const res = await fetch(u.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const cur = json.current;
    if (cur?.temperature_2m == null || cur.weather_code == null) return null;

    return {
      tempC: Math.round(cur.temperature_2m * 10) / 10,
      summary: wmoWeatherLabel(cur.weather_code),
    };
  } catch {
    return null;
  }
}
