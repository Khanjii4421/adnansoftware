// Supabase Configuration
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase configuration not found (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Falling back to limited mode.');
  const createStubQuery = () => {
    const message = 'Supabase client is not configured';
    const handler = {
      get: (_, prop) => {
        if (prop === 'then') {
          return (resolve) => {
            if (typeof resolve === 'function') {
              resolve({ data: null, error: new Error(message) });
            }
          };
        }
        if (prop === 'catch') {
          return (reject) => {
            if (typeof reject === 'function') {
              reject(new Error(message));
            }
            return createStubQuery();
          };
        }
        if (prop === 'finally') {
          return (callback) => {
            if (typeof callback === 'function') {
              callback();
            }
            return createStubQuery();
          };
        }
        return () => createStubQuery();
      }
    };
    return new Proxy({}, handler);
  };

  const stub = {
    __isStub: true,
    isConfigured: false,
    from() {
      return createStubQuery();
    }
  };

  module.exports = stub;
  return;
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

supabase.__isStub = false;
supabase.isConfigured = true;

module.exports = supabase;

