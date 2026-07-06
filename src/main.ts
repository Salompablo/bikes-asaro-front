import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { env } from 'onnxruntime-web';

if (typeof window !== 'undefined') {
  env.wasm.wasmPaths = '/wasm/';
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
