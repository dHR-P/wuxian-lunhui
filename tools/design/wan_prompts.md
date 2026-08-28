# wan2.7-image 正式生成 prompt 库(2026-08-26,rev2)

> 引擎:tokenrhythm wan2.7-image(768x1024,0.2元/张)
> 基线:wan_test1(=pc_wan1)数值体检通过(全身完整/脚在画面内/背景纯黑),本库 prompt 统一继承其成功要素:
> 居中全身、脚底贴近画面底缘、纯黑背景、冷白 rim light 围住内部暗区(flood 抠图可回填)。

## ⚠️ 质检口径(重要,防误判)

- **pc_zhengzha = 主角郑吒:健康亚洲青年男性战士**(深灰蓝紧身T恤+深色战术裤,战士站姿,非丧尸非变异)。
- **hunter = 无皮肤肌肉怪兽**(皮肤灰棕、无衣物、爪+刀、猎杀姿态)。
- 质检子代理 prompt 必须携带与生成一致的正式设定,不要让视觉模型自己猜对象;否则会出现「画错对象」类误判。

## 通用后缀(所有立绘追加)—— rev2 强化版

```
Standing centered full body, feet soles touching the very bottom edge of the frame
(soles cropped slightly by the bottom frame edge), Background: flat pure black,
absolutely uniform matte black, NO floor reflection, NO ground shadow, NO light
gradient, NO glow, NO haze, no visible ground plane at all, nothing behind the
character. A thin cool-white rim light outlines the entire silhouette (hair,
shoulders, arms, torso, legs, clothing hem) as a clean thin line only, no white
glow bleeding into the background. High detail, sharp, single character.
```

> rev2 变更:把「no floor/no shadows」升级为「NO floor reflection / NO ground shadow / NO gradient /
> NO glow / uniform matte black」+「soles cropped slightly by the frame edge(真正贴底被裁切)」,针对
> qc_wan_pc2 检出的地面反光/投影缺陷(历史 c5/c6 泛光缺陷复发)。

## pc_zhengzha(主角郑吒)——v3

```
A Chinese young man with short black hair, dark serious expression, wearing a dark
grayish-blue fitted T-shirt and dark cargo pants, in a heroic battle stance with fists
clenched. He is a normal healthy human warrior, NOT a zombie, NOT mutated. His whole
body including the dark clothing is brightly lit by a cool white key light from the
front, clearly brighter than the background. Both hands fully visible with clear
separate fingers. LARGE full body taking up over 90% of the image height, feet soles
and shoes touching the very bottom edge of the frame, the shoe soles cropped slightly
by the bottom frame edge, standing centered. [通用后缀]
```

> 版本沿革:pc_wan1 合格但留白多→pc_wan2 底部反光/投影(设定位差→实际是背景缺陷)→pc_wan3 修正背景措辞+贴底裁切。

## hunter(猎杀者)——v2

```
A skinless muscular monster, pale gray-brown muscle skin with clear visible muscle
blocks, broad shoulders thick chest, solid dense torso, thick muscular arms and legs,
white bone spikes on forearms, huge claw on left hand, sharp blade on right hand,
in a fierce dynamic low-center lunging hunting pose, knees bent, ready to pounce.
No clothing no fabric. Entire body including the lower abdomen, hips, thighs, calves
and feet is brightly lit with muscular highlights; the lower body must be as bright
and detailed as the upper body, absolutely no dark silhouette on the legs or feet.
Feet on the bottom edge of the frame, soles cropped slightly by the bottom frame edge.
[通用后缀,并把 rim light 句替换为:] A thin cool rim light outlines the silhouette as
a clean thin line only; absolutely NO pure white outline, NO white edge, NO white glow
around the body.
```

> 版本沿革:c6~r7 下半身黑剪影+白描边→wan1(hunter_wan1)下半身已修复,但白描边残留+姿态太静→wan2
> 姿态改低重心扑击+明确 NO white outline。

## 待评估(zombie/licker/guard/horde,现为 19:12 v2 旧档)

- 可先沿用 v2 旧档,待 pc/hunter 定稿后再决定 wan 重生成。