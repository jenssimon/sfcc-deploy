#! /usr/bin/env node

/* eslint-disable no-console */
import { Command } from 'commander';
import { camelCase } from 'camel-case';

import sfccDeploy from '../index';

const program = new Command();

program
  .name('sfcc-deploy')
  .description('Deploy to SFCC instances')

  .argument('<version>', 'the version number')
  .argument('[cartridges]', 'the folder that contains the cartridges');

// define all options and env variable mappings
const options = [
  { name: 'hostname', env: 'SFCC_DEPLOY_INSTANCE', description: 'the hostname of the SFCC instance' },
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
      value: opts[camelCase(option.name)] || process.env[option.env],
    }));

    // check for missing options
    const [instance, clientId, clientSecret, pfx, passphrase] = optionsWithValues.map(({ name, value }) => {
      if (!value) {
        program.error(`error: required option '--${name} <${name}>' not specified`);
      }
      return value;
    });

    try {
      // and finally deploy!
      await sfccDeploy({
        credentials: {
          hostname: instance, clientId, clientSecret, p12: pfx, passphrase,
        },
        version,
        root: cartridges,
      });
    } catch (e) {
      console.log(e);
    }
  })

  .parse();
/* eslint-enable no-console */
