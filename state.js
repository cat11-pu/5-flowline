// state.js：水位与恢复（水位 = 已确认位置，只增不减）
function initial() {
  return { watermark: 0, confirmations: [], pending: [] };
}

function advance(state, index) {
  if (index > 0 && !state.confirmations.includes(index)) {
    state.confirmations.push(index);
  }
  // 水位只能沿连续已确认前缀向前推进，绝不回退
  let wm = state.watermark;
  while (state.confirmations.includes(wm + 1)) wm += 1;
  if (wm > state.watermark) state.watermark = wm;
  return state;
}

function restore(blob) {
  if (!blob || typeof blob !== "object") return initial();
  const state = initial();
  if (typeof blob.watermark === "number") state.watermark = blob.watermark;
  if (Array.isArray(blob.confirmations)) state.confirmations = blob.confirmations.slice();
  if (Array.isArray(blob.pending)) state.pending = blob.pending.slice();
  return state;
}

export { initial, advance, restore };
