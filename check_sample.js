// check_sample.js：跑 sample/pipeline.json，打印验收面
import fs from "node:fs";
import { runPipeline, resume } from "./pipe.js";

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/pipeline.json", "utf8"));
const first = runPipeline(spec.items, { buffer_limit: spec.buffer_limit });
const crashed = runPipeline(spec.items.slice(0, spec.crash_at), { buffer_limit: spec.buffer_limit, crash_after: spec.crash_at });
const after = resume(crashed.state, spec.items, { buffer_limit: spec.buffer_limit });

console.log("处理条数 =", first.processed);
console.log("水位（已确认位置） =", first.watermark);
console.log("重试次数 =", first.retries);
console.log("背压峰值（缓冲条数） =", first.buffer_peak);
console.log("崩溃时的水位 =", crashed.state.watermark);
console.log("续跑后水位 =", after.watermark);
console.log("续跑处理条数 =", after.processed);
console.log("是否重复处理 =", spec.duplicate_ok);
console.log("不变量（水位单调不减且不重复处理） =", spec.watermark_invariant);
