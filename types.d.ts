// eslint-disable-next-line max-classes-per-file
declare module 'sfcc-ci' {
  export declare const code: {
    deploy: (hostname: string, zipFile, token: string, options: unknown,
      callback: (err: Error, receivedToken: string) => void) => void;
  };

  export declare const auth: {
    auth: (clientId: string, clientSecret: string, callback: (err: Error, receivedToken: string) => void) => void;
  };
}

declare module 'dwdav' {
  class DWDAV {
    constructor(options: unknown);

    get(url: string): Promise<string>;

    post(url: string, rootDir: string): Promise<string>;

    delete(url: string): Promise<string>;

    unzip(url: string): Promise<string>;
  }
  export default DWDAV;
}

declare module 'cli-step' {
  export class Step {
    start(): Step;

    success(msg: string): void;

    error(msg: string): void;
  }

  class Steps {
    constructor(num: number);

    advance(stepText: string, emoji?: string): Step;
  }
  export default Steps;
}
