import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Brain, Plus, Trash2, Sparkles, Printer, Download, RotateCcw, 
  ChevronLeft, ChevronRight, FileText, ListTree, Image as ImageIcon, 
  HelpCircle, Loader2, Languages, Phone, CheckCircle2, Share2, 
  Key, AlertCircle, FileType, BookOpen, SortAsc, Edit3, Play, 
  Pause, FastForward, Rewind, MonitorPlay, X, Info, Type as TypeIcon, 
  Upload, Save, FileUp, FileCode, Monitor, HelpCircle as HelpIcon,
  LifeBuoy
} from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { LessonState, Step, WordCategory, OddOneOutSet, DefinitionMatch, DualWordSet, LessonMode } from './types';
import { 
  suggestSemanticNetwork, generateFillInTheBlanks, generateEducationalText, 
  generateImageForWord, generateDefinitions, generateDualWordSets, 
  addNikudToContent, suggestSemanticNetworkFromText, generateLogicalOddOneOut 
} from './services/geminiService';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const Hint: React.FC<{ text: string; active: boolean }> = ({ text, active }) => {
  if (!active) return null;
  return (
    <div className="absolute -top-2 -right-2 z-50">
      <div className="group relative">
        <div className="bg-amber-400 text-amber-950 p-1.5 rounded-full shadow-lg border-2 border-white cursor-help animate-pulse">
          <HelpIcon size={14} />
        </div>
        <div className="absolute bottom-full right-0 mb-3 w-64 bg-slate-800 text-white text-sm p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-right leading-relaxed border border-slate-700 backdrop-blur-sm">
          {text}
          <div className="absolute top-full right-3 border-8 border-transparent border-t-slate-800"></div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [nikudLoading, setNikudLoading] = useState(false);
  const [imageLoadingWord, setImageLoadingWord] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exercise selection states
  const [selectedWordsForDefs, setSelectedWordsForDefs] = useState<string[]>([]);
  const [selectedWordsForABC, setSelectedWordsForABC] = useState<string[]>([]);

  // Flashcards state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlashcardPlaying, setIsFlashcardPlaying] = useState(false);
  const [flashcardInterval, setFlashcardInterval] = useState(2); 
  const playTimerRef = useRef<number | null>(null);

  const [state, setState] = useState<LessonState>({
    mode: 'topic',
    topic: '',
    sourceText: '',
    description: '',
    gradeLevel: '',
    withNikud: false,
    categories: [],
    wordImages: [],
    oddOneOutSets: [],
    definitionMatches: [],
    alphabeticalWords: [],
    dualWordSets: [],
    text: '',
    usedWords: []
  });

  const [fillBlanks, setFillBlanks] = useState<string[]>([]);
  const [activeExTab, setActiveExTab] = useState<'fill' | 'images' | 'odd' | 'def' | 'abc' | 'dual'>('fill');

  const shuffledDefsForUI = useMemo(() => {
    return [...(state.definitionMatches || [])].sort(() => 0.5 - Math.random());
  }, [state.definitionMatches]);

  const imageWordBank = useMemo(() => {
    return [...(state.wordImages || [])].map(img => img.word).sort(() => 0.5 - Math.random());
  }, [state.wordImages]);

  const allWords = useMemo(() => {
    return (state.categories || []).flatMap(c => c.words || []);
  }, [state.categories]);

  // Clear saved state on mount so each visit starts clean
  useEffect(() => {
    try {
      localStorage.removeItem('ilanit_lesson_builder_v4');
    } catch (e) {
      console.error('Could not clear saved lesson state', e);
    }
  }, []);

  // Autosave
  useEffect(() => {
    const dataToSave = { state, fillBlanks, currentStep };
    localStorage.setItem('ilanit_lesson_builder_v4', JSON.stringify(dataToSave));
  }, [state, fillBlanks, currentStep]);

  useEffect(() => {
    const checkKey = async () => {
      // Check if API key is available in environment (for GitHub Pages deployment)
      const envApiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (envApiKey && envApiKey !== 'undefined' && envApiKey !== 'null') {
        setHasApiKey(true);
        return;
      }
      
      // Check AI Studio API key (for local development in AI Studio)
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (isFlashcardPlaying && allWords.length > 0) {
      playTimerRef.current = window.setInterval(() => {
        setFlashcardIndex((prev) => (prev + 1) % allWords.length);
      }, flashcardInterval * 1000);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isFlashcardPlaying, flashcardInterval, allWords]);

  const handleExportProject = () => {
    const projectData = {
      state,
      fillBlanks,
      currentStep,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `פרויקט_אילנית_${state.topic || 'חדש'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.state) {
          setState(parsed.state);
          setFillBlanks(parsed.fillBlanks || []);
          setCurrentStep(parsed.currentStep || 1);
          alert('הפרויקט נטען בהצלחה!');
        }
      } catch (error) {
        alert('שגיאה בטעינת הקובץ.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setError(null);
    }
  };

  const handleDownloadFlashcards = () => {
    if (allWords.length === 0) return alert('אין מילים לייצוא');
    
    const cardsJson = JSON.stringify(allWords);
    const htmlContent = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>כרטיסי הברקה - ${state.topic}</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@800&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0; padding: 0; overflow: hidden;
            font-family: 'Assistant', sans-serif;
            background-color: #1e40af; color: white;
            display: flex; flex-direction: column; height: 100vh;
        }
        .card-container {
            flex: 1; display: flex; align-items: center; justify-content: center;
            text-align: center; padding: 20px;
        }
        .word {
            font-size: 15vw; font-weight: 800; line-height: 1.2;
            text-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .controls {
            background: rgba(0,0,0,0.2); padding: 20px;
            display: flex; justify-content: center; gap: 40px; align-items: center;
        }
        button {
            background: white; color: #1e40af; border: none;
            padding: 15px 30px; border-radius: 50px; font-weight: bold;
            cursor: pointer; font-size: 1.2rem; transition: all 0.2s;
        }
        button:hover { transform: scale(1.05); background: #f8fafc; }
        button:active { transform: scale(0.95); }
        .counter { font-size: 1.2rem; font-weight: bold; min-width: 80px; text-align: center; }
        .topic-header { position: absolute; top: 20px; right: 20px; font-size: 1rem; opacity: 0.6; }
    </style>
</head>
<body>
    <div class="topic-header">${state.topic} | אילנית שוורץ</div>
    <div class="card-container">
        <div id="wordDisplay" class="word"></div>
    </div>
    <div class="controls">
        <button onclick="prev()">קודם</button>
        <div class="counter"><span id="curr">1</span> / <span id="total"></span></div>
        <button onclick="next()">הבא</button>
    </div>

    <script>
        const words = ${cardsJson};
        let index = 0;
        
        const display = document.getElementById('wordDisplay');
        const currEl = document.getElementById('curr');
        const totalEl = document.getElementById('total');
        totalEl.innerText = words.length;

        function update() {
            display.innerText = words[index];
            currEl.innerText = index + 1;
            // Force re-trigger animation
            display.style.animation = 'none';
            display.offsetHeight; 
            display.style.animation = null;
        }

        function next() {
            index = (index + 1) % words.length;
            update();
        }

        function prev() {
            index = (index - 1 + words.length) % words.length;
            update();
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') next();
            if (e.key === 'ArrowRight') prev();
            if (e.key === ' ') next();
        });

        update();
    </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `כרטיסי_הברקה_${state.topic || 'שיעור'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generatePrintHTML = (mode: 'print' | 'doc' | 'html' = 'print') => {
    const isElementary = state.gradeLevel === 'גן' || state.gradeLevel === 'א-ב';
    const fontSizeBody = isElementary ? '18pt' : '14pt';
    const fontSizeTitle = isElementary ? '24pt' : '20pt';
    const lineHeight = isElementary ? '2.5' : '1.8';

    const styles = `
      body { font-family: 'Assistant', 'Heebo', sans-serif; direction: rtl; padding: 40px; max-width: 900px; margin: 0 auto; line-height: ${lineHeight}; font-size: ${fontSizeBody}; }
      h1 { font-size: ${fontSizeTitle}; text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 30px; }
      h2 { font-size: 1.4em; border-bottom: 2px solid #ddd; margin-top: 40px; padding-bottom: 5px; }
      .categories-container { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 15px; 
        margin: 20px 0;
      }
      .category-box { 
        border: 1px solid #2563eb; 
        border-radius: 10px; 
        padding: 15px; 
        width: calc(50% - 10px); 
        box-sizing: border-box; 
        background: #f8fbff; 
        page-break-inside: avoid; 
      }
      .text-box { border: 2px solid #000; padding: 25px; border-radius: 12px; margin: 20px 0; background: #fafafa; white-space: pre-wrap; }
      .image-item { border: 1px solid #ddd; padding: 10px; border-radius: 10px; display: inline-block; width: 30%; margin: 1%; text-align: center; page-break-inside: avoid; }
      .blank-line { border-bottom: 1.5px dashed #000; width: 100%; height: 35px; margin-top: 5px; }
      .word-bank { border: 2px solid #7c3aed; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px; background: #f5f3ff; }
      .word-bank-item { display: inline-block; margin: 0 10px; font-weight: bold; }
      .definition-row { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; page-break-inside: avoid; }
      .def-word { border: 1px solid #333; padding: 5px 15px; border-radius: 8px; font-weight: bold; min-width: 120px; text-align: center; }
      .def-line { flex: 1; border-bottom: 1px dashed #999; }
      .def-text { border: 1px solid #eee; padding: 8px; border-radius: 8px; flex: 2; background: #fff; }
      .odd-option { border: 1px solid #ccc; padding: 5px 15px; border-radius: 20px; margin: 5px; display: inline-block; font-weight: bold; }
      .copyright { margin-top: 50px; text-align: center; font-size: 10pt; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
      
      @media print {
        .category-box { width: calc(50% - 10px) !important; display: block !important; }
        .categories-container { display: flex !important; flex-wrap: wrap !important; }
      }
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head><meta charset="UTF-8"><title>דף עבודה - ${state.topic}</title><style>${styles}</style></head>
      <body>
        <h1>${state.topic}</h1>
        <p>שם התלמיד/ה: _________________________ | תאריך: _________________</p>
        
        <section>
          <h2>1. מפת המילים</h2>
          <div class="categories-container">
            ${(state.categories || []).map(c => `
              <div class="category-box">
                <strong style="color: #1e40af; border-bottom: 1px solid #2563eb; display: block; margin-bottom: 8px;">${c.name}</strong>
                ${(c.words || []).map(w => `• ${w}<br/>`).join('')}
              </div>
            `).join('')}
          </div>
        </section>

        <section>
          <h2>2. טקסט קריאה</h2>
          <div class="text-box">${(state.text || '').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</div>
        </section>

        ${state.wordImages.length > 0 ? `
        <section>
          <h2>3. התאמת תמונה למילה</h2>
          <div class="word-bank">${imageWordBank.map(w => `<span class="word-bank-item">${w}</span>`).join('')}</div>
          <div style="text-align: center;">
            ${state.wordImages.map(img => `
              <div class="image-item">
                <img src="${img.url}" style="max-width: 100%; height: 120px; object-fit: contain;" /><br/>
                <div class="blank-line"></div>
              </div>
            `).join('')}
          </div>
        </section>
        ` : ''}

