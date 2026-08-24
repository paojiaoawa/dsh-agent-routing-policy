window.__ModuleLoader__.load({
  id: "dsh-agent-routing-policy",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var react = require("react");

    // 必需服务：slots（设置页槽位）、settingsScope（读写 routing-policy 命名空间）、connection（取模型目录）。
    var inject = ["slots", "settingsScope", "connection"];

    var inputStyle = {
      flex: 1,
      minWidth: 0,
      padding: "4px 8px",
      fontSize: 13,
      border: "1px solid #888",
      borderRadius: 6,
      background: "#ffffff",
      color: "#000000",
    };

    var buttonStyle = {
      color: "#000000",
      background: "#ffffff",
      border: "1px solid #888",
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 13,
      cursor: "pointer",
    };

    function apply(ctx) {
      var api = ctx.get("connection").api;
      var scope = ctx.settingsScope.bind({ namespace: "routing-policy" });

      /** 一栏模型列表编辑器：从模型目录里选 provider + 模型。 */
      function ModelListEditor(props) {
        var catalog = props.catalog || [];
        var items = props.items || [];
        var rows = items.map(function (entry, i) {
          var group = null;
          for (var g = 0; g < catalog.length; g++) {
            if (catalog[g].id === entry.provider) { group = catalog[g]; break; }
          }
          var providerOpts = [];
          if (!entry.provider) providerOpts.push({ value: "", label: "选择 provider" });
          providerOpts = providerOpts.concat(catalog.map(function (g) { return { value: g.id, label: g.name || g.id }; }));
          if (entry.provider && !providerOpts.some(function (o) { return o.value === entry.provider; })) {
            providerOpts.push({ value: entry.provider, label: entry.provider + "（自定义）" });
          }
          var modelOpts = [];
          if (!entry.model) modelOpts.push({ value: "", label: "选择模型" });
          modelOpts = modelOpts.concat(group ? group.models.map(function (m) { return { value: m.id, label: m.name || m.id }; }) : []);
          if (entry.model && !modelOpts.some(function (o) { return o.value === entry.model; })) {
            modelOpts.push({ value: entry.model, label: entry.model + "（自定义）" });
          }
          return react.createElement("div", {
            key: i,
            style: { display: "flex", gap: 8, alignItems: "center", width: "100%", color: "#000000" },
          },
            react.createElement("select", {
              style: inputStyle,
              value: entry.provider,
              onChange: function (event) {
                var next = items.slice();
                next[i] = { provider: event.target.value, model: "" };
                props.onChange(next);
              },
            }, providerOpts.map(function (o) { return react.createElement("option", { key: o.value, value: o.value }, o.label); })),
            react.createElement("select", {
              style: inputStyle,
              value: entry.model,
              onChange: function (event) {
                var next = items.slice();
                next[i] = { provider: next[i].provider, model: event.target.value };
                props.onChange(next);
              },
            }, modelOpts.map(function (o) { return react.createElement("option", { key: o.value, value: o.value }, o.label); })),
            react.createElement("button", {
              type: "button",
              style: buttonStyle,
              onClick: function () {
                var next = items.slice();
                next.splice(i, 1);
                props.onChange(next);
              },
            }, "删除"),
          );
        });
        return react.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, width: "100%", color: "#000000" } },
          react.createElement("div", { style: { fontWeight: 600 } }, props.title),
          rows,
          react.createElement("button", {
            type: "button",
            style: Object.assign({ alignSelf: "flex-start" }, buttonStyle),
            onClick: function () { props.onChange(items.concat([{ provider: "", model: "" }])); },
          }, "+ 添加模型"),
        );
      }

      /** 设置页主体：开关 + 便宜/贵模型分类编辑。 */
      function RoutingPolicySection() {
        var snap = react.useSyncExternalStore(
          function (listener) { return scope.subscribe(listener); },
          function () { return scope.getSnapshot(); },
          function () { return scope.getSnapshot(); },
        );
        var state = react.useState(null);
        var draft = state[0];
        var setDraft = state[1];
        var savingState = react.useState(false);
        var saving = savingState[0];
        var setSaving = savingState[1];
        var catalogState = react.useState([]);
        var catalog = catalogState[0];
        var setCatalog = catalogState[1];

        // 拉取当前已注册 provider 的模型目录（下拉选项数据源）。
        react.useEffect(function () {
          var alive = true;
          api.llm.models({}).then(function (response) {
            if (alive && response && response.result && response.result.ok) {
              setCatalog(response.result.value.groups || []);
            }
          }).catch(function () {});
          return function () { alive = false; };
        }, []);

        // 快照变化（首次就绪或保存落定）时同步草稿。
        react.useEffect(function () {
          if (snap.value) {
            setDraft({
              enabled: snap.value.enabled !== false,
              economy: (snap.value.economy || []).map(function (entry) { return { provider: entry.provider, model: entry.model }; }),
              highEnd: (snap.value.highEnd || []).map(function (entry) { return { provider: entry.provider, model: entry.model }; }),
            });
          }
        }, [snap.value]);

        if (!snap.value || snap.status === "loading") {
          return react.createElement("div", { style: { color: "#000000" } }, "加载中…");
        }
        if (snap.status === "unavailable") {
          return react.createElement("div", { style: { color: "#000000" } }, "该设置不可用（连接不支持写入）");
        }

        var value = snap.value;
        var d = draft || {
          enabled: value.enabled !== false,
          economy: value.economy || [],
          highEnd: value.highEnd || [],
        };

        var save = function () {
          setSaving(true);
          Promise.all([
            scope.set("enabled", d.enabled),
            scope.set("economy", d.economy),
            scope.set("highEnd", d.highEnd),
          ]).then(function () {}, function () {}).then(function () { setSaving(false); });
        };

        return react.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 560, color: "#000000" } },
          react.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } },
            react.createElement("div", null,
              react.createElement("div", { style: { fontWeight: 600 } }, "启用路由策略"),
              react.createElement("div", { style: { fontSize: 12, opacity: 0.65 } }, "关闭后 agent 不再收到子代理路由指令"),
            ),
            react.createElement("input", {
              type: "checkbox",
              checked: d.enabled,
              onChange: function (event) { setDraft(Object.assign({}, d, { enabled: event.target.checked })); },
            }),
          ),
          react.createElement(ModelListEditor, {
            title: "便宜 / 经济模型（简单·机械任务用）",
            items: d.economy,
            catalog: catalog,
            onChange: function (items) { setDraft(Object.assign({}, d, { economy: items })); },
          }),
          react.createElement(ModelListEditor, {
            title: "贵 / 高阶模型（复杂·推理·方案任务用）",
            items: d.highEnd,
            catalog: catalog,
            onChange: function (items) { setDraft(Object.assign({}, d, { highEnd: items })); },
          }),
          react.createElement("button", {
            type: "button",
            style: buttonStyle,
            disabled: saving || !snap.writable,
            onClick: save,
          }, saving ? "保存中…" : "保存"),
          react.createElement("div", { style: { fontSize: 12, opacity: 0.6 } },
            "提示：简单任务会优先用便宜模型省钱；复杂任务用高阶模型。改动保存后立即生效，无需重启。",
          ),
        );
      }

      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register(
          { name: "settings.section", id: "routing-policy", order: 60, label: () => "子代理路由策略" },
          RoutingPolicySection,
        );
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
