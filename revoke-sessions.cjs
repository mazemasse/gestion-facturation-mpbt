const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://votre-projet.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'votre_cle_service_role';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Liste des emails dont on veut tuer les sessions
const emailsACibler = [
  'papawillane@gmail.com',
  'malado.barry.sn@gmail.com'
];

async function revoquerSessions() {
  console.log("Début de la révocation des sessions...\n");

  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) return console.error("Erreur :", listError.message);

  for (const email of emailsACibler) {
    const utilisateur = users.find(u => u.email === email);
    if (!utilisateur) {
      console.log(`❌ Utilisateur introuvable : ${email}`);
      continue;
    }

    // On utilise l'API Admin pour déconnecter l'utilisateur de toutes ses sessions
    const { error } = await supabaseAdmin.auth.admin.signOut(utilisateur.id, 'global');

    if (error) {
      console.log(`❌ Erreur pour ${email} : ${error.message}`);
    } else {
      console.log(`✅ Sessions révoquées pour : ${email}`);
    }
  }
  
  console.log("\n✅ Terminé !");
}

revoquerSessions();