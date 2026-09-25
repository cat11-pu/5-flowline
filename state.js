// state.js：水位与恢复（基线：水位永远是 0，不做确认）
function initial() {
  return { watermark: 0, confirmations: [] };
}

function advance(state, index) {
  // 基线：不推进水位
  return state;
}

function restore(blob) {
  return initial();
}

export { initial, advance, restore };
