// Supabase Configuration Example
// Copy this to supabase-config.js and fill in your Supabase credentials

module.exports = {
  supabaseUrl: process.env.SUPABASE_URL || 'your-supabase-project-url',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-supabase-service-role-key'
};

