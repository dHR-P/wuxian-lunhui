# 副本场景 bg 批2 生成与质检日志 (bg_50_assets2)

本批 15 张副本场景背景 bg(空镜无人形)。生成模型: wan2.7-image(768x1024); 质检: glm-5.3-flash。
原始文件存放: `tools/design/raw_50bg2/<slug>_bg.png`(未部署)。

## 单张结果

- 心慌方CUBE(xinhuangfang): **PASS** - QC: ****  1) ****  2) **//**“CUBE”  3) ****
- 生化浣熊市(huanxiongshi): **PASS** - QC: 1)    2-3   2) //    3)      4)
- 霜白村(shuangbai): **PASS** - QC: ****  1. **/**  2. **//**“”  3. **/**
- 大教堂(dashengtang): **PASS** - QC: ****  1) ****  2) **//**“”  3
- 大裂隙(daliexi): **PASS** - QC: 1)  2) // 3)  4) /logo  PASS
- 武极境破虚(poxu): **PASS** - QC: 1)   2) //  3)   4)
- 盘部落(panbu): **PASS** - QC: ****  1. ****   2. **//**   3. ****
- 三联盟(sanlian): **PASS** - QC: ****  1) ****     2) **//**  ()    “”   3) **/**
- 异种(yizhong): **PASS** - QC: 1)  2) // 3)  4) /
- 迷雾(miwu): **PASS** - 初轮3次FAIL(招牌乱码文字), 定向重做后 PASS(见下方复检节)
- 诺亚(nuoya): **PASS** - QC: ****  1. ****     2. **//**          3. ****
- 蓝山(lanshan): **PASS** - 初轮3次FAIL(军阵过于清晰违空镜), 定向重做后 PASS(见下方复检节)
- 收容所(shourongsuo): **PASS** - QC: 1) ****  2) **//**“”  3) ****
- 星际舰船(xingjijianchuan): **PASS** - QC: 1) /“” 2)  3)
- 铁血AVP(tiexue2): **PASS** - QC: 1) “”  2) “AVP”  3)

## 生成/质检说明
- 构图全部为前景空荡的环境空镜; 丧尸/军阵等可容忍的仅作为远景极模糊群体剪影, 无具体角色特写。
- 每条按判据逐项检查: 空镜无人形 / 符合设定 / 无文字水印; FAIL 改 prompt 重试 ≤2 次。
- 花费为估算: 每张成功图约 0.2 元, 重试/API失败另计(以 tokenrhythm 实际账单为准)。
- 未部署, 未改动任何 .rs/.js/.json。

## 定向重做复检(miwu/lanshan)

- 迷雾(miwu): **PASS** - 定向重做复检: 

1) 

2) //

3) 
- 蓝山(lanshan): **PASS** - 定向重做复检: 1) 
2) //
3) 

