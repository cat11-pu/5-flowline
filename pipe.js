// pipe.js：管线执行（背压限制 + 水位确认 + 崩溃续跑）
import { initial, advance, restore } from "./state.js";

function costOf(item) {
  const cost = item && item.cost;
  return typeof cost === "number" && cost > 0 ? cost : 1;
}

// 按 tick 模拟：每 tick 到达一条、在飞条目各推进一个时间片、完成的按位置确认。
// 在飞条数达到 limit 还有新条目到达时，停止并报 E_BACKPRESSURE，而不是让缓冲无限涨。
function execute(state, items, positions, options) {
  const opts = options || {};
  const limit = opts.buffer_limit != null ? opts.buffer_limit : 2;
  const crashAfter = typeof opts.crash_after === "number" ? opts.crash_after : Infinity;

  const values = [];
  const done = new Map();
  const retries = Array.isArray(state.pending) ? state.pending.length : 0;
  let bufferPeak = 0;
  let confirmed = state.confirmations.length;
  let error = null;

  // 已确认前缀直接计入结果，续跑时不重复处理
  for (let p = 1; p <= state.watermark; p += 1) {
    const value = items[p - 1].value * 2;
    values.push(value);
    done.set(p, value);
  }
  for (const p of state.confirmations) {
    if (p > state.watermark) done.set(p, items[p - 1].value * 2);
  }
  let emitted = state.watermark;

  let inflight = [];
  let next = 0;
  while (next < positions.length || inflight.length > 0) {
    if (next < positions.length) {
      if (inflight.length >= limit) {
        // 缓冲已满还硬塞就会无限涨：必须停
        if (inflight.length + 1 > bufferPeak) bufferPeak = inflight.length + 1;
        error = "E_BACKPRESSURE";
        break;
      }
      const position = positions[next];
      inflight.push({ position: position, remaining: costOf(items[position - 1]) });
      next += 1;
      if (inflight.length > bufferPeak) bufferPeak = inflight.length;
    }
    for (const job of inflight) job.remaining -= 1;
    const finished = inflight
      .filter((job) => job.remaining <= 0)
      .sort((a, b) => a.position - b.position);
    if (finished.length > 0) {
      inflight = inflight.filter((job) => job.remaining > 0);
      for (const job of finished) {
        done.set(job.position, items[job.position - 1].value * 2);
        advance(state, job.position);
        confirmed += 1;
      }
      while (emitted < state.watermark) {
        emitted += 1;
        values.push(done.get(emitted));
      }
      if (confirmed >= crashAfter) {
        // 崩溃：水位停在已确认位置，state 交给 resume 续跑
        error = "E_CRASH";
        break;
      }
    }
  }

  state.pending = error ? inflight.map((job) => job.position) : [];
  return { processed: values.length, watermark: state.watermark, retries: retries,
           buffer_peak: bufferPeak, values: values, state: state, error: error };
}

function runPipeline(items, options) {
  const positions = [];
  for (let i = 0; i < items.length; i += 1) positions.push(i + 1);
  return execute(initial(), items, positions, options);
}

function resume(state, items, options) {
  const restored = restore(state);
  const positions = [];
  for (let i = 0; i < items.length; i += 1) {
    if (!restored.confirmations.includes(i + 1)) positions.push(i + 1);
  }
  return execute(restored, items, positions, options);
}

export { runPipeline, resume };
