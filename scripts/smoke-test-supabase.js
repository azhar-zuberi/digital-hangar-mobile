#!/usr/bin/env node
/**
 * Smoke test for issue #2 (Wire Supabase project: env config + typed client).
 *
 * Confirms the Supabase project is actually reachable end-to-end with the anon
 * key from .env: queries the `_health_check` table created by
 * supabase/migrations/20260725103203_create_health_check.sql and prints the
 * seed row.
 *
 * This is deliberately a plain runnable script rather than a test-suite
 * addition — there's no Jest/RNTL runner in this repo yet (that's issue #12).
 * Once a test framework lands, this can be ported to a real test.
 *
 * Usage:
 *   npm run db:smoke-test
 *
 * Requires .env to be filled in (see .env.example) and the migration above to
 * already be applied to your linked project — see README "Local Supabase
 * setup for a new developer".
 */

const path = require('path');
// Reuse Expo's own .env loader so this script picks up EXPO_PUBLIC_* vars the
// exact same way `expo start` / `expo lint` do, without hand-rolling a .env
// parser or adding a new dependency (dotenv) just for this script.
const { loadProjectEnv } = require('@expo/env');

loadProjectEnv(path.resolve(__dirname, '..'), { silent: true });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
        'Copy .env.example to .env and fill in your Supabase project credentials.',
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.from('_health_check').select('*').limit(1);

  if (error) {
    console.error('Smoke test FAILED — could not query public._health_check:');
    console.error(`  ${error.message}`);
    console.error(
      '\nIs the migration applied? Run:\n' +
        '  supabase link --project-id aocmjvqsdrdftubpxrnk\n' +
        '  supabase db push',
    );
    process.exitCode = 1;
    return;
  }

  if (!data || data.length === 0) {
    console.error(
      'Smoke test FAILED — public._health_check has no rows. ' +
        'Expected the seed row from the migration.',
    );
    process.exitCode = 1;
    return;
  }

  console.log('Smoke test PASSED — connected to Supabase and read the seed row:');
  console.log(data[0]);
}

main();
