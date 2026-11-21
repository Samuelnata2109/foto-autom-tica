// Minimal Edge Runtime surface included in the application's TypeScript check.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
