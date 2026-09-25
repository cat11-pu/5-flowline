// app.js：渲染（基线：只报条数）
import { runPipeline, resume } from "./pipe.js";

function render(items, options) {
  const result = runPipeline(items, options);
  return { processed: result.processed, watermark: result.watermark,
           retries: result.retries, buffer_peak: result.buffer_peak,
           values: result.values, error: result.error };
}

export { render, runPipeline, resume };
