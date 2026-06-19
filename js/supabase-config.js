// Configuração de conexão com o Supabase
// Estas chaves são seguras para ficar públicas (chave "anon"),
// pois o acesso de escrita é protegido por login (ver sql/schema.sql)

const SUPABASE_URL = "https://xiyvrnuuslsggadhpwgu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpeXZybnV1c2xzZ2dhZGhwd2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDU2ODksImV4cCI6MjA5NzQyMTY4OX0.bOa72mwUI6T40NXx9cxrwo44FfAeIgCnUoJBlPq7k1Q";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
