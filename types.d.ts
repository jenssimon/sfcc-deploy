// eslint-disable-next-line max-classes-per-file
declare module 'sfcc-ci' {
  export declare const code: {
    deploy: (hostname: string, zipFile, token: string, options: unknown,
      callback: (err: Error, receivedToken: string) => void) => void
  }

  export declare const auth: {
    auth: (clientId: string, clientSecret: string, callback: (err: Error, receivedToken: string) => void) => void
  }
}

declare module 'dwdav' {
  class DWDAV {
    public constructor(options: unknown);

    public get(url: string): Promise<string>;

    public post(url: string, rootDir: string): Promise<string>;

    public delete(url: string): Promise<string>;

    public unzip(url: string): Promise<string>;
  }
  export default DWDAV
}

declare module 'cli-step' {
  export class Step {
    public start(): Step;

    public success(msg: string): void;

    public error(msg: string): void;
  }

  class Steps {
    public constructor(num: number);

    public advance(stepText: string, emoji?: string): Step;
  }
  export default Steps
}
