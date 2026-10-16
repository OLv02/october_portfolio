// Off-main-thread builder: keeps the loading screen smooth while the seeds are placed.
import { buildMain } from './build-data.js';

self.onmessage = (e) => {
  const main = buildMain(e.data);
  self.postMessage({ main }, Object.values(main).map((a) => a.buffer));
};
