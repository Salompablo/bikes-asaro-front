declare module 'onnxruntime-web' {
  export const env: {
    wasm: {
      wasmPaths: string | Record<string, string>;
    };
  };
}
