import steno6 from "../assets/stenography/steno_6.png";
import steno7 from "../assets/stenography/steno_7.png";
import steno8 from "../assets/stenography/steno_8.png";
import steno9 from "../assets/stenography/steno_9.png";
import steno10 from "../assets/stenography/steno_10.png";

export type StenoExercise = {
  readonly id: string;
  readonly exerciseNumber: 6 | 7 | 8 | 9 | 10;
  readonly imagePath: string;
  readonly sentence: string;
};

export const STENO_EXERCISES = [
  { id: "steno-6", exerciseNumber: 6, imagePath: steno6, sentence: "In only three weeks we will begin meeting daily." },
  { id: "steno-7", exerciseNumber: 7, imagePath: steno7, sentence: "If you are early, go to the meeting room." },
  { id: "steno-8", exerciseNumber: 8, imagePath: steno8, sentence: "Sales have finally increased; we are greatly relieved." },
  { id: "steno-9", exerciseNumber: 9, imagePath: steno9, sentence: "Beth is likely to finish the job properly." },
  { id: "steno-10", exerciseNumber: 10, imagePath: steno10, sentence: "I am highly pleased by the totally new look of our store." },
] as const satisfies readonly StenoExercise[];
