export interface DifficultyLevel {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
}

/**
 * Named, described difficulty levels — shown instead of a bare 1-5 number so picking one
 * is a judgment call about the chapter ("does this feel like this?"), not a guess at what
 * the number means. The scheduling algorithm uses this value to size and space out review
 * sessions, so the description ties the choice back to something concrete.
 */
export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { value: 1, label: "Très facile", description: "Acquis presque tout de suite, peu de risque d'oubli." },
  { value: 2, label: "Facile", description: "Bien compris, juste besoin d'un peu de pratique." },
  { value: 3, label: "Modéré", description: "Demande de la pratique régulière pour rester à l'aise." },
  { value: 4, label: "Difficile", description: "Notions denses ou techniques — retient l'attention plus longtemps." },
  { value: 5, label: "Très difficile", description: "Point dur du programme, à retravailler souvent." },
];

export function difficultyLevel(value: number): DifficultyLevel {
  return DIFFICULTY_LEVELS.find((l) => l.value === value) ?? DIFFICULTY_LEVELS[2];
}
