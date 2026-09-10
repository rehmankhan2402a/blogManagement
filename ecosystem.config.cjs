module.exports = {
    apps: [
        {
            name: "hess-cms",
            // Bypass PM2 JS-wrapper telemetry bugs by executing Node directly as a binary
            script: "node",
            args: "server-node.mjs",
            interpreter: "none", // Tells PM2 not to wrap it in additional Node instrumentation

            exec_mode: "fork",
            watch: false,
            max_memory_restart: "300M",

            // Log management
            error_file: "./logs/error.log",
            out_file: "./logs/out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss",

            // Environment Variables (Runtime Injection)
            env: {
                NODE_ENV: "production",
                PORT: 3000,
                HOST: "0.0.0.0",
                // Supabase public vars (safe to store here)
                SUPABASE_URL: "https://hojeqetzkiqlxbrytllb.supabase.co",
                SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvamVxZXR6a2lxbHhicnl0bGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODQ4NDcsImV4cCI6MjA5NTg2MDg0N30.oMy7pogXK2Ii2yiF28rDBnvq5WfQu9j-tcoldihDb_w",
                VITE_SUPABASE_URL: "https://hojeqetzkiqlxbrytllb.supabase.co",
                VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvamVxZXR6a2lxbHhicnl0bGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODQ4NDcsImV4cCI6MjA5NTg2MDg0N30.oMy7pogXK2Ii2yiF28rDBnvq5WfQu9j-tcoldihDb_w",
                VITE_SUPABASE_PROJECT_ID: "hojeqetzkiqlxbrytllb",
                // DeepL API key for blog translations - set via PM2: pm2 set hess-cms:DEEPL_API_KEY <your-key>
                // SUPABASE_SERVICE_ROLE_KEY must be set directly on the VPS — never commit it here.
                // On the server run: pm2 set hess-cms:SUPABASE_SERVICE_ROLE_KEY <your-key>
                // Or add it manually to this file on the server only (never push to git).
            }
        }
    ]
};
