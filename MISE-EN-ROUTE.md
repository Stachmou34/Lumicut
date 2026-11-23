# LumiCut — Mise en route de la boutique (Supabase + Stripe)

Ce guide relie le site à sa base de données (Supabase) et au paiement (Stripe), dans l'ordre.
Tout se fait d'abord en **mode test Stripe** : aucune vraie carte n'est débitée.
Compter environ une heure la première fois.

Ce qu'il faut avoir :
- un compte Supabase (gratuit) et un compte Stripe ;
- Node.js installé (déjà le cas si `npm run dev` fonctionne) ;
- facultatif : un compte Resend (emails) et une clé d'API Anthropic (conseiller IA).

Règle d'or : **une clé secrète ne va jamais dans une variable `VITE_…`**. Tout ce qui commence par `VITE_`
est envoyé à chaque visiteur du site. Les clés secrètes vont dans les « secrets » Supabase.

---

## 1. Créer le projet Supabase

1. Sur supabase.com : New project. Choisir une région en Europe (données des clients en Europe, RGPD).
2. Noter le mot de passe de la base : la commande `supabase link` (étape 6) peut le demander.

## 2. Créer les tables et les règles d'accès

1. Dans le projet : **SQL Editor → New query**.
2. Copier tout le contenu de `supabase/schema.sql`, le coller, cliquer **Run**.
3. Le résultat doit indiquer un succès. Le script peut être relancé sans risque.

Ce script crée les tables, la table des administrateurs, les fonctions de contrôle des commandes,
et active les règles d'accès : sans compte administrateur, personne ne peut lire ni modifier une commande.

## 3. Créer le compte administrateur

1. **Authentication → Users → Add user → Create new user** : email + mot de passe (cocher la confirmation automatique).
2. Dans **SQL Editor**, lancer (en remplaçant l'email) :

   ```sql
   insert into admins (user_id, email)
   select id, email from auth.users where email = 'ton-email@exemple.fr';
   ```

3. Fermer les inscriptions publiques : dans les réglages d'authentification (fournisseur Email),
   désactiver l'option qui autorise les nouveaux utilisateurs à s'inscrire. Les comptes se créent alors
   seulement depuis le tableau de bord.

L'admin du site (`/admin`) demande maintenant cet email et ce mot de passe. Un compte qui n'est pas dans la table
`admins` est refusé.

## 4. Créer l'espace de stockage des fichiers de découpe

**Storage → New bucket** : nom `production`, **privé** (ne pas cocher « public »).

## 5. Relier le site (fichier `.env`)

1. Copier `.env.example` en `.env` à la racine du projet.
2. Dans Supabase, **Project Settings → API** (ou « API Keys ») : copier l'URL du projet et la clé publique
   (`anon` ou `publishable`) dans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Dans Stripe, en **mode test** : Développeurs → Clés API, copier la clé publiable (`pk_test_…`)
   dans `VITE_STRIPE_PUBLISHABLE_KEY`.
4. Relancer `npm run dev`.

## 6. Installer les fonctions serveur

Elles s'installent avec l'outil en ligne de commande de Supabase, sans rien installer de plus (`npx`).
Dans un terminal, à la racine du projet :

```bash
npx supabase login
```

```bash
npx supabase init
```

(Elle crée seulement `supabase/config.toml` ; aux questions sur les réglages d'éditeur, on peut répondre non.)

```bash
npx supabase link --project-ref TON_ID_DE_PROJET
```

L'identifiant du projet est dans l'adresse du tableau de bord : `supabase.com/dashboard/project/TON_ID_DE_PROJET`.
Si le mot de passe de la base est demandé, saisir celui noté à l'étape 1.

Enregistrer les secrets (remplacer les valeurs) :

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
```

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
```

```bash
npx supabase secrets set RESEND_API_KEY=re_xxx EMAIL_FROM="LumiCut <commandes@ton-domaine.fr>"
```

Déployer les six fonctions (toutes avec `--no-verify-jwt` : chacune vérifie elle-même qui l'appelle) :

```bash
npx supabase functions deploy create-order --no-verify-jwt
```

```bash
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

```bash
npx supabase functions deploy ai-advisor --no-verify-jwt
```

```bash
npx supabase functions deploy send-order-email --no-verify-jwt
```

```bash
npx supabase functions deploy generate-order-dxf --no-verify-jwt
```

```bash
npx supabase functions deploy send-review-requests --no-verify-jwt
```

Ce que fait chacune :

| Fonction | Qui peut l'appeler | Rôle |
|---|---|---|
| `create-order` | tout le monde (limité à 20 essais / 10 min / visiteur) | recalcule le prix, enregistre tous les articles, crée un seul paiement par passage en caisse |
| `stripe-webhook` | Stripe seulement (signature vérifiée) | passe la commande « payée » si le montant reçu est le bon, gère échecs et remboursements |
| `ai-advisor` | tout le monde (30 messages / heure / visiteur, 1 500 / jour au total) | conseiller IA, la clé reste sur le serveur |
| `send-order-email` | le serveur et les administrateurs connectés | emails aux clients |
| `generate-order-dxf` | le serveur et les administrateurs connectés | fichier de découpe (encore incomplet : lot 2 du check-up) |
| `send-review-requests` | la tâche planifiée seulement (clé de service) | demandes d'avis J+10 |

## 7. Brancher le webhook Stripe

1. Stripe, **mode test** : Développeurs → Webhooks → ajouter un endpoint (ou « destination »).
2. Adresse : `https://TON_ID_DE_PROJET.supabase.co/functions/v1/stripe-webhook`
3. Événements à cocher : `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.
4. Copier le **secret de signature** (`whsec_…`) puis :

```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 8. Tester une commande de bout en bout

1. `npm run dev`, composer un panneau dans le studio, l'ajouter au panier, passer commande.
2. Carte de test : `4242 4242 4242 4242`, une date future, n'importe quel code à 3 chiffres.
3. Attendu :
   - la page « Commande confirmée ! » avec le numéro et le montant ;
   - dans `/admin`, la commande « Payée — à produire » avec tous ses panneaux ;
   - l'email de confirmation (si Resend est configuré).
4. Carte refusée : `4000 0000 0000 0002` → « Paiement refusé », le panier est conservé.
5. Remboursement : depuis le paiement dans Stripe → la commande passe « Annulée / remboursée ».

En cas de souci : Supabase → **Edge Functions → (la fonction) → Logs**, et Stripe → Webhooks → l'endpoint → les tentatives.

## 9. Passer en vrai paiement

Refaire les étapes 5, 6 (secret `STRIPE_SECRET_KEY`) et 7 avec les clés et le webhook du **mode live** de Stripe.

---

## Tester le site en ligne (sans les fichiers sur son ordinateur)

Netlify construit et héberge le site à partir de GitHub, gratuitement, à chaque push.
Tout est déjà réglé dans `netlify.toml` (et `vercel.json` si l'on préfère Vercel).

1. Créer un compte sur netlify.com en choisissant « Sign up with GitHub ».
2. **Add new site → Import an existing project → GitHub**, autoriser Netlify, choisir le dépôt `lumicut`.
3. Branche à déployer : `claude/epic-planck-axkttn` (la branche de travail). Laisser les réglages proposés
   (commande `npm run build`, dossier `dist`), puis **Deploy**.
4. L'adresse du site s'affiche (du type `quelque-chose.netlify.app`) ; elle se renomme dans les réglages du site.
5. Une fois Supabase et Stripe prêts (étapes 1 à 7) : **Site configuration → Environment variables**, ajouter
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_STRIPE_PUBLISHABLE_KEY`, puis relancer un déploiement
   (**Deploys → Trigger deploy**).

Sans ces variables, le studio (2D, 3D, motifs, éclairage, étapes) et le panier fonctionnent ; le paiement et
le conseiller IA indiquent que la boutique n'est « pas encore reliée à son serveur », et l'admin est indisponible
(pas de mode démo en ligne).

## Au quotidien

- **Changer un prix** (format, matériau, option, livraison, rubans) : modifier `src/lib/…`, puis lancer
  `npm run build:server` et redéployer `create-order` et `ai-advisor`. Le build du site refuse de partir tant
  que la copie serveur n'est pas à jour (`npm run build` le vérifie).
- **Tests** : `npm test` (prix, commandes, webhook, conseiller).
- **Tâches planifiées** (facultatif) : purge des commandes jamais payées après 30 jours et demandes d'avis,
  voir la fin de `supabase/schema.sql`.

## Développer sans Supabase en ligne

`node dev-server.js` simule `create-order`, `stripe-webhook` et `ai-advisor` avec le même code que Supabase.
Renseigner dans `.env` : `VITE_API_BASE=http://localhost:3001`, `STRIPE_SECRET_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (les commandes vont quand même dans la base Supabase), puis :

```bash
stripe listen --forward-to localhost:3001/functions/v1/stripe-webhook
```

Sans Supabase du tout, l'admin s'ouvre en **mode démo** (commandes fictives) en développement seulement ;
le site en ligne ne le permet jamais.
