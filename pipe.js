// pipe.js：管线执行（基线：整批一次跑完，无水位、无背压）
import { initial, advance } from "./state.js";

function runPipeline(items, options) {
  const limit = (options && options.buffer_limit) || 2;
  const state = initial();
  const values = [];
  let retries = 0;
  let buffer_peak = 0;
  let buffer = 0;
  for (const item of items) {
    buffer += 1;
    if (buffer > buffer_peak) buffer_peak = buffer;
    if (buffer > limit * 100) {
      return { processed: values.length, watermark: state.watermark, retries: retries,
               buffer_peak: buffer_peak, values: values, state: state, error: "E_BACKPRESSURE" };
    }
    values.push(item.value * 2);
    buffer -= 1;
  }
  return { processed: values.length, watermark: state.watermark, retries: retries,
           buffer_peak: buffer_peak, values: values, state: state, error: null };
}

function resume(state, items, options) {
  return runPipeline(items, options);
}

export { runPipeline, resume };
