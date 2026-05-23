import { useEffect, useMemo } from 'react';
import { atom, useAtom, useSetAtom } from 'jotai';
import { Play, Pause, Square, ChevronRight, Check } from 'lucide-react';
import PART1_TOPICS from './content/partOneTopics';
import PART2_QUESTIONS from './content/partTwoQuestions';
import PART3_SITUATIONS from './content/partThreeSituations';

// --- 1. TYPES & DATA STRUCTURES ---

type ContentItem = {
  question?: string;
  situation?: string;
  topics?: string[];
  tags?: string[];
};

type StepDef = {
  id: string;
  title: string;
  description: string;
  content?: ContentItem;
  firstWarning?: number;
  secondWarning?: number;
};

// --- 2. JOTAI STATE ---

type AppState = 'menu' | 'running' | 'results';
type ExamMode = 'part1' | 'part2' | 'part3' | 'all';

const appStateAtom = atom<AppState>('menu');
const stepsAtom = atom<StepDef[]>([]);
const currentStepIndexAtom = atom<number>(0);
const stepTimesAtom = atom<number[]>([]);
const isPausedAtom = atom<boolean>(false);

// --- 3. HELPER FUNCTIONS ---

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const getRandomItems = <T,>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const generateSteps = (mode: ExamMode): StepDef[] => {
  const topicsFirstHalf = getRandomItems([0, 1, 2, 3], 2);
  const topicsSecondHalf = getRandomItems([4, 5, 6, 7], 2);

  const p1TNATopics = [PART1_TOPICS[topicsFirstHalf[0]], PART1_TOPICS[topicsSecondHalf[0]]];
  const p1TNBTopics = [PART1_TOPICS[topicsFirstHalf[1]], PART1_TOPICS[topicsSecondHalf[1]]];

  // todo group and get questions from different groups
  const p2Questions = getRandomItems(PART2_QUESTIONS, 2);

  // todo parse md/html. Provide link to example-dialogue (if exists)
  const p3Situations = getRandomItems(PART3_SITUATIONS, 1);

  const WARNINGS = {
    presentation1: 120,
    presentation2: 150,

    antwort1: 120,
    antwort2: 150,

    zusammenFassung1: 30,
    zusammenFassung2: 45,

    smallTalk1: 90,
    smallTalk2: 120,

    problemSolving1: 240,
    problemSolving2: 270,
  }

  // part 1: 2 x (2min + 2min + 30sec) = 9min
  // part 2: 3 min
  // part 3: 4 min
  // ================
  // 16 min

  const part1Steps: StepDef[] = [
    { id: '1-1', title: 'Teil 1A: TN A - Präsentation (ca. 2 Minuten)', description: 'TN A wählt ein Thema aus und spricht über gewählte Thema.', content: { topics: p1TNATopics }, firstWarning: WARNINGS.presentation1, secondWarning: WARNINGS.presentation2 },
    { id: '1-2', title: 'Teil 1B: TN A - Antwort (ca. 2 Minuten)', description: 'Prüfer stellt eine Anschlussfrage und TN A beantwortet.', firstWarning: WARNINGS.antwort1, secondWarning: WARNINGS.antwort2 },
    { id: '1-3', title: 'Teil 1C: TN B - Zusammenfassung (ca. ½ Minute)', description: 'TN B fasst die Antwort in eigenen Worten zusammen.', firstWarning: WARNINGS.zusammenFassung1, secondWarning: WARNINGS.zusammenFassung2 },
    { id: '1-4', title: 'Teil 1A: TN B - Präsentation (ca. 2 Minuten)', description: 'TN A wählt ein Thema aus und spricht über gewählte Thema.', content: { topics: p1TNBTopics }, firstWarning: WARNINGS.presentation1, secondWarning: WARNINGS.presentation2 },
    { id: '1-5', title: 'Teil 1B: TN B - Antwort (ca. 2 Minuten)', description: 'Prüfer stellt eine Anschlussfrage und TN B beantwortet.', firstWarning: WARNINGS.antwort1, secondWarning: WARNINGS.antwort2 },
    { id: '1-6', title: 'Teil 1C: TN A - Zusammenfassung (ca. ½ Minute)', description: 'TN A fasst die Antwort in eigenen Worten zusammen.', firstWarning: WARNINGS.zusammenFassung1, secondWarning: WARNINGS.zusammenFassung2 },
  ];

  const part2Steps: StepDef[] = [
    { id: '2-1', title: 'Teil 2: Smalltalk TN A (ca. 1 ½ Minuten)', description: 'TN A stellt eine Frage an TN B.', content: { question: p2Questions[0]?.question, tags: p2Questions[0]?.tags }, firstWarning: WARNINGS.smallTalk1, secondWarning: WARNINGS.smallTalk2 },
    { id: '2-2', title: 'Teil 2: Smalltalk TN B (ca. 1 ½ Minuten)', description: 'TN B stellt eine Frage an TN A.', content: { question: p2Questions[1]?.question, tags: p2Questions[1]?.tags }, firstWarning: WARNINGS.smallTalk1, secondWarning: WARNINGS.smallTalk2 },
  ];

  const part3Steps: StepDef[] = [
    { id: '3-1', title: 'Teil 3: Lösungswege diskutieren (ca. 4 Minuten)', description: 'Beide TN lösen gemeinsam ein Problem.', content: { situation: p3Situations[0]?.situation, tags: p3Situations[0]?.tags }, firstWarning: WARNINGS.problemSolving1, secondWarning: WARNINGS.problemSolving2 },
  ];

  if (mode === 'part1') return part1Steps;
  if (mode === 'part2') return part2Steps;
  if (mode === 'part3') return part3Steps;
  return [...part1Steps, ...part2Steps, ...part3Steps];
};

// --- 4. COMPONENTS ---

const MenuScreen = () => {
  const setAppState = useSetAtom(appStateAtom);
  const setSteps = useSetAtom(stepsAtom);
  const setStepTimes = useSetAtom(stepTimesAtom);
  const setCurrentStepIndex = useSetAtom(currentStepIndexAtom);
  const setIsPaused = useSetAtom(isPausedAtom);

  const startSimulation = (mode: ExamMode) => {
    const newSteps = generateSteps(mode);
    setSteps(newSteps);
    setStepTimes(new Array(newSteps.length).fill(0));
    setCurrentStepIndex(0);
    setIsPaused(false);
    setAppState('running');
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen p-8 select-none">
      <h1 className="text-4xl font-bold text-gray-900! mb-12">DTB B2 Sprechen Prüfungssimulator</h1>

      <div className="flex flex-col gap-4 w-full max-w-4xl">
        {/* Full width master button */}
        <button
          onClick={() => startSimulation('all')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-6 rounded-xl shadow-md transition-all text-xl"
        >
          Komplette Prüfung
        </button>

        {/* Sub-grid for individual parts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => startSimulation('part1')}
            className="bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 font-semibold py-5 px-4 rounded-xl shadow-sm transition-all text-base"
          >
            Teil 1 (Präsentation)
          </button>
          <button
            onClick={() => startSimulation('part2')}
            className="bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 font-semibold py-5 px-4 rounded-xl shadow-sm transition-all text-base"
          >
            Teil 2 (Smalltalk)
          </button>
          <button
            onClick={() => startSimulation('part3')}
            className="bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 font-semibold py-5 px-4 rounded-xl shadow-sm transition-all text-base"
          >
            Teil 3 (Problemlösung)
          </button>
        </div>
      </div>
    </div>
  );
};

const TimerScreen = () => {
  const setAppState = useSetAtom(appStateAtom);
  const [steps] = useAtom(stepsAtom);
  const [currentIndex, setCurrentIndex] = useAtom(currentStepIndexAtom);
  const [stepTimes, setStepTimes] = useAtom(stepTimesAtom);
  const [isPaused, setIsPaused] = useAtom(isPausedAtom);

  const currentStep = steps[currentIndex];
  const totalTime = useMemo(() => stepTimes.reduce((a, b) => a + b, 0), [stepTimes]);
  const currentStepTime = stepTimes[currentIndex] || 0;

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setStepTimes((prev) => {
        const next = [...prev];
        next[currentIndex] += 1;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, currentIndex, setStepTimes]);

  let bgClass = "bg-white";
  if (currentStep.secondWarning && currentStepTime >= currentStep.secondWarning) {
    bgClass = "bg-rose-200";
  } else if (currentStep.firstWarning && currentStepTime >= currentStep.firstWarning) {
    bgClass = "bg-orange-100";
  }

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setAppState('results');
    }
  };

  const handleAbort = () => {
    if (confirm("Simulation wirklich abbrechen?")) setAppState('menu');
  };

  return (
    <div className={`w-full h-screen flex flex-col justify-between py-8 px-32 transition-colors duration-500 select-none ${bgClass}`}>

      {/* Top Header: Metadata on Left, Compact Timers on Right */}
      <div className="flex justify-between items-center border-b border-gray-200/60 pb-4 h-16">
        <div>
          <span className="place-self-start bg-gray-900/10 px-3 py-1 rounded-full text-gray-700 font-medium text-xs">
            Schritt {currentIndex + 1} von {steps.length}
          </span>
          <h3 className="text-xl font-bold text-gray-900 mt-1">{currentStep.title}</h3>
        </div>

        {/* Corner Timers Dashboard */}
        <div className="text-right flex flex-col justify-center">
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-xs text-gray-500 font-medium uppercase">Schritt:</span>
            <span className="text-3xl font-mono font-bold text-gray-900 tracking-tight">
              {formatTime(currentStepTime)}
            </span>
          </div>
          <div className="flex items-baseline gap-1 justify-end -mt-1">
            <span className="text-[10px] text-gray-400 font-medium uppercase">Gesamt:</span>
            <span className="text-sm font-mono font-semibold text-gray-500">
              {formatTime(totalTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container Area: Centered statically with strict size limits */}
      <div className="grow flex flex-col justify-center items-center w-full max-w-4xl mx-auto py-4 overflow-hidden">
        <p className="text-lg text-gray-600 mb-6 text-center select-text">{currentStep.description}</p>

        {currentStep.content && (
          <div className="w-full max-h-[55vh] overflow-y-auto pr-1 select-text">

            {/* Part 1 Content Layout */}
            {currentStep.content.topics && (
              <div className="flex flex-col gap-3">
                {currentStep.content.topics.map((topic, idx) => (
                  <div key={idx} className="bg-white/90 p-5 rounded-lg border border-gray-200 shadow-sm text-left">
                    <p className="text-xl font-medium text-gray-800 text-pretty">{topic}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Part 2 Content Layout */}
            {currentStep.content.question && (
              <div className="bg-white/90 p-6 rounded-lg border border-gray-200 shadow-sm text-center">
                <p className="text-2xl font-medium text-gray-800 mb-4 text-pretty text-left md:text-center">
                  {currentStep.content.question}
                </p>
                {currentStep.content.tags && (
                  <div className="flex justify-center gap-2">
                    {currentStep.content.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Part 3 Content Layout */}
            {currentStep.content.situation && (
              <div className="bg-white/90 px-4 pb-4 rounded-lg border border-gray-200 shadow-sm text-center">
                <pre className="text-md leading-5 font-sans font-medium text-gray-800 text-pretty text-left">
                  {currentStep.content.situation}
                </pre>
                {currentStep.content.tags && (
                  <div className="flex justify-center gap-2">
                    {currentStep.content.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Actions Row */}
      <div className="flex justify-between items-center border-t border-gray-200/40 pt-4 h-20">
        <button onClick={handleAbort} className="cursor-pointer w-44 justify-center text-gray-500 hover:text-red-600 flex items-center gap-2 text-base font-medium transition-colors">
          <Square size={20} /> Abbrechen
        </button>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="cursor-pointer bg-gray-900 text-white p-4 rounded-full hover:bg-gray-800 shadow-md transition-transform active:scale-95"
        >
          {isPaused ? <Play size={24} /> : <Pause size={24} />}
        </button>

        <button
          onClick={handleNext}
          className="cursor-pointer bg-blue-600 hover:bg-blue-700 w-44 justify-center text-white font-bold py-3.5 px-6 rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
        >
          {currentIndex === steps.length - 1 ? (
            <>Abschließen <Check size={22} /></>
          ) : (
            <>Weiter <ChevronRight size={22} /></>
          )}
        </button>
      </div>
    </div>
  );
};

const ResultsScreen = () => {
  const setAppState = useSetAtom(appStateAtom);
  const [steps] = useAtom(stepsAtom);
  const [stepTimes] = useAtom(stepTimesAtom);
  const totalTime = stepTimes.reduce((a, b) => a + b, 0);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const cumulativeTimes = useMemo(() => {
    let currentTotal = 0;
    return stepTimes.map(time => {
      // eslint-disable-next-line react-hooks/immutability
      currentTotal += time;
      return currentTotal;
    });
  }, [stepTimes]);

  return (
    <div className="w-full h-screen flex flex-col p-6 items-center justify-between select-none bg-gray-50">
      <div className="w-full max-w-6xl flex flex-col h-[85vh]">
        <h2 className="text-3xl font-bold text-gray-900! mb-4 text-center">Auswertung</h2>

        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex justify-between items-center h-14">
          <span className="text-lg font-semibold text-gray-700">Gesamte Sprechzeit:</span>
          <span className="text-2xl font-mono font-bold text-blue-600">{formatTime(totalTime)}</span>
        </div>

        {/* Dense 2-column grid to completely eliminate scrolling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto max-h-[68vh] pr-1">
          {steps.map((step, i) => {
            const time = stepTimes[i];
            const cumulative = cumulativeTimes[i];

            let rowColor = "bg-white border-gray-200";
            let textColor = "text-gray-900";
            if (step.secondWarning && time >= step.secondWarning) {
              rowColor = "bg-red-50 border-red-200";
              textColor = "text-red-900";
            } else if (step.firstWarning && time >= step.firstWarning) {
              rowColor = "bg-orange-50 border-orange-200";
              textColor = "text-orange-900";
            }

            return (
              <div key={step.id} className={`flex justify-between items-center px-4 py-2 rounded-lg border shadow-sm ${rowColor}`}>
                <div className="truncate max-w-[70%] text-start">
                  <p className={`font-bold text-sm truncate ${textColor}`}>{step.title}</p>
                  <p className="text-xs text-gray-500 truncate">{step.description}</p>
                </div>
                <div className="text-right flex items-center gap-3 shrink-0">
                  <div className="flex flex-col">
                    <span className={`font-mono font-bold text-base leading-tight ${textColor}`}>{formatTime(time)}</span>
                    <span className="font-mono text-[10px] text-gray-400">G: {formatTime(cumulative)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full flex justify-center h-16 items-center">
        <button
          onClick={() => setAppState('menu')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 text-lg rounded-xl shadow-md transition-colors"
        >
          Zurück zum Menü
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [appState] = useAtom(appStateAtom);

  return (
    <div
      className="bg-gray-50 text-gray-900 font-sans w-full h-screen overflow-hidden flex"
      style={{ colorScheme: 'light' }}
    >
      {appState === 'menu' && <MenuScreen />}
      {appState === 'running' && <TimerScreen />}
      {appState === 'results' && <ResultsScreen />}
    </div>
  );
}
