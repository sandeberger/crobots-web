/// <reference types="vite/client" />

declare module '*.r?raw' {
  const content: string;
  export default content;
}

declare module '*.r' {
  const content: string;
  export default content;
}
