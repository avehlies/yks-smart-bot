declare module '@xenova/transformers' {
  export function pipeline(
    task: string,
    model?: string,
    options?: object,
  ): Promise<(...args: unknown[]) => Promise<unknown>>;
}
