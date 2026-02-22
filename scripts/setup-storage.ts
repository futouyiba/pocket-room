/**
 * Setup Supabase Storage for Message Images
 * 
 * This script creates the storage bucket and policies for message images.
 * Run this script once to set up the storage infrastructure.
 * 
 * Usage:
 *   npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function setupStorage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Setting up Supabase Storage for message images...');

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      process.exit(1);
    }

    const bucketExists = buckets?.some(b => b.name === 'message-images');

    if (bucketExists) {
      console.log('✓ Bucket "message-images" already exists');
    } else {
      // Create bucket
      const { data, error } = await supabase.storage.createBucket('message-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      });

      if (error) {
        console.error('Error creating bucket:', error);
        process.exit(1);
      }

      console.log('✓ Created bucket "message-images"');
    }

    // Note: Storage policies need to be set up via SQL (see docs/storage-setup.sql)
    console.log('\n⚠️  Important: Run the SQL script to set up storage policies:');
    console.log('   Execute docs/storage-setup.sql in your Supabase SQL editor');
    console.log('   or run: psql <connection-string> -f docs/storage-setup.sql');

    console.log('\n✓ Storage setup complete!');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

setupStorage();
