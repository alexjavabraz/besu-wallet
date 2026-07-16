let compileFunc = null;
let loading = false;
const queue = [];

self.Module = {
  onRuntimeInitialized: () => {
    compileFunc = self.Module.cwrap('solidity_compile', 'string', ['string', 'number']);
    queue.splice(0).forEach(runCompile);
  },
};

function runCompile(job) {
  if (job.warmup) {
    self.postMessage({ id: job.id, output: '' });
    return;
  }
  try {
    const output = compileFunc(job.input, 0);
    self.postMessage({ id: job.id, output });
  } catch (err) {
    self.postMessage({ id: job.id, error: err && err.message ? err.message : String(err) });
  }
}

self.onmessage = (event) => {
  const { id, input, warmup } = event.data;
  if (!compileFunc) {
    queue.push({ id, input, warmup });
    if (!loading) {
      loading = true;
      importScripts('soljson.js');
    }
    return;
  }
  runCompile({ id, input, warmup });
};
