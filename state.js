// state.js：水位与恢复
// watermark 为“已确认位置”（已确认条目的数量）；confirmations 按序保存已确认结果。
function initial() {
  return { watermark: 0, confirmations: [] };
}

function advance(state, index) {
  // 水位只能变大（单调不减）
  if (Number.isFinite(index) && index > state.watermark) {
    state.watermark = index;
  }
  return state;
}

function confirm(state, value) {
  // 确认最旧的在飞条目：按序记录结果并把水位推进到已确认数量。
  state.confirmations.push(value);
  return advance(state, state.confirmations.length);
}

function restore(blob) {
  if (blob && Number.isFinite(blob.watermark)) {
    const confirmations = Array.isArray(blob.confirmations)
      ? blob.confirmations.slice(0, blob.watermark)
      : new Array(Math.max(0, blob.watermark));
    return { watermark: Math.max(0, blob.watermark), confirmations: confirmations };
  }
  return initial();
}

export { initial, advance, confirm, restore };
