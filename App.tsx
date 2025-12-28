
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

  // Safe load from LocalStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('ilanit_lesson_builder_v4');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed && parsed.state) {
          setState({
            ...state,
            ...parsed.state,
            categories: parsed.state.categories || [],
            wordImages: parsed.state.wordImages || [],
            oddOneOutSets: parsed.state.oddOneOutSets || [],
            definitionMatches: parsed.state.definitionMatches || [],
            alphabeticalWords: parsed.state.alphabeticalWords || [],
            dualWordSets: parsed.state.dualWordSets || [],
            usedWords: parsed.state.usedWords || []
          });
          setFillBlanks(parsed.fillBlanks || []);
          setCurrentStep(parsed.currentStep || 1);
        }
      } catch (e) {
        console.error("Failed to load autosave", e);
      }
    }
  }, []);

  // Autosave
  useEffect(() => {
    const dataToSave = { state, fillBlanks, currentStep };
    localStorage.setItem('ilanit_lesson_builder_v4', JSON.stringify(dataToSave));
  }, [state, fillBlanks, currentStep]);

  useEffect(() => {
    const checkKey = async () => {
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

        ${state.definitionMatches.length > 0 ? `
        <section>
          <h2>4. הגדרות ופירושים</h2>
          ${state.definitionMatches.map((d, i) => `
            <div class="definition-row">
              <div class="def-word">${d.word}</div>
              <div class="def-line"></div>
              <div class="def-text">${shuffledDefsForUI[i]?.definition || ''}</div>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${state.alphabeticalWords.length > 0 ? `
        <section>
          <h2>5. סדר א"ב</h2>
          <p>סדרו את המילים הבאות לפי סדר הא"ב:</p>
          <div class="word-bank" style="border-color: #10b981; background: #f0fdf4;">
            ${state.alphabeticalWords.map(w => `<span class="word-bank-item">${w}</span>`).join('')}
          </div>
          ${state.alphabeticalWords.map((_, i) => `
            <div style="margin-bottom: 15px; display: flex; align-items: flex-end; gap: 10px;">
              <span style="font-weight: bold; color: #999;">${i + 1}.</span>
              <div style="flex: 1; border-bottom: 1px dashed #000; height: 10px;"></div>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${fillBlanks.length > 0 ? `
        <section>
          <h2>6. השלמת משפטים</h2>
          <ol>
            ${fillBlanks.map(s => `<li style="margin-bottom: 15px;">${s}</li>`).join('')}
          </ol>
        </section>
        ` : ''}

        ${state.oddOneOutSets.length > 0 ? `
        <section>
          <h2>7. מי יוצא דופן?</h2>
          <p>בכל שורה הקיפו את המילה שאינה שייכת והסבירו מדוע:</p>
          ${state.oddOneOutSets.map((set, i) => `
            <div style="margin-bottom: 25px; page-break-inside: avoid;">
              <div style="margin-bottom: 10px;">
                <strong>${i+1}.</strong> ${set.options.map(opt => `<span class="odd-option">${opt}</span>`).join('')}
              </div>
              <div style="font-size: 0.9em; margin-top: 10px;">
                שאלה: מדוע המילה שבחרתם יוצאת דופן? <br/>
                תשובה: __________________________________________________________________
              </div>
            </div>
          `).join('')}
        </section>
        ` : ''}

        ${state.dualWordSets.length > 0 ? `
        <section>
          <h2>8. משפט עם זוג מילים</h2>
          <p>כתבו משפט אחד הכולל את שני המילים המופיעות בכל סעיף:</p>
          ${state.dualWordSets.map((pair, i) => `
            <div style="margin-bottom: 30px;">
              <strong>${i+1}. ${pair.wordA} + ${pair.wordB}</strong>
              <div class="blank-line"></div>
              <div class="blank-line"></div>
            </div>
          `).join('')}
        </section>
        ` : ''}

        <div class="copyright">כל הזכויות שמורות לאילנית שוורץ © ${new Date().getFullYear()}</div>
        ${mode === 'print' ? '<script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>' : ''}
      </body>
      </html>
    `;
    return htmlContent;
  };

  const handlePrintWorksheet = () => {
    const html = generatePrintHTML('print');
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleDownloadDoc = () => {
    const html = generatePrintHTML('doc');
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `דף_עבודה_${state.topic || 'שיעור'}.doc`;
    link.click();
  };

  const handleQuickNikud = async (contentType: 'words' | 'exercises' | 'text') => {
    setNikudLoading(true);
    setError(null);
    try {
      if (contentType === 'words') {
        const updated = await Promise.all((state.categories || []).map(async cat => ({
          ...cat,
          name: await addNikudToContent(cat.name),
          words: await Promise.all((cat.words || []).map(w => addNikudToContent(w)))
        })));
        setState(prev => ({ ...prev, categories: updated }));
      } else if (contentType === 'exercises') {
        setFillBlanks(await Promise.all(fillBlanks.map(s => addNikudToContent(s))));
      } else if (contentType === 'text') {
        const nikud = await addNikudToContent(state.text);
        setState(prev => ({ ...prev, text: nikud }));
      }
    } catch (err) { handleError(err); } finally { setNikudLoading(false); }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setState(prev => ({
      ...prev,
      categories: [...(prev.categories || []), { id: Date.now().toString(), name: newCategoryName.trim(), words: [] }]
    }));
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleError = (err: any) => {
    console.error(err);
    setError(err.message || "אירעה שגיאה בתקשורת עם ה-AI. אנא בדקו את מפתח ה-API.");
  };

  const handleSuggestNetwork = async () => {
    setLoading(true); setError(null);
    try {
      if (state.mode === 'text') {
        if (!state.sourceText) return alert('נא להזין טקסט');
        const res = await suggestSemanticNetworkFromText(state.sourceText, state.gradeLevel, state.withNikud);
        setState(prev => ({ ...prev, topic: res.topic, categories: res.categories, text: state.sourceText }));
      } else {
        if (!state.topic) return alert('נא להזין נושא');
        const suggested = await suggestSemanticNetwork(state.topic, state.gradeLevel, state.withNikud);
        setState(prev => ({ ...prev, categories: suggested }));
      }
    } catch (err) { handleError(err); } finally { setLoading(false); }
  };

  const handleGenerateExercises = async () => {
    setExerciseLoading(true);
    try {
      setFillBlanks(await generateFillInTheBlanks(state.categories, state.topic, state.withNikud, state.text));
    } catch (err) { handleError(err); } finally { setExerciseLoading(false); }
  };

  const handleGenerateDefinitions = async () => {
    if (selectedWordsForDefs.length === 0) return alert('נא לבחור מילים מהמחסן קודם');
    setExerciseLoading(true);
    try {
      const defs = await generateDefinitions(selectedWordsForDefs, state.topic, state.gradeLevel, state.withNikud, state.text);
      setState(prev => ({ ...prev, definitionMatches: defs }));
    } catch (err) { handleError(err); } finally { setExerciseLoading(false); }
  };

  const handleGenerateOddOneOutSets = async () => {
    if (state.categories.length < 2) return alert('דרושות לפחות 2 קטגוריות ליצירת התרגיל');
    setExerciseLoading(true);
    try {
      const sets = await generateLogicalOddOneOut(state.categories, state.topic, state.withNikud);
      setState(prev => ({ ...prev, oddOneOutSets: sets }));
    } catch (err) { handleError(err); } finally { setExerciseLoading(false); }
  };

  const handleGenerateDualWords = async () => {
    setExerciseLoading(true);
    try {
      const pairs = await generateDualWordSets(allWords, state.topic, state.gradeLevel, state.withNikud, state.text);
      setState(prev => ({ ...prev, dualWordSets: pairs }));
    } catch (err) { handleError(err); } finally { setExerciseLoading(false); }
  };

  const handleGenerateImage = async (word: string) => {
    if (imageLoadingWord) return;
    setImageLoadingWord(word);
    setError(null);
    try {
      const url = await generateImageForWord(word, state.topic);
      if (url) {
        setState(prev => ({
          ...prev,
          wordImages: [...(prev.wordImages || []), { word, url }]
        }));
      }
    } catch (err) {
      handleError(err);
    } finally {
      setImageLoadingWord(null);
    }
  };

  const toggleWordSelection = (word: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(word)) {
      setter(list.filter(w => w !== word));
    } else {
      setter([...list, word]);
    }
  };

  const renderNikudControl = (type: any) => (
    <button onClick={() => handleQuickNikud(type)} disabled={nikudLoading} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100 transition-all hover:bg-blue-100">
      {nikudLoading ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
      נקד הכל
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <input type="file" ref={fileInputRef} onChange={handleImportProject} accept=".json" className="hidden" />
      
      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 p-4 rounded-xl flex items-center justify-between text-red-700 no-print animate-fadeIn">
          <div className="flex items-center gap-3"><AlertCircle size={24} /> <p className="font-bold">{error}</p></div>
          <button onClick={handleOpenSelectKey} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700"><Key size={18}/> תקן מפתח</button>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-sm w-full text-center shadow-2xl">
            <RotateCcw className="mx-auto text-red-600 mb-4" size={48} />
            <h3 className="text-xl font-bold mb-2">איפוס נתונים?</h3>
            <p className="text-slate-500 mb-6">כל מה שיצרת יימחק לצמיתות מהזיכרון המקומי.</p>
            <div className="flex gap-3">
              <button onClick={() => { localStorage.removeItem('ilanit_lesson_builder_v4'); window.location.reload(); }} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all">אישור</button>
              <button onClick={() => setIsResetModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">ביטול</button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 no-print border-b pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg"><Brain className="text-white" /></div>
            <h1 className="text-3xl font-black text-slate-800">בונה מהלכי הוראה</h1>
          </div>
          <p className="text-slate-500 font-medium">הכלי של אילנית שוורץ לחינוך לשוני</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-all"><FileUp size={16}/>טען פרויקט</button>
            <button onClick={handleExportProject} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-all"><Save size={16}/>שמור פרויקט</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-w-[280px]">
          <div className="text-xl font-black flex items-center gap-2 justify-center mb-1">
            <span className="text-blue-600">קריאה</span><span className="text-slate-700">להבנה</span>
          </div>
          <div className="text-center text-emerald-600 font-bold text-sm mb-2">אילנית שוורץ</div>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mb-3 font-bold"><Phone size={12}/> 052-3677123</div>
          <div className="flex gap-2">
            <button onClick={() => setShowTutorial(!showTutorial)} className={`flex-1 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-all ${showTutorial ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-inner' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-amber-50 hover:text-amber-600'}`}>
              <LifeBuoy size={14}/> {showTutorial ? 'ביטול הדרכה' : 'מצב הדרכה'}
            </button>
            <button onClick={() => setIsResetModalOpen(true)} className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-lg text-xs font-bold border border-slate-100 hover:text-red-500 hover:bg-red-50 transition-colors">איפוס</button>
          </div>
        </div>
      </header>

      <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

      <main className="min-h-[500px]">
        {currentStep === 1 && (
          <div className="animate-fadeIn space-y-6">
            <div className="bg-white p-8 rounded-2xl border shadow-sm relative">
              <h2 className="text-xl font-bold mb-6">הגדרת השיעור</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative">
                <Hint text="בחרו אם ליצור שיעור סביב נושא כללי (כמו 'חגים') או לנתח טקסט קיים שהכנתם." active={showTutorial} />
                <button onClick={() => setState(p => ({...p, mode: 'topic'}))} className={`p-6 rounded-2xl border-2 transition-all text-center ${state.mode === 'topic' ? 'bg-blue-50 border-blue-600 shadow-sm' : 'border-slate-100 hover:border-blue-200'}`}>
                  <Sparkles size={32} className={`mx-auto mb-2 ${state.mode === 'topic' ? 'text-blue-600' : 'text-slate-300'}`} />
                  <div className="font-bold">לפי נושא</div>
                </button>
                <button onClick={() => setState(p => ({...p, mode: 'text'}))} className={`p-6 rounded-2xl border-2 transition-all text-center ${state.mode === 'text' ? 'bg-emerald-50 border-emerald-600 shadow-sm' : 'border-slate-100 hover:border-emerald-200'}`}>
                  <Upload size={32} className={`mx-auto mb-2 ${state.mode === 'text' ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <div className="font-bold">לפי טקסט קיים</div>
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100 relative">
                  <Hint text="סימון תיבה זו ינחה את ה-AI להוסיף ניקוד מלא לכל הטקסטים והמילים שייוצרו." active={showTutorial} />
                  <input type="checkbox" id="nikud" checked={state.withNikud} onChange={(e) => setState(p => ({...p, withNikud: e.target.checked}))} className="w-5 h-5 rounded text-blue-600 cursor-pointer" />
                  <label htmlFor="nikud" className="font-bold text-blue-800 cursor-pointer">שימוש בניקוד (AI)</label>
                </div>
                <div className="relative">
                  <Hint text="הזינו כאן את נושא השיעור או הדביקו את הטקסט שלכם." active={showTutorial} />
                  {state.mode === 'topic' ? (
                    <input type="text" value={state.topic} onChange={(e) => setState(p => ({...p, topic: e.target.value}))} className="w-full p-4 rounded-xl border-2 outline-none focus:border-blue-500 transition-all" placeholder="לדוגמה: עונות השנה, חברות, כדור הארץ..." />
                  ) : (
                    <textarea value={state.sourceText} onChange={(e) => setState(p => ({...p, sourceText: e.target.value}))} className="w-full h-48 p-4 rounded-xl border-2 outline-none focus:border-emerald-500 transition-all" placeholder="הדביקו כאן את הטקסט שלכם..." />
                  )}
                </div>
                <div className="relative">
                  <Hint text="בחירת שכבת הגיל עוזרת ל-AI להתאים את רמת המילים והתחביר." active={showTutorial} />
                  <select value={state.gradeLevel} onChange={(e) => setState(p => ({...p, gradeLevel: e.target.value}))} className="w-full p-4 rounded-xl border-2 cursor-pointer outline-none focus:border-blue-500">
                    <option value="">בחר שכבת גיל</option>
                    <option value="גן">גן</option><option value="א-ב">א' - ב'</option><option value="ג-ד">ג' - ד'</option><option value="ה-ו">ה' - ו'</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="animate-fadeIn space-y-6">
            <div className={`flex justify-between items-center p-6 rounded-2xl text-white shadow-lg relative ${state.mode === 'text' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              <h2 className="text-2xl font-bold">🎯 {state.topic || 'רשת המילים'}</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Hint text="לחיצה כאן תפעיל את ה-AI שינתח את הנושא ויציע קטגוריות ומילים מתאימות." active={showTutorial} />
                  <button onClick={handleSuggestNetwork} disabled={loading} className="bg-white/20 px-6 py-2 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} הצע רשת (AI)
                  </button>
                </div>
                {renderNikudControl('words')}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(state.categories || []).map(cat => (
                <div key={cat.id} className="bg-white p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-blue-800">📂 {cat.name}</h3>
                    <button onClick={() => setState(p => ({...p, categories: p.categories.filter(c => c.id !== cat.id)}))}><Trash2 size={16} className="text-slate-300 hover:text-red-500 transition-colors" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(cat.words || []).map(word => (
                      <span key={word} className="bg-slate-50 px-3 py-1 rounded-full border text-sm flex items-center gap-1 group">
                        {word}
                        <button onClick={() => setState(p => ({...p, categories: p.categories.map(c => c.id === cat.id ? {...c, words: c.words.filter(w => w !== word)} : c)}))} className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">×</button>
                      </span>
                    ))}
                  </div>
                  <input type="text" placeholder="הוסף מילה..." className="w-full p-2 bg-slate-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100" onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const word = e.currentTarget.value.trim();
                      if (word) setState(p => ({...p, categories: p.categories.map(c => c.id === cat.id ? {...c, words: [...new Set([...c.words, word])]} : c)}));
                      e.currentTarget.value = '';
                    }
                  }} />
                </div>
              ))}
              <div className="relative">
                <Hint text="ניתן להוסיף קטגוריות באופן ידני ולהשלים את המילים שחסרות לכם." active={showTutorial} />
                {isAddingCategory ? (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/30 flex flex-col gap-3 animate-fadeIn">
                    <input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} className="p-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-400" placeholder="שם הקטגוריה..." />
                    <div className="flex gap-2"><button onClick={handleAddCategory} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-all">הוסף</button><button onClick={() => setIsAddingCategory(false)} className="px-3 border rounded-lg text-slate-400 hover:bg-white hover:text-red-500 transition-all">×</button></div>
                  </div>
                ) : (
                  <button onClick={() => setIsAddingCategory(true)} className="w-full border-2 border-dashed rounded-2xl p-8 text-slate-400 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-300 transition-all flex flex-col items-center gap-2 group"><Plus size={32} className="group-hover:scale-110 transition-transform" /><span className="font-bold">קטגוריה חדשה</span></button>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[450px] bg-white rounded-3xl border p-12 shadow-sm relative">
            <div className="w-full flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">כרטיסי הברקה</h2>
              <div className="relative">
                <Hint text="ייצוא המצגת לקובץ HTML יאפשר לכם להפעיל אותה בכל כיתה, גם ללא אינטרנט." active={showTutorial} />
                <button onClick={handleDownloadFlashcards} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm border border-blue-100 hover:bg-blue-100 transition-all">
                  <Download size={18} /> הורד כרטיסים למחשב
                </button>
              </div>
            </div>
            <div className="relative w-full max-w-lg">
              <Hint text="המילים מופיעות כאן בגדול לתרגיל הברקה. השתמשו בכפתורי הנגינה להחלפה אוטומטית." active={showTutorial} />
              {allWords.length > 0 ? (
                <div className="w-full aspect-video bg-blue-600 text-white rounded-[40px] shadow-2xl flex items-center justify-center p-12 text-center text-5xl md:text-7xl font-black mb-8 transition-all hover:scale-[1.02]">
                  {allWords[flashcardIndex]}
                </div>
              ) : <p className="text-slate-400 italic">יש להוסיף מילים ברשת המילים (שלב 2) קודם.</p>}
            </div>
            <div className="flex items-center gap-6">
              <button onClick={() => setFlashcardIndex(p => (p - 1 + allWords.length) % allWords.length)} className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 transition-all shadow-sm"><Rewind/></button>
              <button onClick={() => setIsFlashcardPlaying(!isFlashcardPlaying)} className={`p-6 rounded-full text-white shadow-xl transition-all transform hover:scale-110 ${isFlashcardPlaying ? 'bg-orange-500' : 'bg-blue-600'}`}>{isFlashcardPlaying ? <Pause size={32}/> : <Play size={32} fill="white"/>}</button>
              <button onClick={() => setFlashcardIndex(p => (p + 1) % allWords.length)} className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 transition-all shadow-sm"><FastForward/></button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="animate-fadeIn space-y-6">
            <div className="bg-white p-8 rounded-2xl border shadow-sm relative">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">הטקסט הלימודי</h2>
                <div className="flex gap-3">
                  <button onClick={() => setState(prev => ({...prev, text: ''}))} className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-red-50 hover:text-red-500" title="נקה טקסט"><Trash2 size={16}/></button>
                  {renderNikudControl('text')}
                  <div className="relative">
                    <Hint text="ה-AI יכתוב טקסט שלם שמשלב בתוכו את המילים שבחרתם מהרשת." active={showTutorial} />
                    <button 
                      onClick={async () => { 
                        setLoading(true); 
                        try { 
                          const generatedText = await generateEducationalText(state.topic, state.gradeLevel, allWords, state.withNikud);
                          setState(p => ({...p, text: generatedText})); 
                        } catch(err){
                          handleError(err);
                        } finally {
                          setLoading(false);
                        } 
                      }} 
                      disabled={loading} 
                      className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} צור טקסט (AI)
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Hint text="ניתן לערוך את הטקסט באופן חופשי. המילים המודגשות (**) יופיעו בטקסט הלימודי הסופי." active={showTutorial} />
                <textarea value={state.text} onChange={e => setState(p => ({...p, text: e.target.value}))} className="w-full h-80 p-6 rounded-2xl border-2 outline-none text-lg leading-relaxed resize-none focus:border-blue-400 transition-all" placeholder="כתבו כאן את הטקסט או הפיקו אותו בעזרת ה-AI..." />
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="animate-fadeIn space-y-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm min-h-[500px] relative">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold">מחולל התרגילים</h2>
                {renderNikudControl('exercises')}
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 relative">
                <Hint text="עברו בין הטאבים כדי ליצור סוגים שונים של תרגילים: השלמות, הגדרות, תמונות ועוד." active={showTutorial} />
                <button onClick={() => setActiveExTab('fill')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${activeExTab === 'fill' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><ListTree size={18} className="inline ml-2" />השלמת משפטים</button>
                <button onClick={() => setActiveExTab('def')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${activeExTab === 'def' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><BookOpen size={18} className="inline ml-2" />הגדרות</button>
                <button onClick={() => setActiveExTab('abc')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${activeExTab === 'abc' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><SortAsc size={18} className="inline ml-2" />סדר א"ב</button>
                <button onClick={() => setActiveExTab('images')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${activeExTab === 'images' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><ImageIcon size={18} className="inline ml-2" />תמונות AI</button>
                <button onClick={() => setActiveExTab('odd')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${activeExTab === 'odd' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><HelpCircle size={18} className="inline ml-2" />יוצא דופן</button>
                <button onClick={() => setActiveExTab('dual')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${activeExTab === 'dual' ? 'bg-pink-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}><Edit3 size={18} className="inline ml-2" />זוגות מילים</button>
              </div>

              {activeExTab === 'fill' && (
                <div className="animate-fadeIn space-y-4">
                  <div className="flex justify-between items-center"><h3 className="font-bold">השלמת משפטים (מבוסס טקסט)</h3><button onClick={handleGenerateExercises} disabled={exerciseLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md">{exerciseLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16}/>} הפק משפטים</button></div>
                  <div className="space-y-2">{fillBlanks.map((s, i) => <div key={i} className="p-3 bg-slate-50 rounded-xl border animate-fadeIn">{i+1}. {s}</div>)}</div>
                </div>
              )}

              {activeExTab === 'def' && (
                <div className="animate-fadeIn space-y-4">
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-6">
                    <h3 className="font-bold text-indigo-900 mb-4">שלב 1: בחרו מילים להגדרה מתוך מחסן המילים:</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {allWords.map(w => (
                        <button key={w} onClick={() => toggleWordSelection(w, selectedWordsForDefs, setSelectedWordsForDefs)} className={`px-3 py-1.5 rounded-xl border text-sm font-bold transition-all ${selectedWordsForDefs.includes(w) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:border-indigo-300'}`}>
                          {w}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleGenerateDefinitions} disabled={exerciseLoading || selectedWordsForDefs.length === 0} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50">
                      {exerciseLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} שלב 2: הפק הגדרות (AI)
                    </button>
                  </div>
                  <div className="space-y-2">{(state.definitionMatches || []).map((d, i) => <div key={i} className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm animate-fadeIn"><strong>{d.word}:</strong> {d.definition}</div>)}</div>
                </div>
              )}

              {activeExTab === 'abc' && (
                <div className="animate-fadeIn space-y-4">
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-6">
                    <h3 className="font-bold text-emerald-900 mb-4">בחרו מילים לסידור לפי סדר הא"ב:</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {allWords.map(w => (
                        <button key={w} onClick={() => toggleWordSelection(w, selectedWordsForABC, setSelectedWordsForABC)} className={`px-3 py-1.5 rounded-xl border text-sm font-bold transition-all ${selectedWordsForABC.includes(w) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:border-emerald-300'}`}>
                          {w}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { 
                      if (selectedWordsForABC.length === 0) return alert('נא לבחור מילים קודם');
                      setState(p => ({ ...p, alphabeticalWords: [...selectedWordsForABC] }));
                    }} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md">
                      הוסף לתרגיל סידור א"ב
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
                    {(state.alphabeticalWords || []).map((w, i) => <span key={i} className="bg-emerald-50 px-4 py-1 rounded-full border border-emerald-200 font-bold text-emerald-800 animate-fadeIn">{w}</span>)}
                  </div>
                </div>
              )}

              {activeExTab === 'images' && (
                <div className="animate-fadeIn space-y-6">
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 relative">
                    <Hint text="ה-AI יצור איור ייחודי לכל מילה שתבחרו. מושלם לשיעורי אוצר מילים לתלמידים צעירים." active={showTutorial} />
                    <p className="text-purple-800 font-medium text-sm">בחרו מילים מהרשת ליצירת איורים מותאמים. שימו לב: יצירת תמונה עשויה לקחת מספר שניות.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allWords.map(w => {
                      const hasImg = state.wordImages.some(img => img.word === w);
                      const isL = imageLoadingWord === w;
                      return (
                        <button key={w} onClick={() => handleGenerateImage(w)} disabled={hasImg || !!imageLoadingWord} className={`px-3 py-1.5 rounded-xl border text-sm font-bold transition-all flex items-center gap-1 ${hasImg ? 'bg-purple-100 text-purple-700 border-purple-200 cursor-default' : isL ? 'bg-purple-50 border-purple-400' : 'bg-white hover:border-purple-300'}`}>
                          {w} {isL ? <Loader2 className="animate-spin" size={14} /> : hasImg ? <CheckCircle2 size={14}/> : <Plus size={14}/>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {state.wordImages.map((img, i) => (
                      <div key={i} className="bg-white p-2 rounded-xl border group relative shadow-sm animate-fadeIn">
                        <img src={img.url} className="w-full aspect-square object-contain rounded-lg mb-1" alt={img.word} />
                        <div className="text-[10px] font-bold text-center text-slate-500">{img.word}</div>
                        <button onClick={() => setState(p => ({...p, wordImages: p.wordImages.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeExTab === 'odd' && (
                <div className="animate-fadeIn space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold">תרגיל יוצא דופן (לוגיקה חכמה)</h3>
                    <div className="relative">
                      <Hint text="כאן ה-AI מוצא קבוצות של מילים עם מכנה משותף דק ומילה אחת שאינה שייכת." active={showTutorial} />
                      <button onClick={handleGenerateOddOneOutSets} disabled={exerciseLoading} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-all shadow-md flex items-center gap-2">{exerciseLoading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} צור תרגילים לוגיים (AI)</button>
                    </div>
                  </div>
                  <div className="space-y-3">{state.oddOneOutSets.map((s, i) => (
                    <div key={i} className="p-4 bg-white rounded-xl border border-orange-100 shadow-sm animate-fadeIn">
                      <div className="font-bold text-lg mb-2">{i+1}. {s.options.join(' | ')}</div>
                      <div className="text-xs text-orange-600 italic">הסבר ה-AI: {s.reason}</div>
                    </div>
                  ))}</div>
                </div>
              )}

              {activeExTab === 'dual' && (
                <div className="animate-fadeIn space-y-4">
                  <div className="flex justify-between items-center"><h3 className="font-bold">חיבור משפט הכולל זוג מילים</h3><button onClick={handleGenerateDualWords} disabled={exerciseLoading} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-pink-700 transition-all shadow-md">{exerciseLoading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} הפק זוגות</button></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{(state.dualWordSets || []).map((p, i) => <div key={i} className="p-3 bg-white rounded-xl border border-pink-100 font-bold text-center text-pink-900 shadow-sm animate-fadeIn">{p.wordA} + {p.wordB}</div>)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="animate-fadeIn space-y-6 pb-12">
            <div className="bg-white p-8 rounded-2xl border shadow-sm no-print relative">
              <Hint text="סיימנו! הורידו את דף העבודה המעוצב ל-Word, הדפיסו אותו, או שמרו את הפרויקט להמשך עבודה." active={showTutorial} />
              <h2 className="text-2xl font-bold mb-6">סיכום המהלך והורדה</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <button onClick={handlePrintWorksheet} className="bg-blue-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg"><Printer size={20}/> הדפסה / PDF</button>
                <button onClick={handleDownloadDoc} className="bg-emerald-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg"><FileType size={20}/> ייצוא לוורד (Doc)</button>
                <button onClick={handleDownloadFlashcards} className="bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg"><Monitor size={20}/> ייצוא כרטיסי הברקה (HTML)</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => { const html = generatePrintHTML('html'); const blob = new Blob([html], {type: 'text/html'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `שיעור_${state.topic || 'חדש'}.html`; a.click(); }} className="bg-slate-700 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-md text-sm"><FileCode size={18}/> ייצוא דף עבודה כ-HTML</button>
                <button onClick={handleExportProject} className="bg-slate-200 text-slate-700 p-3 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-300 transition-all shadow-md text-sm"><Save size={18}/> שמור קובץ פרויקט (.json)</button>
              </div>
            </div>
            <div className="bg-white p-12 rounded-[30px] border-2 shadow-sm text-center opacity-40 select-none grayscale cursor-not-allowed">
              <h1 className="text-3xl font-black mb-4">תצוגה מקדימה של דף העבודה</h1>
              <div className="h-64 flex flex-col items-center justify-center italic text-slate-400 gap-4">
                <FileText size={64} className="opacity-20" />
                <p>הדף המלא והמעוצב ייווצר בעת הלחיצה על כפתורי ההורדה למעלה.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 flex justify-between items-center border-t pt-8 no-print pb-20">
        <button onClick={() => setCurrentStep(p => Math.max(1, p - 1) as Step)} disabled={currentStep === 1} className={`px-6 py-2 rounded-xl font-bold transition-all ${currentStep === 1 ? 'opacity-0' : 'text-slate-600 hover:bg-slate-100 active:scale-95'}`}><ChevronRight size={20} className="inline ml-1" /> שלב קודם</button>
        <button onClick={() => setCurrentStep(p => Math.min(6, p + 1) as Step)} disabled={currentStep === 6 || (currentStep === 1 && !state.topic && !state.sourceText)} className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${currentStep === 6 || (currentStep === 1 && !state.topic && !state.sourceText) ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{currentStep === 5 ? 'סיום וייצוא' : 'המשך לשלב הבא'} <ChevronLeft size={20} className="inline mr-1" /></button>
      </footer>
    </div>
  );
};

export default App;
