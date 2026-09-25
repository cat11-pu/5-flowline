// tests/run.js：基线用例
import assert from "node:assert";
import { runPipeline, resume } from "../pipe.js";
import { initial } from "../state.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const data = [{ value: 3, cost: 1 }, { value: 5, cost: 1 }];

check("pipeline doubles values", () => {
  assert.deepStrictEqual(runPipeline(data, { buffer_limit: 2 }).values, [6, 10]);
});

check("initial state has watermark", () => {
  assert.strictEqual(typeof initial().watermark, "number");
});

check("render reports peak", () => {
  assert.ok(render(data, { buffer_limit: 2 }).buffer_peak >= 1);
});

check("resume accepts state", () => {
  const first = runPipeline(data, { buffer_limit: 2 });
  assert.ok(resume(first.state, data, { buffer_limit: 2 }).processed >= 0);
});

check("error field present", () => {
  assert.ok("error" in runPipeline(data, { buffer_limit: 2 }));
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
