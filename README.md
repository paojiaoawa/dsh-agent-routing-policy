# dsh-agent-routing-policy

DSH(DeepSeek Harness)插件:全局、用户可配置的**子代理模型路由策略**,自带独立设置页。

## 功能

- 把「按任务难度给子代理选模型」的规则注入**所有 agent** 的系统提示:
  - **简单 / 机械任务**(格式化、复制转换、检索、翻译、重命名、单步)→ 用**便宜 / 经济模型**;
  - **复杂 / 推理 / 多步 / 方案 / 写码任务** → 用**贵 / 高阶模型**;
  - 派子代理时**必须显式指定 provider+model**,绝不继承父会话的(可能花钱的)模型。
- Web 设置页新增**「子代理路由策略」**一栏:
  - **启用开关**;
  - **便宜 / 经济模型**与**贵 / 高阶模型**两栏,模型从**已注册的模型提供方**下拉选择;
  - 改动保存后**立即生效,无需重启**(系统提示每次组装时读实时设置值)。
- 配置存在 `routing-policy` 设置命名空间;未配置时使用默认分类
  (`zai/glm-4.7-flash` 为经济档,`deepseek-official/deepseek-v4-pro` 为高阶档)。

## 安装

```bash
dsh plugin --profile web add link:/你的路径/dsh-agent-routing-policy
```

或从 GitHub:

```bash
dsh plugin --profile web add github:paojiaoawa/dsh-agent-routing-policy
```

装好后**重启一次 `dsh web`**,刷新浏览器,进 设置 → 子代理路由策略。

## 结构

```
dsh-agent-routing-policy/
├── package.json      # bundle 元数据 + 客户端声明
├── cordis.patch.yml  # host 行挂载声明
└── lib/
    ├── index.js      # host:注册设置命名空间 + 注入全局系统提示 section
    └── client.js     # 浏览器半边:设置页(开关 + 模型分类编辑)
```

## License

MIT
