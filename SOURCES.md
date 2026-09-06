# 数据与引擎来源

检索与下载日期：2026-09-05。

## 标准答案演示题库

- 作者：An Younggil（8段职业棋手）、David Ormerod，Go Game Guru Weekly Problems。
- 代码与 SGF 来源：https://github.com/gogameguru/go-problems
- 原始许可：CC BY-NC-SA 4.0；完整许可证随程序保存在 `data/gogameguru/LICENSE`。
- 导入：420 道题，入门 / 进阶 / 挑战各 140 道。
- `solutions.js` 只提取原始 SGF 中含 `Correct` 标记的变化路径，用于逐手演示；题目位置、轮次和变化均来自原始 SGF。
- 该部分不可用于商业用途；对外再分发或改编时必须遵守署名、非商业和相同方式共享条款。

## KataGo 引擎

- 作者 / 项目：David J. Wu（lightvector）及 KataGo contributors。
- 项目：https://github.com/lightvector/KataGo
- 版本：v1.16.4，官方 Eigen Windows x64 CPU 包。
- 官方发布页：https://github.com/lightvector/KataGo/releases/tag/v1.16.4
- 官方下载：https://github.com/lightvector/KataGo/releases/download/v1.16.4/katago-v1.16.4-eigen-windows-x64.zip
- 下载包 SHA-256：`a793ef0c77d2c6ce1aca5eb9f6c105ca2f5f9fed093749a1d397ea8c3b84ced2`。
- 项目许可证保存在 `engine/LICENSE`；官方包的说明和依赖 DLL 一同保留。
- Analysis 协议：https://github.com/lightvector/KataGo/blob/v1.16.4/docs/Analysis_Engine.md
- 规则字段：https://github.com/lightvector/KataGo/blob/v1.16.4/docs/GTP_Extensions.md

## 神经网络权重

- 官方网络索引：https://katagotraining.org/networks/
- 网络：`kata1-b6c96-s69427456-d10051148`。
- 下载：https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s69427456-d10051148.txt.gz
- 本地文件：`engine/model.txt.gz`。
- 本地权重 SHA-256：`c1ec21a19069b265373df27018f28dcb07993e75a3a750d45c3b2dcc05dd6ed8`。

## Human SL 人类棋谱模型

- 官方发布页：https://github.com/lightvector/KataGo/releases/tag/v1.15.0
- 模型：`b18c384nbt-humanv0.bin.gz`，用于最低难度的 `rank_20k` 拟人落子。
- 官方下载：https://github.com/lightvector/KataGo/releases/download/v1.15.0/b18c384nbt-humanv0.bin.gz
- 本地文件：`engine/b18c384nbt-humanv0.bin.gz`。
- 本地模型 SHA-256：`637746e44f0efe00ad1245a50aa9bbf0716efe364c43965ead97bd6835d84ab5`。
- 使用说明：https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md#human-sl-analysis-guide

## 开场画面

- 文件：`assets/loading-tea-go.png`。
- 内容：本程序定制生成的水墨山林、茶壶与手谈场景，用于本地加载动画；不含文字、商标或第三方图片素材。

## 棋谱格式

- SGF 是围棋棋谱的主格式，程序读取 FF[3] / FF[4] 常见节点、AB / AW 初始棋子、PL 先手、B / W 落子以及停一手。
- GIB / NGF 的转换逻辑参考公开的 `xyz2sgf` 转换器对常见文件结构和坐标的处理；本程序在浏览器端直接转换，不依赖额外安装。参考：https://github.com/rooklift/xyz2sgf
- SGF 标准说明：https://homepages.cwi.nl/~aeb/go/misc/sgf.html
- 读取时仅采用棋谱主变化；复杂分支会选择第一条主线，保存时统一输出为 SGF。

## 说明

当前桌面版不再加载或展示没有答案的《棋经众妙》题图模块；用户可见题库只保留上面的 420 道带标准变化题目。开发目录可能保留历史转换脚本，便于追溯，但它们不是程序运行所需数据。
