/**
 * The prompt a student hands to any AI along with a photo of an exercise, to get back something
 * that pastes straight into the two fields of the exercise form.
 *
 * The formatting rules are not decoration — they mirror exactly what MathText can render:
 * `$…$` inline and `$$…$$` as a block, everything else printed literally. So markdown has to be
 * forbidden outright (a `**bold**` would show up as asterisks), and `aligned` named over `align`
 * because KaTeX supports the former and renders the latter as a red error.
 */
export const PHOTO_PROMPT = `À partir de la photo, renvoie exactement ces deux blocs et rien d'autre :

ÉNONCÉ
(l'énoncé, fidèle à la photo)

CORRECTION
(la correction rédigée ; si elle n'est pas sur la photo, résous l'exercice toi-même)

Forme imposée :
- texte brut uniquement, aucun markdown (ni **, ni #, ni puces formatées)
- maths en LaTeX : $...$ dans une phrase, $$...$$ pour une formule seule sur sa ligne
- dans $$...$$, utilise aligned et non align pour enchaîner plusieurs lignes
- aucun titre ni commentaire en dehors de ces deux blocs`;
