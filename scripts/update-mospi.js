#!/usr/bin/env node
'use strict';

// Backwards-compatible entry point for the server's explicit opt-in updater.
// The official RBI/MoSPI pipeline owns both generated data files so legacy
// callers cannot reintroduce sample values or bypass validation/atomic writes.
const { main } = require('./update-rbi');

if (require.main === module) {
  main({ dryRun: process.argv.includes('--dry-run') }).catch(error => {
    console.error('UPDATE FAILURE SUMMARY');
    console.error('- error: ' + error.message);
    console.error('- last-known-good data retained: yes');
    process.exitCode = 1;
  });
}

module.exports = { main };
