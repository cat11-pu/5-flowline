import fs from "node:fs";
import { run, resume } from "./pipe.js";
import { initial, restore } from "./state.js";
import { render } from "./app.js";

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/pipeline.json", "utf8"));
const started = spec.state ? restore(spec.state, spec) : initial();
const rest = resume(started, spec.items, spec);
const result = run(spec.items, spec);
const view = render(spec);

console.log("已处理的条 =", JSON.stringify(result.processed));
console.log("水位 =", result.watermark);
console.log("缓冲峰值 =", result.buffer_peak);
console.log("重试次数 =", result.retries);
console.log("恢复起点 =", rest.watermark);
console.log("重启后重放的条 =", JSON.stringify(rest.processed));
console.log("能不能续跑 =", spec.resumable);
console.log("单条超过缓冲上限的错误码 =", spec.too_large_code);
