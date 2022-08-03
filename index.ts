import fs from 'fs';

import DWDAV from 'dwdav';

import Steps from 'cli-step';
import chalk from 'chalk';
import archiver from 'archiver';
import sfccCi from 'sfcc-ci';

import type { Step } from 'cli-step';

interface SFCCDeployCredential {
  hostname: string;
}

interface SFCCCIDeployCredential extends SFCCDeployCredential {
  clientId: string;
  clientSecret: string;
  p12: string;
  passphrase: string;
}

interface DWDAVDeployCredential extends SFCCCIDeployCredential {
  username: string;
  password: string;
}

export type SFCCDeployCredentials = SFCCCIDeployCredential | DWDAVDeployCredential;

export interface SFCCDeployStepTextOptions {
  options: SFCCDeployOptions;
  dwdav?: DWDAV;
  rootDir: string;
  step: Step;
  stepText: string;
}

export type SFCCDeployStepText = string | ((opts: SFCCDeployStepTextOptions) => string);

export interface SFCCDeployAdditionalStep {
  condition: string;
  name: SFCCDeployStepText;
  emoji: string;
  fn: (opts: SFCCDeployAdditionalStepOptions) => Promise<void>;
  specialFinish?: boolean;
}

export interface SFCCDeployAdditionalStepOptions {
  options: SFCCDeployOptions;
  dwdav?: DWDAV;
  token: string;
  useSfccCi: boolean;
  rootDir: string;
  step: Step;
  stepText: string;

}

export interface SFCCDeployOptions {
  [key: string]: undefined | boolean | string | SFCCDeployCredentials | SFCCDeployAdditionalStep[];
  credentials: SFCCDeployCredentials;
  version: string;
  root?: string;
  additionalSteps?: SFCCDeployAdditionalStep[];
}

export default async (options: SFCCDeployOptions): Promise<void> => {
  const {
    credentials: config,
    version,
    root,
    additionalSteps,
  } = options;
  const useSfccCi = !!(config.clientId && config.clientSecret);
  const rootDir = root ?? './dist/';
  const dwdav = !useSfccCi ? new DWDAV({
    ...config,
    folder: 'Cartridges',
    version,
  }) : undefined;
  let token: string;

  let stepText: string;
  let step: Step;
  let steps: Steps;

  const finishStep = (success: boolean) => {
    if (success) {
      step.success(`${stepText} - ${chalk.bold.green('OK')}`);
    } else {
      step.error(`${stepText} - ${chalk.bold.red('FAIL')}`);
    }
    return true;
  };

  const defineStep = (
    prmStepText: SFCCDeployStepText,
    emoji: string,
    fn: () => Promise<unknown>,
    specialFinish?: boolean,
  ) => async () => {
    stepText = typeof prmStepText !== 'function' ? prmStepText : prmStepText({
      options, dwdav, rootDir, step, stepText,
    });
    step = steps
      .advance(stepText, emoji)
      .start();

    const ret = await fn();

    if (!specialFinish) {
      finishStep(true);
    }
    return ret;
  };

  const additionalActiveSteps = additionalSteps
    ? additionalSteps
      .filter((additionalStep) => options[additionalStep.condition])
      .map(({
        name, emoji, fn, specialFinish,
      }) => defineStep(name, emoji, () => fn({
        options, dwdav, token, useSfccCi, rootDir, step, stepText,
      }), specialFinish))
    : [];
  const stepCount = (useSfccCi ? 2 : 6) + additionalActiveSteps.length;
  steps = new Steps(stepCount);

  const zipFileName = 'cartridges.zip';
  const zipFile = rootDir + zipFileName;

  const zipCartridges = defineStep('Creating ZIP', 'hammer', async () => {
    const output = fs.createWriteStream(zipFile);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });
    archive.pipe(output);
    archive.directory(`${rootDir}cartridges/`, !useSfccCi ? false : version);
    await archive.finalize();

    const stats = fs.statSync(zipFile);
    const sizeMb = (stats.size / 1024 / 1024).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    step.success(`${stepText} - ${chalk.green(sizeMb)} MB - ${chalk.bold.green('OK')}`);
  }, true);

  const checkConnection = defineStep('Check connection', 'earth_africa', async () => {
    await (dwdav as DWDAV).get('..');
  });

  const checkCodeVersionExistance = defineStep('Check for existing code version', 'mag', async () => {
    let codeVersionExists;
    try {
      await (dwdav as DWDAV).get('.');
      codeVersionExists = true;
    } catch {
      codeVersionExists = false;
    }

    if (codeVersionExists) {
      await (dwdav as DWDAV).delete('.');
      step.success(`${stepText} - ${chalk.bold.green('Deleted existing version')}`);
    } else {
      step.success(`${stepText} - ${chalk.bold.green('Not found')}`);
    }
  }, true);

  const uploadZip = defineStep('Uploading ZIP', 'truck', async () => {
    await (dwdav as DWDAV).post(`${rootDir}cartridges.zip`, rootDir);
  });

  const unzip = defineStep('Unzipping', 'gift', async () => {
    await (dwdav as DWDAV).unzip(zipFileName);
  });

  const deleteZip = defineStep('Delete remote ZIP', 'wastebasket', async () => {
    await (dwdav as DWDAV).delete(zipFileName);
  });

  const sfccCiDeploy = defineStep('Deploy code', 'truck', async () => {
    token = await new Promise((resolve, reject) => {
      sfccCi.auth.auth(config.clientId, config.clientSecret, (err, receivedToken) => {
        if (!err) {
          resolve(receivedToken);
        } else {
          reject(err);
        }
      });
    });
    await new Promise((resolve, reject) => {
      sfccCi.code.deploy(config.hostname, zipFile, token, {
        pfx: config.p12 || undefined,
        passphrase: config.passphrase ?? undefined,
      }, (err) => {
        if (!err) {
          resolve(undefined);
        } else {
          reject(err);
        }
      });
    });
  });

  try {
    await zipCartridges();
    if (!useSfccCi) {
      await checkConnection();
      await checkCodeVersionExistance();
      await uploadZip();
      await unzip();
      await deleteZip();
    } else {
      await sfccCiDeploy();
    }
    additionalActiveSteps.forEach(async (additionalStep) => {
      await additionalStep();
    });
  } catch (e) {
    finishStep(false);
    throw (e);
  }
};
