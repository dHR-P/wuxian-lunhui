# 素材接线（孤立资产接入显示）· 设计落盘

> 角色：素材接线子代理（`tokenrhythm/deepseek-v4-flash-0731`）
> 改动范围：**仅** `server-rs/ui/index.html`、`server-rs/ui/css/style.css`、`server-rs/ui/js/client.js`
> （纯前端接线显示，不改 Rust / window.__TAURI__ 交互契约 / world2d.js / zone3d.js）。
> 未 build。

---

## 1. 现状盘点（改动前确认）

- **NPC 立绘**（美术已生成，代码零引用）：
  - `assets/img/pc_zhengzha.png`（郑吒）、`pc_chuxuan.png`（楚轩）、`pc_zhanlan.png`（詹岚）、
    `pc_zhaoyingkong.png`（赵樱空）、`img_zhangjie.png`（张杰）。
  - 前端对话/场景界面 `#narrBox` 只渲染 `#speaker`（名字）+ `#narrText`（段落），**无立绘插槽**。
- **道具/武器图标**：`assets/img/item_*.png`（本次盘点到 19 张：antidote/bandage/bottle_water/core/
  fragment/grenade/health/holy/holy_water/jiezhou_fu/medkit/quzhen_fu/rune/sedative/silver_bullet/
  stone/torch 等）已生成。
  - 兑换/道具界面在当前前端**没有独立条目 DOM**：`api_nexus`/`api_nexus_enter` 只走 `showCard`
    （卡片 body_html）与 world 视图；物品在世界地图里由 `world2d.js` 以 `itemIconIdx` 精灵绘制
    （不在本次改动范围内）。`client.js` 内本无按物品 id 列图标处。

## 2. 立绘插槽怎么加

`index.html` 在 `#narrBox` 顶部新增一处头部容器 + 立绘 `<img>`：

```html
<div id="narrBox">
  <div class="narrHead">
    <img id="speakerPortrait" alt="" src="" hidden onerror="this.hidden=true">
    <div class="narrHeadText"><span id="speaker"></span></div>
  </div>
  <div id="narrText"></div>
  ...
```

- `#speakerPortrait` 默认 `hidden`；`onerror` 内联兜底 → 加载失败即隐藏。
- `css/style.css` 新增 `.narrHead`（flex，图+名同行）、`#speakerPortrait`（64×64 cover、圆角描边、
  顶部对齐人像）、`#speakerPortrait[hidden]{display:none}`、`.narrHeadText`（名字区自动撑满）。

## 3. speaker → 立绘 映射

`client.js` 顶部新增常量映射 + `applySpeakerPortrait(speaker)`：

```js
const SPEAKER_PORTRAITS = {
  "张杰": "img_zhangjie",
  "郑吒": "pc_zhengzha",
  "楚轩": "pc_chuxuan",
  "詹岚": "pc_zhanlan",
  "赵樱空": "pc_zhaoyingkong",
};
const SPEAKER_FALLBACK = "img_zhangjie";   // 其他 NPC 兜底
```

规则：无 speaker → 隐藏并清 src；命中映射 → 用对应立绘；其他带名说话人 → 兜底 `img_zhangjie`。
`onerror` 置 hidden、`onload` 才显示 → 加载失败静默回退，绝不阻断剧情。

### 调用点（两处场景渲染入口，均已接入）
- `renderSceneWithBack(view)`：世界进入的场景/对话（`showStoryScene` → …），在 `$("speaker")` 赋值后
  调用一次 `applySpeakerPortrait(sceneEl.speaker)`。
- `handleView(view)`：标题/续档进入的场景（`api_continue` / `api_choose`），同样在 speaker 赋值后调用。

> 场景始终直接根据 `sceneEl.speaker`（下一句说话名）更新立绘，跨段不残留。

## 4. 道具/武器图标接线

在 `client.js` 新增可复用图标辅助（item_<id>.png 映射 + 静默回退）：

- `itemIconHtml(id)`：清洗非法字符小写化 → 以 `item_`/`wpn_` 前缀拼接
  `assets/img/<candidate>.png`，生成 `<span class="itemIcon"><img … onerror="此图标移除"></span>`；
  无 id / 非法 / 资源不存在 → 返回空串（无图标）。
- `itemIconFor(rec)`：对 `{item|id|name}` 数据对象便捷取值。
- 接入点：`#choices` 按钮，当选项带 `c.item` 字段时前置图标（`btn.innerHTML` 空安全拼接）。
- `css/style.css` 新增 `.itemIcon`：行内 18×18、`vertical-align` 对齐文字、`img object-fit:contain`。

### 接线说明（实事求是）
- 当前 `client.js` **没有独立的兑换列表/道具栏 DOM**（见 §1），故不存在“兑换界面每行加图标”这一 DOM 面。
  本步把图标能力做成通用辅助 + 挂到 choice 条目，一旦后端在选项/条目里带 `item` id 即可直接显图；
  找不到对应 png 则原地回退为空，不改文字布局。
- 世界地图 `world2d.js` 的 `itemIconIdx` 精灵兑底不在授权改动范围内，未动。

## 5. 红线自查

- 未改 Rust；未改 `window.__TAURI__` invoke 契约（只新增纯前端辅助函数）。
- `applySpeakerPortrait` / `itemIconHtml` 全部失败静默回退，不外抛、不 alert、不阻断剧情。
- `node --check js/client.js` → **exit 0**。

## 6. 验收（自读改动段）

- `#speakerPortrait` 插槽存在（index.html narrBox 内），CSS 显示/隐藏完备。
- 映射表覆盖五队友（张杰/郑吒/楚轩/詹岚/赵樱空）+ 兜底张杰。
- 两条场景渲染入口均调用 `applySpeakerPortrait`。
- 图标辅助 + choice 接入 + `.itemIcon` CSS 三处自洽。
- 未 build。

## 7. node --check

```
node --check server-rs/ui/js/client.js  → exit 0
```

## 8. 遗留 / 边界

- `assets/img` 内 `item_*.png` 暂无前端独立道具栏 DOM 消费；若后续做道具背包/兑换列表 UI，
  直接复用 `itemIconHtml(id)`。武器 `wpn_*.png` 若落地也自动被 `ITEM_ICON_BASES` 覆盖。
- 立绘尺寸固定 64×64 首屏容器；若后续想做大立绘可加 `--portrait-lg` 变体，不影响现有文本布局。
- 队友立绘文件（`pc_*`）与 `img_zhangjie.png` 已确认存在于 `assets/img/`；其余 NPC 一律兜底张杰，
  待美术补图后只需在 `SPEAKER_PORTRAITS` 加条目，无需改管线。
