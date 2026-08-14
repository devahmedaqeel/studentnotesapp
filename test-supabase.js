const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ymtufelczpyiinlwqhbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdHVmZWxjenB5aWlubHdxaGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTcyODMsImV4cCI6MjEwMjE5MzI4M30.XddrPYSr8R0rj-WuG742IIpESxQWHRMwKmQVvo5bbZ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const tables = ['profiles', 'messages', 'conversations', 'statuses', 'follows', 'notes'];
  for (const t of tables) {
    const res = await supabase.from(t).select('*').limit(1);
    console.log(`Table ${t}: status=${res.status} error=${res.error ? res.error.message : 'none'}`);
  }
}

test().catch(console.error);
