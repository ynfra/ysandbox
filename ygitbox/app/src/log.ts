const ts = () => new Date().toISOString();
export const log = {
  info: (m: string) => console.log(`${ts()} INFO  ${m}`),
  warn: (m: string) => console.warn(`${ts()} WARN  ${m}`),
  error: (m: string) => console.error(`${ts()} ERROR ${m}`),
};
