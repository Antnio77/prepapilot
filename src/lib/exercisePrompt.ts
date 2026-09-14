/**
 * The prompt a student hands to any AI along with a photo of an exercise, to get back something
 * that pastes straight into the two fields of the exercise form.
 *
 * The syntax rules it states are not preferences — they mirror exactly what MathText renders:
 * `$…$` inline and `$$…$$` as a block, everything else printed literally. Hence markdown being
 * forbidden outright (a `**bold**` would surface as asterisks), and `aligned` named over `align`,
 * which KaTeX shows as a red error.
 *
 * String.raw, not a plain template literal: `\begin{aligned}` would otherwise be read as the
 * escape `\b` (backspace) followed by "egin", and `\end` would silently lose its backslash.
 */
export const PHOTO_PROMPT = String.raw`Tu vas m'aider à transcrire un exercice à partir d'une photo, pour l'intégrer dans un site de flashcards. Respecte EXACTEMENT les règles suivantes.

RÈGLES DE SYNTAXE DU SITE (aucune exception) :
- Le site n'interprète PAS le markdown. N'utilise jamais **gras**, # titre, listes à tirets, etc. Tout ce qui n'est pas entre $ doit être du texte brut, tel quel.
- $...$ = formule dans le texte (inline). Ne doit jamais contenir de retour à la ligne ni de $ à l'intérieur.
- $$...$$ = formule centrée sur sa propre ligne. Peut s'étendre sur plusieurs lignes.
- Pour aligner plusieurs lignes de calcul dans un $$...$$, utilise TOUJOURS l'environnement aligned (\begin{aligned} ... \end{aligned}), JAMAIS align. C'est l'erreur la plus fréquente : align seul est mal supporté et s'affiche en rouge.
- Les retours à la ligne du texte normal sont conservés tels quels, respecte donc la mise en page d'origine (numérotation des questions, sauts de ligne, etc.) en texte brut.
- Un symbole isolé comme * ou < dans un énoncé doit rester tel quel, ne l'interprète jamais comme de la mise en forme.

TA TÂCHE :
1. Lis la photo fournie et transcris fidèlement l'énoncé de l'exercice (texte + formules), en respectant les règles ci-dessus.
2. Si une correction/solution est visible sur la photo, transcris-la de la même façon.
3. Si aucune correction n'est visible, résous toi-même l'exercice et rédige une correction complète et rigoureuse, dans le même format.
4. Ne rajoute AUCUN commentaire, AUCUNE explication, AUCUN titre en dehors de ce qui est demandé. Ta réponse doit contenir uniquement les deux blocs ci-dessous, prêts à être copiés-collés tels quels.

FORMAT DE SORTIE (obligatoire, respecte exactement les délimiteurs) :

===ÉNONCÉ===
[texte de l'énoncé ici]
===FIN ÉNONCÉ===

===CORRECTION===
[texte de la correction ici]
===FIN CORRECTION===`;
