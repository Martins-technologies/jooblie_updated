#!/usr/bin/env node
/**
 * Jooblie - Secure Initial Admin Provisioning Script
 * 
 * This script runs strictly server-side using the Supabase Service Role key.
 * It verifies that the user with INITIAL_ADMIN_EMAIL has already registered in
 * Supabase Auth, confirms their identity, and upgrades their profile role to 'admin'.
 * 
 * Usage:
 *   npm run provision-admin
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();

console.log('\n======================================================');
console.log('🛡️  JOOBLIE INITIAL ADMINISTRATOR PROVISIONING');
console.log('======================================================\n');

if (!INITIAL_ADMIN_EMAIL) {
  console.error('❌ ERROR: INITIAL_ADMIN_EMAIL is not set in backend/.env');
  console.error('👉 Please add `INITIAL_ADMIN_EMAIL=your-email@example.com` to backend/.env and re-run.');
  process.exit(1);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(INITIAL_ADMIN_EMAIL)) {
  console.error(`❌ ERROR: "${INITIAL_ADMIN_EMAIL}" is not a valid email address.`);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function provisionAdmin() {
  try {
    console.log(`🔍 Checking Supabase Auth for registered user: ${INITIAL_ADMIN_EMAIL}...`);

    // 1. Locate the user in Supabase Auth via Admin API
    let page = 1;
    let authUser = null;
    const perPage = 50;

    while (!authUser) {
      const { data: userList, error: listError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        throw new Error(`Failed to query Supabase Auth users: ${listError.message}`);
      }

      if (!userList?.users || userList.users.length === 0) {
        break;
      }

      authUser = userList.users.find(
        (u) => u.email?.trim().toLowerCase() === INITIAL_ADMIN_EMAIL
      );

      if (userList.users.length < perPage) {
        break;
      }
      page += 1;
    }

    if (!authUser) {
      console.error(`\n❌ USER NOT FOUND IN SUPABASE AUTH: ${INITIAL_ADMIN_EMAIL}`);
      console.error('👉 The initial administrator must first register an account on the website (or in Supabase).');
      console.error('   1. Go to your Jooblie website registration page: http://localhost:5173/register');
      console.error(`   2. Sign up with email: ${INITIAL_ADMIN_EMAIL}`);
      console.error('   3. If email verification is enabled, confirm your email.');
      console.error('   4. Re-run `npm run provision-admin` from the backend directory.\n');
      process.exit(1);
    }

    console.log(`✅ Found verified Supabase Auth user:`);
    console.log(`   - User ID: ${authUser.id}`);
    console.log(`   - Email:   ${authUser.email}`);
    console.log(`   - Email Confirmed: ${authUser.email_confirmed_at ? 'Yes (' + authUser.email_confirmed_at + ')' : 'No / Pending'}`);

    // 2. Fetch the corresponding profile
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileFetchError) {
      throw new Error(`Failed to query profiles table: ${profileFetchError.message}`);
    }

    if (!profile) {
      console.log('⚠️  Profile row does not exist yet; bootstrapping profile row...');
      const { data: newProfile, error: profileInsertError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Administrator',
          role: 'admin',
          status: 'active',
        })
        .select('id,email,full_name,role,status')
        .single();

      if (profileInsertError) {
        throw new Error(`Failed to create administrator profile: ${profileInsertError.message}`);
      }

      console.log(`🎉 Administrator profile created: Role = "${newProfile.role}", Status = "${newProfile.status}"`);
    } else if (profile.role === 'admin' && profile.status === 'active') {
      console.log(`\nℹ️  User "${INITIAL_ADMIN_EMAIL}" is ALREADY an active Administrator!`);
      console.log(`   - Role: ${profile.role}`);
      console.log(`   - Status: ${profile.status}`);
      console.log(`\n👉 You can sign in at http://localhost:5173/sign-in to access /dashboard/admin.\n`);
      return;
    } else {
      console.log(`🔄 Upgrading profile role from "${profile.role}" to "admin"...`);
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          status: 'active',
        })
        .eq('id', authUser.id)
        .select('id,email,full_name,role,status')
        .single();

      if (updateError) {
        throw new Error(`Failed to update profile to admin: ${updateError.message}`);
      }

      console.log(`🎉 Success! Upgraded role to: "${updatedProfile.role}" (Status: ${updatedProfile.status})`);
    }

    // 3. Write an immutable audit log entry if table exists
    try {
      await supabase.from('activity_log').insert({
        actor_id: authUser.id,
        action: 'admin.initial_provisioned',
        entity_type: 'profile',
        entity_id: authUser.id,
        data: {
          email: INITIAL_ADMIN_EMAIL,
          provisioned_at: new Date().toISOString(),
          method: 'cli_provision_script',
        },
      });
    } catch {
      // Non-critical if schema handles logs separately
    }

    console.log('\n======================================================');
    console.log('✅ INITIAL ADMIN PROVISIONING COMPLETE');
    console.log('======================================================');
    console.log(`👤 Admin Email:    ${INITIAL_ADMIN_EMAIL}`);
    console.log(`🔑 Supabase UID:   ${authUser.id}`);
    console.log(`🌐 Dashboard Path: /dashboard/admin`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Provisioning failed with error:', err.message);
    process.exit(1);
  }
}

provisionAdmin();
