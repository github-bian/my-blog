---
name: logic-visualizer
description: "Use when user asks to visualize project logic with charts, flowcharts, sequence diagrams, dependency chains, call chains, upstream/downstream relations, and generate an HTML architecture page. 当用户要求可视化项目逻辑、生成架构图、流程图、依赖图、调用链图时使用。"
argument-hint: "[项目路径（可选，默认为当前目录）]"
---

# Logic Visualizer Skill — 项目逻辑可视化

## 用途
扫描项目源码，静态分析依赖关系与调用链，生成一个包含多种图表的 HTML 架构总览页面。

## 输入参数
- `project_root`（可选）：项目根路径，默认为当前目录 `.`
- `output_html`（可选）：输出 HTML 路径，默认 `reports/logic-visualization.html`

## 执行步骤
1. 扫描 `project_root` 下所有源码文件（.py / .js / .ts / .tsx / .jsx 等）。
2. 提取以下信息：
   - 模块间依赖关系（内部模块边 + 外部依赖统计）
   - 函数定义与调用 token
   - 跨文件调用边（依据唯一符号定义推断）
   - 上下游依赖关系（入度 / 出度）
   - 加权执行链（综合 import 边与调用边权重）
   - 分层架构分布（api / service / repository / ui / infra / other）
   - Web 入口 / HTTP 接口（Flask / FastAPI / Express 风格识别）
3. 生成以下输出：
   - HTML 页面（关系图谱 + 主链路流程图 + AntV 统计图 + 多张明细表 + 中文解读摘要）
   - JSON 原始分析数据文件

## 运行命令
```
python3 .claude/skills/logic-visualizer/generate_architecture_report.py \
  --project-root <项目路径> \
  --output-html reports/logic-visualization.html \
  --output-json reports/logic-visualization.json
```

## 输出文件
- `reports/logic-visualization.html` — 可视化架构页面（浏览器直接打开）
- `reports/logic-visualization.json` — 完整原始分析数据

## 注意事项
- 本 Skill 基于静态启发式分析，适合快速梳理架构全貌，不是精确类型分析。
- 页面使用 AntV 生态：G6（关系图谱）+ X6（流程图）+ G2Plot（统计图），打开 HTML 时需要联网加载 CDN。
- 关系图谱与流程图都支持“放大预览”，便于查看复杂链路细节。
- 项目文件较多时建议先对某个子目录运行，再对整体运行。

## Output
- `reports/logic-visualization.html`
- `reports/logic-visualization.json`

## Notes
- This skill is heuristic-based static analysis for quick architecture understanding.
- Uses AntV stack via CDN: G6 for relationship graph, X6 for flow graph, and G2Plot for statistical charts.
- Supports fullscreen preview, graph node focus, and flow-step autoplay/export.
- If your project is large, run this skill at module scope first (subfolder), then run full-repo for global view.
