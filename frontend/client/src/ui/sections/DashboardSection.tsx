import { useEffect, useMemo, useState } from "react";

import { apiJson } from "../lib/api";

type SystemStatsResp = {
  system: {
    platform: string;
    release: string;
    machine: string;
    cpuCoresLogical: number | null;
    cpuCoresPhysical: number | null;
    cpuPercent: number;
    memory: {
      totalBytes: number;
      usedBytes: number;
      availableBytes: number;
      percent: number;
    };
  };
};

type ClientDeviceInfo = {
  deviceType: string;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
};

function getClientDeviceInfo(): ClientDeviceInfo {
  const ua = window.navigator.userAgent.toLowerCase();
  const isMobile = /iphone|android|mobile/.test(ua);
  const isTablet = /ipad|tablet/.test(ua);

  return {
    deviceType: isMobile ? "手机" : isTablet ? "平板" : "桌面设备",
    hardwareConcurrency: window.navigator.hardwareConcurrency ?? null,
    deviceMemoryGb:
      typeof (window.navigator as { deviceMemory?: number }).deviceMemory === "number"
        ? (window.navigator as { deviceMemory?: number }).deviceMemory ?? null
        : null,
  };
}

function bytesToGb(value: number): string {
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function DashboardSection() {
  const [stats, setStats] = useState<SystemStatsResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientInfo = useMemo(() => getClientDeviceInfo(), []);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      try {
        const data = await apiJson<SystemStatsResp>("/api/v1/system/stats");
        if (!disposed) {
          setStats(data);
          setError(null);
        }
      } catch {
        if (!disposed) setError("仪表盘数据拉取失败，请确认后端已启动");
      }
    };

    void load();
    const timer = window.setInterval(load, 3000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section id="dashboard" className="section">
      <div className="glassCard reveal">
        <h2 className="sectionTitle">仪表盘</h2>
        <p className="sectionLead">展示当前访问设备类型与本机系统资源指标（每 3 秒刷新）。</p>

        {error && <div className="errorNote">{error}</div>}

        <div className="statsGrid">
          <article className="glassCard glassCard--nested statsCard">
            <div className="statsLabel">当前设备类型</div>
            <div className="statsValue">{clientInfo.deviceType}</div>
            <div className="hintText">
              浏览器线程数：{clientInfo.hardwareConcurrency ?? "N/A"}
            </div>
            <div className="hintText">
              设备内存：
              {typeof clientInfo.deviceMemoryGb === "number"
                ? `${clientInfo.deviceMemoryGb} GB`
                : "N/A"}
            </div>
          </article>

          <article className="glassCard glassCard--nested statsCard">
            <div className="statsLabel">CPU 使用率</div>
            <div className="statsValue">{stats ? `${stats.system.cpuPercent.toFixed(1)}%` : "--"}</div>
            <div className="hintText">
              逻辑核心：{stats?.system.cpuCoresLogical ?? "--"}
            </div>
            <div className="hintText">
              物理核心：{stats?.system.cpuCoresPhysical ?? "--"}
            </div>
          </article>

          <article className="glassCard glassCard--nested statsCard">
            <div className="statsLabel">内存使用率</div>
            <div className="statsValue">{stats ? `${stats.system.memory.percent.toFixed(1)}%` : "--"}</div>
            <div className="hintText">
              已用：{stats ? bytesToGb(stats.system.memory.usedBytes) : "--"}
            </div>
            <div className="hintText">
              总量：{stats ? bytesToGb(stats.system.memory.totalBytes) : "--"}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
