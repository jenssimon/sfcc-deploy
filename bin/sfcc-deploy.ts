#! /usr/bin/env node

import { Command } from 'commander';
import { camelCase } from 'camel-case';

import sfccDeploy from '../index';

import type { SFCCDeployCredentials, DWDAVDeployCredential } from '../index';

interface OptionDefinition {
  name: string;
  env: string;
  description: string;
  required?: boolean;
  value?: string;
}

const program = new Command();

program
  .name('sfcc-deploy')
  .description('Deploy to SFCC instances')

  .argument('<version>', 'the version number')
  .argument('[cartridges]', 'the folder that contains the cartridges');

// define all options and env variable mappings
const options: OptionDefinition[] = [
  {
    name: 'hostname', env: 'SFCC_DEPLOY_INSTANCE', description: 'the hostname of the SFCC instance', required: true,
  },
  { name: 'username', env: 'SFCC_DEPLOY_USERNAME', description: 'the username' },
  { name: 'password', env: 'SFCC_DEPLOY_PASSWORD', description: 'the password' },
  { name: 'client-id', env: 'SFCC_DEPLOY_CLIENT_ID', description: 'the client ID' },
  { name: 'client-secret', env: 'SFCC_DEPLOY_CLIENT_SECRET', description: 'the client secret' },
  { name: 'pfx', env: 'SFCC_DEPLOY_PFX', description: 'the PFX file' },
  { name: 'passphrase', env: 'SFCC_DEPLOY_PASSPHRASE', description: 'the passphrase for the .pfx file' },
];

// add options
options.forEach(({ name, description }) => program.option(`--${name} <${name}>`, description));

program
  .action(async (version, cartridges) => {
    const opts = program.opts();

    // add values for options - check env variables
    const optionsWithValues = options.map((option) => ({
      ...option,
      value: (opts[camelCase(option.name)] || process.env[option.env]) as string | undefined,
    }));

    // check for missing options
    const [
      instance, username, password, clientId, clientSecret, pfx, passphrase,
    ] = optionsWithValues.map(({ name, value, required }) => {
      if (!value && required) {
        program.error(`error: required option '--${name} <${name}>' not specified`);
        process.exit();
      }
      return value;
    });

    const requiredCert = [clientId, clientSecret, pfx, passphrase];
    const requiredWebDav = [username, password];

    const [foundCert, foundWebDav] = [
      requiredCert, requiredWebDav,
    ].map((required) => required.filter((value) => !!value));

    const foundRequired = ((found: string[], required: string[]): [boolean, boolean] => [
      found.length > 0 && found.length === required.length, // found required options?
      found.length > 0, // are options found?
    ]);

    const [hasAllCertOptions, isCert] = foundRequired(foundCert as string[], requiredCert as string[]);
    if (isCert && !hasAllCertOptions && isCert) {
      program.error(
        'error: following options are required: \'--client-id\', \'--client_secret\', \'--pfx\', \'--passphrase\'',
      );
    }

    const [hasAllWebDavOptions, isWebDav] = foundRequired(foundWebDav as string[], requiredWebDav as string[]);
    if (isWebDav && !hasAllWebDavOptions) {
      program.error('error: following options are required: \'--username\', \'--password\'');
    }

    if (!isCert && !isWebDav) {
      program.error('error: missing required auth options');
    }

    let credentials: SFCCDeployCredentials | undefined;
    if (hasAllCertOptions) {
      credentials = {
        hostname: instance as string,
        clientId: clientId as string,
        clientSecret: clientSecret as string,
        p12: pfx as string,
        passphrase: passphrase as string,
      };
    }

    if (hasAllWebDavOptions) {
      credentials = {
        hostname: instance as string,
        username: username as string,
        password: password as string,
      } as DWDAVDeployCredential;
    }

    if (!credentials) {
      program.error('error: missing required auth options');
    }

    try {
      // and finally deploy!
      await sfccDeploy({
        credentials: credentials as SFCCDeployCredentials,
        version,
        root: cartridges,
      });
    } catch (e) {
      program.error(e as string);
    }
  })

  .parse();
