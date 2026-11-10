#!/usr/bin/env node
import { main } from '../src/axi/cli.js';

const output = await main(process.argv.slice(2));
if (output) process.stdout.write(output.endsWith('\n') ? output : output + '\n');
