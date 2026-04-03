#!/usr/bin/env python3
import argparse
import json
import re
from collections import Counter, defaultdict
from html import escape
from pathlib import Path


SOURCE_EXTS = {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs"}
IGNORE_DIRS = {
    ".git", ".venv", "venv", "node_modules", "dist", "build", "coverage", "out",
    ".idea", ".vscode", "__pycache__", ".next", ".nuxt",
}
JS_CALL_BLACKLIST = {
    "if", "for", "while", "switch", "catch", "return", "function", "class", "new", "typeof",
}
LAYER_HINTS = {
    "api": ["/api/", "route", "router", "controller", "endpoint", "handler"],
    "service": ["service", "usecase", "biz", "domain"],
    "repository": ["/repo/", "repository", "dao", "/model/"],
    "ui": ["/ui/", "/view/", "component", "page", "screen"],
    "infra": ["config", "middleware", "infra", "client", "adapter"],
}
LAYER_COLORS = {
    "api": "#2563eb",
    "service": "#0d9488",
    "repository": "#7c3aed",
    "ui": "#d97706",
    "infra": "#475569",
    "other": "#64748b",
}


def iter_source_files(root: Path):
    for p in root.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in SOURCE_EXTS:
            continue
        if any(part in IGNORE_DIRS for part in p.parts):
            continue
        yield p


def safe_read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def normalize_module_path(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def classify_layer(module_path: str) -> str:
    lower = module_path.lower()
    for layer, hints in LAYER_HINTS.items():
        if any(h in lower for h in hints):
            return layer
    return "other"


def extract_py_imports(text: str):
    imports = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        m_from = re.match(r"from\s+([.\w]+)\s+import\s+", line)
        if m_from:
            imports.append(m_from.group(1))
            continue

        m_import = re.match(r"import\s+([\w.,\s]+)$", line)
        if m_import:
            raw = m_import.group(1)
            for item in raw.split(","):
                name = item.strip().split(" ")[0]
                if name:
                    imports.append(name)
    return imports


def extract_js_imports(text: str):
    imports = []
    for m in re.finditer(r"import\s+[^;]*?from\s+['\"]([^'\"]+)['\"]", text):
        imports.append(m.group(1))
    for m in re.finditer(r"require\(\s*['\"]([^'\"]+)['\"]\s*\)", text):
        imports.append(m.group(1))
    for m in re.finditer(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)", text):
        imports.append(m.group(1))
    return imports


def extract_defs_and_calls(path: Path, text: str):
    defs = []
    calls = []
    if path.suffix == ".py":
        defs = re.findall(r"^\s*def\s+([A-Za-z_]\w*)\s*\(", text, flags=re.M)
        calls = re.findall(r"\b([A-Za-z_]\w*)\s*\(", text)
    elif path.suffix in {".js", ".ts", ".tsx", ".jsx"}:
        defs.extend(re.findall(r"\bfunction\s+([A-Za-z_]\w*)\s*\(", text))
        defs.extend(re.findall(r"\bconst\s+([A-Za-z_]\w*)\s*=\s*\([^\)]*\)\s*=>", text))
        defs.extend(re.findall(r"\blet\s+([A-Za-z_]\w*)\s*=\s*\([^\)]*\)\s*=>", text))
        defs.extend(re.findall(r"\bvar\s+([A-Za-z_]\w*)\s*=\s*\([^\)]*\)\s*=>", text))
        calls = re.findall(r"\b([A-Za-z_$][\w$]*)\s*\(", text)
        calls = [c for c in calls if c not in JS_CALL_BLACKLIST]
    else:
        calls = re.findall(r"\b([A-Za-z_]\w*)\s*\(", text)
    return defs, calls


def resolve_relative_import(src_file: Path, target: str, root: Path):
    if not target.startswith("."):
        return None
    base = src_file.parent
    candidate = (base / target).resolve()

    candidates = []
    if candidate.suffix:
        candidates.append(candidate)
    else:
        for ext in [".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs"]:
            candidates.append(Path(str(candidate) + ext))
        for idx in ["index.py", "index.js", "index.ts", "index.tsx", "index.jsx"]:
            candidates.append(candidate / idx)

    for c in candidates:
        try:
            rel = c.relative_to(root)
            if c.exists() and c.is_file():
                return rel.as_posix()
        except ValueError:
            continue
    return None


def resolve_absolute_python_import(target: str, root: Path):
    if target.startswith("."):
        return None

    module_like = target.replace(".", "/")
    candidates = [
        root / f"{module_like}.py",
        root / module_like / "__init__.py",
        root / module_like / "index.py",
    ]

    for c in candidates:
        if c.exists() and c.is_file():
            try:
                return c.relative_to(root).as_posix()
            except ValueError:
                return None
    return None


def extract_endpoints(path: Path, text: str):
    endpoints = []

    for m in re.finditer(r"@(app|router|bp)\.(get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]", text, re.I):
        endpoints.append({
            "file": "",
            "framework": "python-web",
            "method": m.group(2).upper(),
            "path": m.group(3),
        })

    for m in re.finditer(r"\b(router|app)\.(get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]", text, re.I):
        endpoints.append({
            "file": "",
            "framework": "node-web",
            "method": m.group(2).upper(),
            "path": m.group(3),
        })

    for m in re.finditer(r"\b(GET|POST|PUT|DELETE|PATCH)\s+(/[-_/A-Za-z0-9{}:]*)", text):
        endpoints.append({
            "file": "",
            "framework": "generic",
            "method": m.group(1).upper(),
            "path": m.group(2),
        })

    seen = set()
    dedup = []
    for ep in endpoints:
        key = (ep["framework"], ep["method"], ep["path"])
        if key in seen:
            continue
        seen.add(key)
        dedup.append(ep)
    return dedup


def longest_chain(nodes, edges):
    graph = defaultdict(list)
    for a, b in edges:
        graph[a].append(b)

    best = []

    def dfs(cur, path, seen):
        nonlocal best
        if len(path) > len(best):
            best = path[:]
        if len(path) >= 10:
            return
        for nxt in graph.get(cur, []):
            if nxt in seen:
                continue
            seen.add(nxt)
            path.append(nxt)
            dfs(nxt, path, seen)
            path.pop()
            seen.remove(nxt)

    for n in nodes:
        dfs(n, [n], {n})
    return best


def longest_chain_with_score(nodes, edges, score_map):
    graph = defaultdict(list)
    for a, b in edges:
        graph[a].append(b)

    best_path = []
    best_score = -1

    def dfs(cur, path, seen, score):
        nonlocal best_path, best_score
        if score > best_score or (score == best_score and len(path) > len(best_path)):
            best_score = score
            best_path = path[:]
        if len(path) >= 12:
            return
        for nxt in graph.get(cur, []):
            if nxt in seen:
                continue
            seen.add(nxt)
            path.append(nxt)
            dfs(nxt, path, seen, score + score_map.get((cur, nxt), 1))
            path.pop()
            seen.remove(nxt)

    for n in nodes:
        dfs(n, [n], {n}, 0)
    return best_path


def build_graph_overview_data(module_stats, internal_edges, cross_file_call_edges, layer_map):
    edge_weight_map = Counter()
    edge_type_map = defaultdict(set)

    for src, dst in internal_edges:
        edge_weight_map[(src, dst)] += 1
        edge_type_map[(src, dst)].add("import")

    for edge in cross_file_call_edges:
        src = edge["from"]
        dst = edge["to"]
        w = int(edge["weight"])
        edge_weight_map[(src, dst)] += max(1, w)
        edge_type_map[(src, dst)].add("call")

    stat_map = {m["module"]: m for m in module_stats}
    nodes = []
    for module, info in stat_map.items():
        importance = info["in_degree"] + info["out_degree"]
        size = 30 + min(34, importance * 5)
        nodes.append({
            "id": module,
            "label": module,
            "layer": layer_map.get(module, "other"),
            "in_degree": info["in_degree"],
            "out_degree": info["out_degree"],
            "size": size,
        })

    edges = []
    for (src, dst), w in edge_weight_map.items():
        edge_types = edge_type_map[(src, dst)]
        relation = "mixed" if len(edge_types) > 1 else next(iter(edge_types))
        edges.append({
            "source": src,
            "target": dst,
            "weight": w,
            "relation": relation,
        })

    return {"nodes": nodes, "edges": edges}


def build_chain_flow_data(chain):
    if not chain:
        chain = ["(未识别到主链路)"]

    nodes = []
    edges = []
    start_x = 60
    gap_x = 280
    y = 120

    for i, module in enumerate(chain):
        node_id = f"step_{i + 1}"
        nodes.append({
            "id": node_id,
            "shape": "rect",
            "x": start_x + i * gap_x,
            "y": y,
            "width": 220,
            "height": 64,
            "label": f"{i + 1}. {module}",
            "module": module,
        })
        if i > 0:
            edges.append({
                "source": f"step_{i}",
                "target": node_id,
                "labels": [{"attrs": {"text": {"text": "调用/依赖"}}}],
            })

    return {"nodes": nodes, "edges": edges}


def build_cn_insights(summary, layer_counts, layer_edges, weighted_chain, top_external):
    pieces = [
        f"该项目共扫描 {summary['total_files']} 个源码文件，识别到 {summary['internal_edges']} 条内部依赖边。",
    ]

    if layer_counts:
        layer_desc = "，".join([f"{k}:{v}" for k, v in sorted(layer_counts.items(), key=lambda x: (-x[1], x[0]))])
        pieces.append(f"分层分布为：{layer_desc}。")

    if layer_edges:
        top_layer = layer_edges[0]
        pieces.append(f"最强层间流向是 {top_layer['from']} -> {top_layer['to']}（权重 {top_layer['weight']}）。")

    if weighted_chain:
        pieces.append("主链路为：" + " -> ".join(weighted_chain) + "。")
    else:
        pieces.append("当前未识别到明显主链路，可优先检查入口模块命名与导入关系。")

    if top_external:
        ext_name, ext_count = top_external[0]
        pieces.append(f"外部依赖中最常见的是 {ext_name}（出现 {ext_count} 次）。")

    return pieces


def to_table_rows(items, cols):
    rows = []
    for item in items:
        tds = "".join(f"<td>{escape(str(item.get(col, '-')))}</td>" for col in cols)
        rows.append(f"<tr>{tds}</tr>")
    return "\n".join(rows)


def generate_html(report):
    dep_rows = to_table_rows(report["module_stats"], ["module", "in_degree", "out_degree", "external_deps"])
    call_rows = to_table_rows(report["call_stats"], ["file", "defs", "top_calls"])
    endpoint_rows = to_table_rows(report["endpoint_stats"], ["file", "framework", "method", "path"])

    layer_rows = "\n".join(
        f"<tr><td>{escape(k)}</td><td>{v}</td></tr>"
        for k, v in sorted(report["layer_counts"].items(), key=lambda x: (-x[1], x[0]))
    )

    ext_rows = "\n".join(
        f"<tr><td>{escape(name)}</td><td>{count}</td></tr>"
        for name, count in report["summary"]["top_external_dependencies"]
    )

    insights = "\n".join(
        f'<li><span class="insight-dot"></span>{escape(x)}</li>'
        for x in report["insight_cn"]
    )

    html = """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>项目逻辑可视化报告</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@antv/g6@4.8.25/dist/g6.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@antv/x6@1.34.6/dist/x6.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@antv/g2plot@2.4.35/dist/g2plot.min.js"></script>
  <style>
    :root {
      --bg: #0a0e1a;
      --surface: #0f1629;
      --card: #131929;
      --card-hover: #1a2235;
      --border: rgba(99,120,180,0.18);
      --border-bright: rgba(99,120,180,0.35);
      --text: #e2e8f0;
      --text-muted: #8892a4;
      --text-dim: #556070;
      --primary: #3b82f6;
      --primary-glow: rgba(59,130,246,0.25);
      --teal: #14b8a6;
      --teal-glow: rgba(20,184,166,0.2);
      --purple: #a78bfa;
      --amber: #f59e0b;
      --green: #22c55e;
      --red: #f43f5e;
      --grad-hero: linear-gradient(135deg, #0d1b3e 0%, #0a1628 50%, #0d2340 100%);
      --font-sans: 'Inter', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
      --radius-sm: 8px;
      --radius: 12px;
      --radius-lg: 16px;
      --radius-xl: 20px;
      --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
      --shadow-glow-blue: 0 0 24px rgba(59,130,246,0.15);
      --shadow-glow-teal: 0 0 24px rgba(20,184,166,0.12);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { scroll-behavior: smooth; }

    body {
      font-family: var(--font-sans);
      color: var(--text);
      background: var(--bg);
      min-height: 100vh;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Noise texture overlay ── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
      opacity: 0.6;
    }

    /* ── Ambient glow blobs ── */
    body::after {
      content: '';
      position: fixed;
      top: -200px; left: -200px;
      width: 700px; height: 700px;
      background: radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .wrap {
      max-width: 1440px;
      margin: 0 auto;
      padding: 28px 32px;
      position: relative;
      z-index: 1;
    }

    /* ── Hero ── */
    .hero {
      background: var(--grad-hero);
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: var(--radius-xl);
      padding: 32px 36px;
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow-card), var(--shadow-glow-blue);
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -60px; right: -80px;
      width: 320px; height: 320px;
      background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero::after {
      content: '';
      position: absolute;
      bottom: -40px; left: 30%;
      width: 200px; height: 200px;
      background: radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(59,130,246,0.15);
      border: 1px solid rgba(59,130,246,0.3);
      color: #93c5fd;
      border-radius: 100px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .hero-badge::before { content: '◈'; font-size: 10px; }
    .hero h1 {
      font-size: clamp(24px, 3vw, 36px);
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.02em;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    .hero p {
      color: #94a3b8;
      font-size: 15px;
      max-width: 600px;
      font-weight: 400;
    }
    .hero-meta {
      display: flex;
      gap: 24px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .hero-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #64748b;
      font-size: 13px;
    }
    .hero-meta-item span { color: #94a3b8; }

    /* ── KPI Grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 20px;
    }
    .kpi {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px 22px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
      cursor: default;
    }
    .kpi:hover {
      border-color: var(--border-bright);
      transform: translateY(-2px);
      box-shadow: var(--shadow-card), 0 0 20px rgba(59,130,246,0.1);
    }
    .kpi::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--primary), var(--teal));
      opacity: 0;
      transition: opacity 0.2s;
    }
    .kpi:hover::before { opacity: 1; }
    .kpi-label {
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .kpi-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--text);
      font-family: var(--font-mono);
      margin-top: 8px;
      background: linear-gradient(135deg, #e2e8f0, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .kpi-icon {
      position: absolute;
      top: 16px; right: 16px;
      font-size: 20px;
      opacity: 0.3;
    }

    /* ── Section ── */
    .section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      margin-top: 16px;
      box-shadow: var(--shadow-card);
      transition: border-color 0.2s;
    }
    .section:hover { border-color: var(--border-bright); }

    .sec-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .sec-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sec-icon {
      width: 32px; height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
    }
    .sec-icon.blue { background: rgba(59,130,246,0.15); }
    .sec-icon.teal { background: rgba(20,184,166,0.15); }
    .sec-icon.purple { background: rgba(167,139,250,0.15); }
    .sec-icon.amber { background: rgba(245,158,11,0.15); }
    .sec-icon.green { background: rgba(34,197,94,0.15); }

    .sec-head h2 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
      letter-spacing: -0.01em;
    }
    .sec-tag {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-dim);
      background: rgba(99,120,180,0.1);
      border: 1px solid var(--border);
      border-radius: 100px;
      padding: 2px 8px;
    }

    /* ── Buttons ── */
    .btns { display: flex; gap: 6px; flex-wrap: wrap; }
    button {
      background: rgba(99,120,180,0.08);
      border: 1px solid var(--border);
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      font-family: var(--font-sans);
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }
    button:hover {
      background: rgba(59,130,246,0.12);
      border-color: rgba(59,130,246,0.4);
      color: #93c5fd;
    }
    button.primary-btn {
      background: rgba(59,130,246,0.15);
      border-color: rgba(59,130,246,0.4);
      color: #93c5fd;
    }

    /* ── Two-col layout ── */
    .two { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 1100px) { .two { grid-template-columns: 1fr 1fr; } }

    /* ── Graph/Chart containers ── */
    .graph-box {
      height: 500px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: #080d1a;
      overflow: hidden;
      position: relative;
    }
    .flow-box {
      height: 400px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: #080d1a;
      overflow: hidden;
    }
    .chart-box { height: 300px; }

    /* ── Explain box ── */
    .explain-box {
      border: 1px solid var(--border);
      background: rgba(59,130,246,0.04);
      border-radius: var(--radius);
      padding: 16px 20px;
      line-height: 1.8;
      color: var(--text-muted);
      min-height: 80px;
      font-size: 14px;
      font-family: var(--font-mono);
      transition: border-color 0.2s;
    }
    .explain-box strong { color: var(--primary); font-family: var(--font-sans); }
    .explain-box div { margin-bottom: 4px; }
    .explain-box:not(:empty):hover { border-color: var(--border-bright); }

    .status-text {
      margin-top: 10px;
      color: var(--text-dim);
      font-size: 12px;
      font-family: var(--font-mono);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--text-dim);
      display: inline-block;
    }
    .status-dot.active {
      background: var(--green);
      box-shadow: 0 0 6px var(--green);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .tool-hint {
      margin-top: 8px;
      color: var(--text-dim);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tool-hint::before { content: '↗'; opacity: 0.5; }

    /* ── Table ── */
    .table-wrap { overflow-x: auto; border-radius: var(--radius-sm); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 500px; }
    thead th {
      background: rgba(99,120,180,0.06);
      color: var(--text-dim);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    tbody td {
      color: var(--text-muted);
      padding: 10px 14px;
      border-bottom: 1px solid rgba(99,120,180,0.08);
      vertical-align: top;
      font-family: var(--font-mono);
      font-size: 12px;
      word-break: break-all;
    }
    tbody tr:hover td { background: rgba(59,130,246,0.04); color: var(--text); }
    tbody tr:last-child td { border-bottom: none; }

    /* ── Insights ── */
    .insight-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .insight-list li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.7;
      padding: 12px 16px;
      background: rgba(99,120,180,0.04);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      transition: border-color 0.2s, background 0.2s;
    }
    .insight-list li:hover {
      border-color: var(--border-bright);
      background: rgba(59,130,246,0.06);
      color: var(--text);
    }
    .insight-dot {
      flex-shrink: 0;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--teal));
      margin-top: 7px;
      box-shadow: 0 0 8px rgba(59,130,246,0.5);
    }

    /* ── Modal ── */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(5, 8, 18, 0.85);
      backdrop-filter: blur(8px);
      padding: 20px;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal.show { display: flex; align-items: stretch; }
    .modal-inner {
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border-bright);
      border-radius: var(--radius-xl);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    }
    .modal-head {
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: rgba(99,120,180,0.05);
    }
    .modal-head strong { color: var(--text); font-size: 14px; font-weight: 600; }
    .modal-body { flex: 1; min-height: 0; }
    #modalCanvas { width: 100%; height: 100%; }

    /* ── Divider ── */
    .section-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--border), transparent);
      margin: 8px 0 16px;
    }

    /* ── Scroll bar ── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(99,120,180,0.3); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(99,120,180,0.5); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>项目逻辑可视化报告</h1>
      <p>先用关系图谱看整体依赖，再用流程图看主链路执行。支持放大预览、缩放、拖拽与重置视图。</p>
    </div>

    <div class="grid">
      <div class="kpi"><div>扫描文件数</div><div class="v">__KPI_TOTAL_FILES__</div></div>
      <div class="kpi"><div>内部模块数</div><div class="v">__KPI_INTERNAL_MODULES__</div></div>
      <div class="kpi"><div>内部依赖边</div><div class="v">__KPI_INTERNAL_EDGES__</div></div>
      <div class="kpi"><div>外部依赖数</div><div class="v">__KPI_EXTERNAL_DEPS__</div></div>
      <div class="kpi"><div>检测到接口</div><div class="v">__KPI_ENDPOINTS__</div></div>
    </div>

    <div class="section">
      <div class="sec-head"><h2>中文链路解读</h2></div>
      <ul class="summary-list">__INSIGHT_LIST__</ul>
    </div>

    <div class="two">
      <div class="section">
        <div class="sec-head">
          <h2>关系图谱：整体依赖关系（G6）</h2>
          <div class="btns">
            <button onclick="fitMainG6()">适配视口</button>
            <button onclick="focusSelectedSubgraph()">聚焦选中节点</button>
            <button onclick="resetGraphFocus()">恢复全图</button>
            <button onclick="openPreview('g6')">放大预览</button>
          </div>
        </div>
        <div id="g6Graph" class="graph-box"></div>
        <div class="tool-hint">操作提示：点击节点可查看中文解释并高亮上下游，再点击“聚焦选中节点”可只看该节点的一跳子图。</div>
      </div>
      <div class="section">
        <div class="sec-head">
          <h2>流程图：主链路逻辑（X6）</h2>
          <div class="btns">
            <button onclick="centerMainX6()">重置视图</button>
            <button onclick="playFlowSteps()">自动播放</button>
            <button onclick="stopFlowPlay()">停止播放</button>
            <button onclick="exportFlowPNG()">导出PNG</button>
            <button onclick="openPreview('x6')">放大预览</button>
          </div>
        </div>
        <div id="x6Flow" class="flow-box"></div>
        <div id="flowPlayStatus" class="status-text">播放状态：未开始</div>
        <div id="flowStepExplain" class="tool-hint">点击流程图步骤，可查看该步骤中文说明。</div>
      </div>
    </div>

    <div class="section">
      <div class="sec-head"><h2>节点中文解释</h2></div>
      <div id="nodeExplain" class="explain-box">点击上方“关系图谱”中的任意节点，这里会显示该模块的上下游解释。</div>
    </div>

    <div class="two">
      <div class="section"><div class="sec-head"><h2>模块上下游强度（AntV G2Plot）</h2></div><div id="chartModule" class="chart-box"></div></div>
      <div class="section"><div class="sec-head"><h2>分层文件分布（AntV G2Plot）</h2></div><div id="chartLayer" class="chart-box"></div></div>
    </div>

    <div class="section"><div class="sec-head"><h2>外部依赖命中（AntV G2Plot）</h2></div><div id="chartExt" class="chart-box"></div></div>

    <div class="section">
      <div class="sec-head"><h2>模块上下游明细</h2></div>
      <table>
        <thead><tr><th>模块</th><th>上游(in)</th><th>下游(out)</th><th>外部依赖</th></tr></thead>
        <tbody>__DEP_ROWS__</tbody>
      </table>
    </div>

    <div class="section">
      <div class="sec-head"><h2>函数定义与调用概览（保留英文符号）</h2></div>
      <table>
        <thead><tr><th>文件</th><th>定义</th><th>高频调用</th></tr></thead>
        <tbody>__CALL_ROWS__</tbody>
      </table>
    </div>

    <div class="two">
      <div class="section">
        <div class="sec-head"><h2>分层统计</h2></div>
        <table>
          <thead><tr><th>层</th><th>文件数</th></tr></thead>
          <tbody>__LAYER_ROWS__</tbody>
        </table>
      </div>
      <div class="section">
        <div class="sec-head"><h2>外部依赖明细</h2></div>
        <table>
          <thead><tr><th>依赖</th><th>出现次数</th></tr></thead>
          <tbody>__EXT_ROWS__</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="sec-head"><h2>HTTP 入口（检测结果）</h2></div>
      <table>
        <thead><tr><th>文件</th><th>框架类型</th><th>方法</th><th>路径</th></tr></thead>
        <tbody>__ENDPOINT_ROWS__</tbody>
      </table>
    </div>
  </div>

  <div id="previewModal" class="modal">
    <div class="modal-inner">
      <div class="modal-head">
        <strong id="modalTitle">图表预览</strong>
        <div class="btns">
          <button onclick="fitPreview()">适配视口</button>
          <button onclick="closePreview()">关闭</button>
        </div>
      </div>
      <div class="modal-body"><div id="modalCanvas"></div></div>
    </div>
  </div>

  <script>
    const report = __REPORT_JSON__;
    const layerColors = __LAYER_COLORS_JSON__;
    const fullGraphData = JSON.parse(JSON.stringify(report.graph_overview));
    let mainG6 = null;
    let mainX6 = null;
    let previewGraph = null;
    let previewType = null;
    let flowPlayTimer = null;
    let selectedNodeId = null;

    function resolveX6Lib() {
      if (window.X6 && window.X6.Graph) return window.X6;
      if (window.AntV && window.AntV.X6 && window.AntV.X6.Graph) return window.AntV.X6;
      return null;
    }

    const X6Lib = resolveX6Lib();

    function graphSize(el) {
      const rect = el.getBoundingClientRect();
      return { width: Math.max(320, Math.floor(rect.width)), height: Math.max(260, Math.floor(rect.height)) };
    }

    function edgeColor(rel) {
      if (rel === 'call') return '#0d9488';
      if (rel === 'mixed') return '#7c3aed';
      return '#64748b';
    }

    function renderG6(containerId, data) {
      const container = document.getElementById(containerId);
      const size = graphSize(container);
      if (container.__g6) container.__g6.destroy();

      const graph = new G6.Graph({
        container: containerId,
        width: size.width,
        height: size.height,
        modes: { default: ['drag-canvas', 'zoom-canvas', 'drag-node'] },
        layout: { type: 'force', preventOverlap: true, linkDistance: 180, nodeStrength: -150 },
        defaultNode: {
          type: 'circle',
          style: { lineWidth: 1.2, stroke: '#dbe7ef' },
          labelCfg: { style: { fill: '#102033', fontSize: 11 } },
        },
        defaultEdge: {
          style: { endArrow: true, opacity: 0.7, lineWidth: 1.2 },
          labelCfg: { autoRotate: true, style: { fontSize: 10, fill: '#425466' } },
        },
        nodeStateStyles: { inactive: { opacity: 0.16 }, active: { lineWidth: 3, stroke: '#ef7d00' } },
        edgeStateStyles: { inactive: { opacity: 0.08 }, active: { opacity: 1 } },
      });

      graph.data({
        nodes: data.nodes.map(n => ({ ...n, style: { fill: layerColors[n.layer] || '#64748b' }, size: n.size })),
        edges: data.edges.map(e => ({
          ...e,
          label: String(e.weight),
          style: { stroke: edgeColor(e.relation), endArrow: true, lineWidth: Math.min(4, 1 + e.weight * 0.3) },
        })),
      });

      graph.render();
      graph.fitView(16);

      // Force layout can settle after initial paint; fit again to avoid first-screen blank graph.
      graph.on('afterlayout', () => {
        try { graph.fitView(16); } catch (e) {}
      });
      setTimeout(() => {
        try { graph.fitView(16); } catch (e) {}
      }, 220);

      graph.on('node:click', evt => {
        const model = evt.item.getModel();
        selectedNodeId = model.id;
        updateNodeExplain(model.id);
        applyGraphHighlight(model.id);
      });

      graph.on('canvas:click', () => {
        clearGraphHighlight();
      });

      container.__g6 = graph;
      return graph;
    }

    function relatedNodeSet(nodeId, data) {
      const set = new Set([nodeId]);
      data.edges.forEach(e => {
        if (e.source === nodeId) set.add(e.target);
        if (e.target === nodeId) set.add(e.source);
      });
      return set;
    }

    function applyGraphHighlight(nodeId) {
      if (!mainG6) return;
      const around = relatedNodeSet(nodeId, report.graph_overview);
      mainG6.getNodes().forEach(node => {
        const id = node.getID();
        mainG6.clearItemStates(node);
        if (!around.has(id)) mainG6.setItemState(node, 'inactive', true);
        if (id === nodeId) mainG6.setItemState(node, 'active', true);
      });

      mainG6.getEdges().forEach(edge => {
        const m = edge.getModel();
        mainG6.clearItemStates(edge);
        const active = m.source === nodeId || m.target === nodeId;
        if (!active) mainG6.setItemState(edge, 'inactive', true);
        else mainG6.setItemState(edge, 'active', true);
      });
    }

    function clearGraphHighlight() {
      if (!mainG6) return;
      mainG6.getNodes().forEach(node => mainG6.clearItemStates(node));
      mainG6.getEdges().forEach(edge => mainG6.clearItemStates(edge));
    }

    function focusSelectedSubgraph() {
      if (!mainG6 || !selectedNodeId) return;
      const around = relatedNodeSet(selectedNodeId, fullGraphData);
      const nodes = fullGraphData.nodes.filter(n => around.has(n.id));
      const edges = fullGraphData.edges.filter(e => around.has(e.source) && around.has(e.target));
      mainG6.changeData({ nodes, edges });
      mainG6.fitView(16);
      applyGraphHighlight(selectedNodeId);
    }

    function resetGraphFocus() {
      if (!mainG6) return;
      mainG6.changeData(fullGraphData);
      mainG6.fitView(16);
      clearGraphHighlight();
    }

    function renderX6(containerId, flow) {
      const container = document.getElementById(containerId);
      if (container.__x6) container.__x6.dispose();

      if (!X6Lib) {
        container.innerHTML = '<div style="padding:16px;color:#8b1e1e;">X6 加载失败：未找到全局对象，请检查网络或 CDN 可用性。</div>';
        return null;
      }

      const graph = new X6Lib.Graph({
        container,
        background: { color: '#fbfdff' },
        grid: { visible: true, size: 14 },
        panning: true,
        mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'], minScale: 0.35, maxScale: 3 },
        connecting: { router: 'manhattan', connector: 'rounded' },
      });

      const nodes = flow.nodes.map(n => ({
        id: n.id,
        shape: 'rect',
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        attrs: {
          body: { fill: '#f2f8ff', stroke: '#91aec3', rx: 10, ry: 10 },
          label: { text: n.label, fill: '#132638', fontSize: 12 },
        },
      }));

      const edges = flow.edges.map(e => ({
        source: e.source,
        target: e.target,
        labels: e.labels,
        attrs: {
          line: {
            stroke: '#0f766e',
            strokeWidth: 1.6,
            targetMarker: { name: 'classic', size: 7 },
          },
        },
      }));

      graph.fromJSON({ nodes, edges });
      graph.centerContent();
      graph.zoomTo(0.95);

      graph.on('node:click', ({ node }) => {
        updateFlowStepExplain(node.id);
      });

      container.__x6 = graph;
      return graph;
    }

    function renderBarCharts() {
      const depData = report.module_stats.slice(0, 20).map(x => ({ name: x.module, value: x.in_degree + x.out_degree }));
      const layerData = Object.entries(report.layer_counts).map(([name, value]) => ({ name, value }));
      const extData = report.summary.top_external_dependencies.slice(0, 12).map(([name, value]) => ({ name, value }));

      const depPlot = new G2Plot.Column('chartModule', {
        data: depData,
        xField: 'name',
        yField: 'value',
        label: { position: 'top' },
        xAxis: { label: { autoHide: true, autoRotate: true } },
        color: '#0ea5a4',
      });
      depPlot.render();

      const layerPlot = new G2Plot.Column('chartLayer', {
        data: layerData,
        xField: 'name',
        yField: 'value',
        label: { position: 'top' },
        color: '#3b82f6',
      });
      layerPlot.render();

      const extPlot = new G2Plot.Column('chartExt', {
        data: extData,
        xField: 'name',
        yField: 'value',
        label: { position: 'top' },
        xAxis: { label: { autoHide: true, autoRotate: true } },
        color: '#f59e0b',
      });
      extPlot.render();
    }

    function fitMainG6() {
      if (mainG6) mainG6.fitView(16);
    }

    function centerMainX6() {
      if (mainX6) {
        mainX6.zoomTo(1);
        mainX6.centerContent();
      }
    }

    function updateNodeExplain(moduleId) {
      const box = document.getElementById('nodeExplain');
      const stat = report.module_stats.find(x => x.module === moduleId);
      if (!stat) {
        box.textContent = `模块 ${moduleId} 的统计信息不可用。`;
        return;
      }

      const upstream = report.graph_overview.edges.filter(e => e.target === moduleId);
      const downstream = report.graph_overview.edges.filter(e => e.source === moduleId);
      const upText = upstream.length ? upstream.map(e => `${e.source}(${e.weight})`).join('，') : '无';
      const downText = downstream.length ? downstream.map(e => `${e.target}(${e.weight})`).join('，') : '无';

      box.innerHTML = `
        <div><strong>${moduleId}</strong></div>
        <div>上游依赖：${upText}</div>
        <div>下游依赖：${downText}</div>
        <div>入度/出度：${stat.in_degree}/${stat.out_degree}，外部依赖：${stat.external_deps}</div>
      `;
    }

    function updateFlowStepExplain(nodeId) {
      const box = document.getElementById('flowStepExplain');
      const index = report.flow_x6.nodes.findIndex(n => n.id === nodeId);
      if (index < 0) {
        box.textContent = '点击流程图步骤，可查看该步骤中文说明。';
        return;
      }
      const step = report.flow_x6.nodes[index];
      const prev = index > 0 ? report.flow_x6.nodes[index - 1].module : '入口步骤';
      const next = index < report.flow_x6.nodes.length - 1 ? report.flow_x6.nodes[index + 1].module : '链路结束';
      box.textContent = `步骤 ${index + 1}/${report.flow_x6.nodes.length}：${step.module}。前驱：${prev}；后继：${next}。`;
    }

    function setFlowNodeStyle(nodeId, active) {
      if (!mainX6) return;
      const node = mainX6.getCellById(nodeId);
      if (!node || !node.isNode()) return;
      node.setAttrs({
        body: {
          fill: active ? '#fff4cf' : '#f2f8ff',
          stroke: active ? '#d97706' : '#91aec3',
        },
      });
    }

    function stopFlowPlay() {
      if (flowPlayTimer) {
        clearInterval(flowPlayTimer);
        flowPlayTimer = null;
      }
      if (report.flow_x6 && report.flow_x6.nodes) {
        report.flow_x6.nodes.forEach(n => setFlowNodeStyle(n.id, false));
      }
      const status = document.getElementById('flowPlayStatus');
      status.textContent = '播放状态：已停止';
    }

    function playFlowSteps() {
      if (!mainX6 || !report.flow_x6 || !report.flow_x6.nodes || report.flow_x6.nodes.length === 0) return;
      stopFlowPlay();
      const status = document.getElementById('flowPlayStatus');
      const ids = report.flow_x6.nodes.map(n => n.id);
      let idx = 0;
      flowPlayTimer = setInterval(() => {
        ids.forEach(id => setFlowNodeStyle(id, false));
        const current = ids[idx % ids.length];
        setFlowNodeStyle(current, true);
        status.textContent = `播放状态：步骤 ${idx % ids.length + 1}/${ids.length}`;
        updateFlowStepExplain(current);
        idx += 1;
      }, 1000);
    }

    function downloadDataUrl(dataUrl, filename) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
    }

    function exportFlowPNG() {
      const host = document.getElementById('x6Flow');
      const svg = host.querySelector('svg');
      if (svg) {
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svg);
        const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1200, host.clientWidth);
          canvas.height = Math.max(600, host.clientHeight);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          downloadDataUrl(canvas.toDataURL('image/png'), 'flow-x6.png');
          URL.revokeObjectURL(url);
        };
        img.src = url;
        return;
      }

      const canvas = host.querySelector('canvas');
      if (canvas && canvas.toDataURL) {
        downloadDataUrl(canvas.toDataURL('image/png'), 'flow-x6.png');
        return;
      }

      alert('未找到可导出的流程图画布。');
    }

    function openPreview(type) {
      previewType = type;
      const modal = document.getElementById('previewModal');
      const canvas = document.getElementById('modalCanvas');
      const title = document.getElementById('modalTitle');
      canvas.innerHTML = '';
      modal.classList.add('show');

      if (previewGraph) {
        if (previewGraph.destroy) previewGraph.destroy();
        if (previewGraph.dispose) previewGraph.dispose();
      }

      if (type === 'g6') {
        title.textContent = '关系图谱 - 放大预览';
        previewGraph = renderG6('modalCanvas', report.graph_overview);
      } else {
        title.textContent = '主链路流程图 - 放大预览';
        previewGraph = renderX6('modalCanvas', report.flow_x6);
      }
    }

    function fitPreview() {
      if (!previewGraph) return;
      if (previewType === 'g6' && previewGraph.fitView) previewGraph.fitView(16);
      if (previewType === 'x6') {
        previewGraph.zoomTo(1);
        previewGraph.centerContent();
      }
    }

    function closePreview() {
      const modal = document.getElementById('previewModal');
      modal.classList.remove('show');
      if (previewGraph) {
        if (previewGraph.destroy) previewGraph.destroy();
        if (previewGraph.dispose) previewGraph.dispose();
        previewGraph = null;
      }
    }

    document.getElementById('previewModal').addEventListener('click', evt => {
      if (evt.target.id === 'previewModal') closePreview();
    });

    mainG6 = renderG6('g6Graph', report.graph_overview);
    mainX6 = renderX6('x6Flow', report.flow_x6);
    if (report.graph_overview && report.graph_overview.nodes && report.graph_overview.nodes.length > 0) {
      updateNodeExplain(report.graph_overview.nodes[0].id);
    }
    if (report.flow_x6 && report.flow_x6.nodes && report.flow_x6.nodes.length > 0) {
      updateFlowStepExplain(report.flow_x6.nodes[0].id);
    }
    renderBarCharts();

    window.addEventListener('resize', () => {
      if (mainG6) {
        const box = document.getElementById('g6Graph');
        const size = graphSize(box);
        mainG6.changeSize(size.width, size.height);
        mainG6.fitView(16);
      }
      if (mainX6) mainX6.centerContent();
    });
  </script>
</body>
</html>
"""

    html = html.replace("__REPORT_JSON__", json.dumps(report, ensure_ascii=False))
    html = html.replace("__LAYER_COLORS_JSON__", json.dumps(LAYER_COLORS, ensure_ascii=False))
    html = html.replace("__KPI_TOTAL_FILES__", str(report["summary"]["total_files"]))
    html = html.replace("__KPI_INTERNAL_MODULES__", str(report["summary"]["internal_modules"]))
    html = html.replace("__KPI_INTERNAL_EDGES__", str(report["summary"]["internal_edges"]))
    html = html.replace("__KPI_EXTERNAL_DEPS__", str(report["summary"]["external_dependencies"]))
    html = html.replace("__KPI_ENDPOINTS__", str(report["summary"]["endpoint_count"]))
    html = html.replace("__INSIGHT_LIST__", insights)
    html = html.replace("__DEP_ROWS__", dep_rows if dep_rows else '<tr><td colspan="4">暂无数据</td></tr>')
    html = html.replace("__CALL_ROWS__", call_rows if call_rows else '<tr><td colspan="3">暂无数据</td></tr>')
    html = html.replace("__LAYER_ROWS__", layer_rows if layer_rows else '<tr><td colspan="2">暂无数据</td></tr>')
    html = html.replace("__EXT_ROWS__", ext_rows if ext_rows else '<tr><td colspan="2">无外部依赖</td></tr>')
    html = html.replace("__ENDPOINT_ROWS__", endpoint_rows if endpoint_rows else '<tr><td colspan="4">未检测到接口声明</td></tr>')
    return html


def main():
    parser = argparse.ArgumentParser(description="Generate project logic visualization html")
    parser.add_argument("--project-root", default=".", help="Project root path")
    parser.add_argument("--output-html", default="reports/logic-visualization.html", help="Output html path")
    parser.add_argument("--output-json", default="reports/logic-visualization.json", help="Output json path")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    files = list(iter_source_files(root))

    internal_modules = []
    all_external = Counter()
    internal_edges = []
    file_calls = []
    endpoint_stats = []
    layer_counts = Counter()
    layer_edges = Counter()
    per_file_defs = {}
    per_file_calls = {}
    layer_map = {}

    known_files = {normalize_module_path(f, root): f for f in files}

    for f in files:
        rel = normalize_module_path(f, root)
        internal_modules.append(rel)
        layer = classify_layer(rel)
        layer_counts[layer] += 1
        layer_map[rel] = layer
        text = safe_read(f)

        defs, calls = extract_defs_and_calls(f, text)
        per_file_defs[rel] = defs
        per_file_calls[rel] = calls

        call_counter = Counter(calls)
        top_calls = ", ".join([f"{k}({v})" for k, v in call_counter.most_common(8)])
        file_calls.append({
            "file": rel,
            "defs": ", ".join(defs[:20]) if defs else "-",
            "top_calls": top_calls if top_calls else "-",
        })

        eps = extract_endpoints(f, text)
        for ep in eps:
            ep["file"] = rel
            endpoint_stats.append(ep)

        if f.suffix == ".py":
            imports = extract_py_imports(text)
        elif f.suffix in {".js", ".ts", ".tsx", ".jsx"}:
            imports = extract_js_imports(text)
        else:
            imports = []

        for imp in imports:
            internal_target = resolve_relative_import(f, imp, root)
            if not internal_target and f.suffix == ".py":
                internal_target = resolve_absolute_python_import(imp, root)

            if internal_target and internal_target in known_files:
                internal_edges.append((rel, internal_target))
                layer_edges[(layer, classify_layer(internal_target))] += 1
            else:
                top = imp.split(".")[0].lstrip(".") or imp
                if top:
                    all_external[top] += 1

    symbol_to_files = defaultdict(set)
    for file_name, defs in per_file_defs.items():
        for d in defs:
            symbol_to_files[d].add(file_name)

    call_edge_counter = Counter()
    for caller, calls in per_file_calls.items():
        for call in calls:
            targets = symbol_to_files.get(call, set())
            if len(targets) == 1:
                target = next(iter(targets))
                if target != caller:
                    call_edge_counter[(caller, target)] += 1

    cross_file_call_edges = [
        {"from": src, "to": dst, "weight": w}
        for (src, dst), w in call_edge_counter.most_common(80)
    ]

    in_deg = Counter()
    out_deg = Counter()
    for a, b in internal_edges:
        out_deg[a] += 1
        in_deg[b] += 1

    per_module_external = defaultdict(int)
    for f in files:
        text = safe_read(f)
        if f.suffix == ".py":
            imports = extract_py_imports(text)
        elif f.suffix in {".js", ".ts", ".tsx", ".jsx"}:
            imports = extract_js_imports(text)
        else:
            imports = []
        ext_count = sum(1 for imp in imports if not imp.startswith("."))
        per_module_external[normalize_module_path(f, root)] = ext_count

    module_stats = []
    for m in sorted(set(internal_modules), key=lambda x: (-(in_deg[x] + out_deg[x]), x)):
        module_stats.append({
            "module": m,
            "in_degree": in_deg[m],
            "out_degree": out_deg[m],
            "external_deps": per_module_external[m],
        })

    chain = longest_chain(internal_modules, internal_edges)

    weighted_edge_scores = Counter()
    for a, b in internal_edges:
        weighted_edge_scores[(a, b)] += 1
    for edge in cross_file_call_edges:
        weighted_edge_scores[(edge["from"], edge["to"])] += max(1, int(edge["weight"]))

    weighted_chain = longest_chain_with_score(internal_modules, list(weighted_edge_scores.keys()), weighted_edge_scores)

    summary = {
        "total_files": len(files),
        "internal_modules": len(set(internal_modules)),
        "internal_edges": len(internal_edges),
        "external_dependencies": len(all_external),
        "endpoint_count": len(endpoint_stats),
        "top_external_dependencies": all_external.most_common(20),
        "likely_execution_chain": chain,
        "weighted_execution_chain": weighted_chain,
    }

    layer_edges_sorted = [{"from": a, "to": b, "weight": w} for (a, b), w in layer_edges.most_common(50)]

    report = {
        "summary": summary,
        "module_stats": module_stats,
        "call_stats": file_calls,
        "endpoint_stats": endpoint_stats,
        "layer_counts": dict(layer_counts),
        "layer_edges": layer_edges_sorted,
        "cross_file_call_edges": cross_file_call_edges,
        "internal_edges": [{"from": a, "to": b} for a, b in internal_edges],
        "graph_overview": build_graph_overview_data(module_stats, internal_edges, cross_file_call_edges, layer_map),
        "flow_x6": build_chain_flow_data(weighted_chain if weighted_chain else chain),
        "insight_cn": build_cn_insights(
            summary,
            dict(layer_counts),
            layer_edges_sorted,
            weighted_chain if weighted_chain else chain,
            summary["top_external_dependencies"],
        ),
    }

    output_html = Path(args.output_html)
    output_json = Path(args.output_json)
    output_html.parent.mkdir(parents=True, exist_ok=True)

    output_json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    output_html.write_text(generate_html(report), encoding="utf-8")

    print(f"HTML generated: {output_html}")
    print(f"JSON generated: {output_json}")


if __name__ == "__main__":
    main()
