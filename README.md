# PrépaPilot

Application de planification de révisions pour étudiants en prépa scientifique. Renseigne ton emploi du temps, tes disponibilités, tes DS, colles et DM : PrépaPilot génère automatiquement un planning de travail pour tes créneaux libres, en priorisant ce qui compte le plus.

## Démarrer

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Aucune configuration n'est requise : l'application démarre avec les matières de base (Maths, Physique, Chimie, SI, Français/Philo, Anglais, TIPE, Autre) et tout le reste vide — à toi de renseigner tes chapitres, ton emploi du temps, tes disponibilités et tes échéances. Tout est stocké dans le `localStorage` du navigateur.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, React 19) + TypeScript
- Tailwind CSS v4
- Zustand (état applicatif local, persisté)
- Recharts (graphiques de progression)
- Framer Motion (animations)
- Supabase (auth + persistance, optionnel — voir ci-dessous)

## Algorithme de planification

Le cœur de l'app est un algorithme déterministe (`src/lib/scheduling/`) — pas d'IA — qui :

1. calcule un score de priorité par chapitre (urgence × difficulté × besoin de maîtrise × importance),
2. répartit les sessions dans les créneaux disponibles de la semaine en équilibrant les matières et en insérant des pauses,
3. ne remplit jamais tous les créneaux (du temps libre est toujours conservé),
4. sait replanifier une session ignorée ou supprimée (`rescheduleSession`) vers le prochain créneau pertinent.

## Supabase (optionnel)

L'app fonctionne entièrement sans Supabase (stockage local uniquement). Pour activer l'authentification et préparer une future persistance serveur :

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Exécute `supabase/schema.sql` dans l'éditeur SQL du projet.
3. Copie `.env.example` vers `.env.local` et renseigne `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Structure

```
src/
  app/            pages (App Router)
  components/     UI + composants par domaine (today, planning, subjects, deadlines, progress)
  lib/
    scheduling/   algorithme de génération du planning
    store/        état applicatif (Zustand, persisté en localStorage)
    supabase/     client Supabase optionnel
    demoData.ts   état initial d'un nouveau profil (matières de base, rien d'autre)
  types/          types partagés
supabase/
  schema.sql      schéma Postgres (tables + RLS) pour une future persistance
```
