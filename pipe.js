// pipe.js：管线执行（逐条、有界在飞缓冲、水位确认、可续跑）
import { initial, confirm, restore } from "./state.js";

// 以 FIFO 滑动窗口驱动：在飞条数受 buffer_limit 约束；窗口满时必须先“背压”——
// 完成并确认最旧的在飞条目（推进水位），才能放入下一条。因此缓冲只停不无限涨，
// 且水位始终等于“已确认位置”。崩溃时未确认的在飞条目不计入水位，续跑时重放。
function execute(items, options, startState) {
  const opts = options || {};
  const limit = Math.max(1, opts.buffer_limit || 2);
  const crashAfter = Number.isFinite(opts.crash_after) ? opts.crash_after : Infinity;

  const state = startState ? restore(startState) : initial();
  const startWatermark = state.watermark;
  const values = state.confirmations.slice();
  let inflight = 0;
  let bufferPeak = 0;
  let retries = 0;
  let error = null;

  const result = () => ({
    processed: values.length,
    watermark: state.watermark,
    retries: retries,
    buffer_peak: bufferPeak,
    values: values,
    state: state,
    error: error
  });

  // 完成并确认最旧的在飞条目：值翻倍计入 values，水位推进到已确认位置。
  const completeOldest = (item) => {
    confirm(state, item.value * 2);
    values.push(state.confirmations[state.confirmations.length - 1]);
    inflight -= 1;
  };

  for (let i = startWatermark; i < items.length; i += 1) {
    // 背压：在飞已达上限时停止纳入新条目，先完成最旧的在飞条目（停而不是无限涨）。
    if (inflight >= limit) {
      completeOldest(items[state.watermark]);
      if (state.watermark >= crashAfter) {
        error = "E_CRASH";
        return result();
      }
    }
    // 硬性预算守卫：预算为 limit+1；一旦触发 E_BACKPRESSURE，绝不再推进水位。
    if (inflight + 1 > limit + 1) {
      error = "E_BACKPRESSURE";
      return result();
    }
    inflight += 1;
    if (inflight > bufferPeak) bufferPeak = inflight;
  }

  // 排空剩余在飞条目（严格按入窗顺序，即索引顺序确认，不重复、不乱序）。
  while (inflight > 0) {
    completeOldest(items[state.watermark]);
    if (state.watermark >= crashAfter) {
      error = "E_CRASH";
      return result();
    }
  }

  return result();
}

function runPipeline(items, options) {
  return execute(items, options, null);
}

function resume(state, items, options) {
  // 从水位继续：state.watermark 之前的条目已确认，跳过、绝不重复处理。
  return execute(items, options, state);
}

export { runPipeline, resume };
