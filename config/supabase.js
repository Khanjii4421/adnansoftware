// Supabase Configuration
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug logging for Railway
console.log('[Supabase Config] Checking configuration...');
console.log('[Supabase Config] SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('[Supabase Config] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set (' + supabaseServiceKey.substring(0, 20) + '...)' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase configuration not found (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Falling back to limited mode.');
  console.warn('⚠️  Please set these environment variables in Railway Variables tab.');
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
try {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test connection by checking if key is valid
  if (supabaseServiceKey && !supabaseServiceKey.includes('service_role')) {
    console.warn('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY might be incorrect.');
    console.warn('⚠️  Make sure you are using the service_role key (secret), not the anon key (public).');
    console.warn('⚠️  Get it from: Supabase Dashboard → Settings → API → service_role key');
  }

  supabase.__isStub = false;
  supabase.isConfigured = true;
  
  console.log('[Supabase Config] ✅ Supabase client created successfully');
  
  module.exports = supabase;
} catch (error) {
  console.error('[Supabase Config] ❌ Error creating Supabase client:', error.message);
  console.error('[Supabase Config] Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  
  // Return stub on error
  const stub = {
    __isStub: true,
    isConfigured: false,
    from() {
      return {
        then: (resolve) => resolve({ data: null, error: new Error('Supabase client creation failed') }),
        catch: (reject) => reject(new Error('Supabase client creation failed'))
      };
    }
  };
  
  module.exports = stub;
}

