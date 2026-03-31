import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type WeatherState = {
  city: string;
  tempC: number | null;
  code: number | null;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function iconForCode(code: number | null) {
  if (code == null) return "—";
  if (code === 0) return "☀";
  if (code <= 3) return "⛅";
  if (code <= 48) return "☁";
  if (code <= 67) return "🌧";
  if (code <= 77) return "🌨";
  if (code <= 82) return "🌧";
  return "⛈";
}

async function fetchWeather(city: string): Promise<WeatherState> {
  const name = city.trim() || "Shanghai";
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name,
  )}&count=1&language=zh&format=json`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) throw new Error("天气服务不可用");
  const geo = (await geoRes.json()) as any;
  const first = geo?.results?.[0];
  if (!first?.latitude || !first?.longitude) throw new Error("未找到城市");

  const lat = clamp(Number(first.latitude), -90, 90);
  const lon = clamp(Number(first.longitude), -180, 180);
  const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  const wRes = await fetch(wUrl);
  if (!wRes.ok) throw new Error("天气服务不可用");
  const w = (await wRes.json()) as any;
  const temp = w?.current?.temperature_2m;
  const code = w?.current?.weather_code;

  return {
    city: first?.name ?? name,
    tempC: typeof temp === "number" ? temp : null,
    code: typeof code === "number" ? code : null,
  };
}

export function WeatherWidget(props: { city?: string }) {
  const city = props.city ?? (import.meta as any).env?.VITE_WEATHER_CITY ?? "上海";

  const query = useQuery({
    queryKey: ["weather", city],
    queryFn: () => fetchWeather(city),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });

  const display = useMemo(() => {
    if (!query.data) return { city, temp: "--", icon: "—" };
    const t = query.data.tempC;
    return {
      city: query.data.city,
      temp: typeof t === "number" ? `${Math.round(t)}°C` : "--",
      icon: iconForCode(query.data.code),
    };
  }, [city, query.data]);

  return (
    <div className="weatherWidget" aria-label="天气信息">
      <span className="weatherCity">{display.city}</span>
      <span className="weatherIcon" aria-hidden="true">
        {display.icon}
      </span>
      <span className="weatherTemp">{query.isError ? "--" : display.temp}</span>
      <button
        type="button"
        className="weatherRefresh"
        aria-label="刷新天气"
        onClick={() => void query.refetch()}
        disabled={query.isFetching}
      >
        ↻
      </button>
    </div>
  );
}

