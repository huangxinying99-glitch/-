import { useMemo, useRef, useState } from 'react';
import { Brush, CheckCircle2, Copy, Eraser, FileDown, FileUp, Home, RotateCcw, Save, Trash2, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LEVELS } from '../constants';

const STORAGE_KEY = 'xiaoxixi-level-editor-map';
const LAST_LEVEL_KEY = 'xiaoxixi-level-editor-last-index';
const OVERRIDE_STORAGE_KEY = 'xiaoxixi-level-overrides';
const PREVIEW_LEVEL_STORAGE_KEY = 'xiaoxixi-preview-level';
const DEFAULT_ROWS = 14;
const DEFAULT_COLS = 72;

type Tool = {
  char: string;
  name: string;
  hint: string;
  color: string;
  textColor?: string;
};

const TOOLS: Tool[] = [
  { char: ' ', name: '橡皮擦', hint: '清空格子', color: '#f8fafc', textColor: '#64748b' },
  { char: '#', name: '地面', hint: '普通地块/平台', color: '#8b5a2b' },
  { char: 'Z', name: '左斜坡', hint: 'slope_left', color: '#a16207' },
  { char: 'X', name: '右斜坡', hint: 'slope_right', color: '#ca8a04' },
  { char: 'P', name: '小西红柿', hint: '玩家出生点', color: '#ef4444' },
  { char: 'G', name: '瓜子终点', hint: '通关 seed', color: '#22c55e' },
  { char: '*', name: '星星', hint: '收集星星', color: '#facc15', textColor: '#713f12' },
  { char: 'S', name: '小花', hint: '碰到出金币', color: '#fb7185' },
  { char: 'N', name: '蜗牛', hint: '第一关怪', color: '#7c3aed' },
  { char: 'R', name: '兔子', hint: '第三关怪', color: '#f97316' },
  { char: 'Y', name: '怪物一', hint: 'monster1', color: '#06b6d4' },
  { char: 'K', name: '青蛙', hint: 'frog', color: '#16a34a' },
  { char: 'A', name: '猫头鹰', hint: 'eagle', color: '#475569' },
  { char: 'Q', name: '豌豆荚', hint: 'pea 发射器', color: '#65a30d' },
  { char: 'M', name: '蘑菇', hint: 'real-mushroom', color: '#dc2626' },
  { char: 'F', name: 'pira', hint: '食人花/水中怪', color: '#60a5fa', textColor: '#082f49' },
  { char: 'W', name: '水', hint: 'water/hazard', color: '#0ea5e9' },
  { char: 'L', name: '沼泽', hint: 'mud', color: '#854d0e' },
  { char: 'T', name: '荆棘', hint: 'thorns', color: '#334155' },
  { char: 'U', name: '管道', hint: '进入地下', color: '#22c55e' },
  { char: 'C', name: '炮台左', hint: 'cannon left', color: '#64748b' },
  { char: 'B', name: '炮台右', hint: 'cannon right', color: '#94a3b8', textColor: '#0f172a' },
  { char: 'V', name: '藤蔓', hint: 'vine', color: '#15803d' },
  { char: 'I', name: '柱子', hint: 'crushing pillar', color: '#78716c' },
];

function makeBlankMap(rows = DEFAULT_ROWS, cols = DEFAULT_COLS) {
  return Array.from({ length: rows }, (_, row) => {
    if (row === rows - 1) return '#'.repeat(cols);
    if (row === rows - 3) return 'P' + ' '.repeat(cols - 8) + 'G' + ' '.repeat(6);
    return ' '.repeat(cols);
  });
}

function normalizeRows(rows: string[], cols = DEFAULT_COLS) {
  const fixed = rows.slice(0, DEFAULT_ROWS).map(row => row.padEnd(cols, ' ').slice(0, cols));
  while (fixed.length < DEFAULT_ROWS) fixed.push(' '.repeat(cols));
  return fixed;
}

function parseImportedLevel(raw: string) {
  const matches = [...raw.matchAll(/'([^']*)'/g)].map(match => match[1]);
  if (matches.length > 0) return normalizeRows(matches, Math.max(DEFAULT_COLS, ...matches.map(row => row.length)));
  const plainRows = raw.split(/\r?\n/).map(row => row.replace(/^\s+|\s+$/g, '')).filter(Boolean);
  return normalizeRows(plainRows, Math.max(DEFAULT_COLS, ...plainRows.map(row => row.length), DEFAULT_COLS));
}

function setTile(rows: string[], row: number, col: number, char: string) {
  return rows.map((line, r) => {
    if (r !== row) return line;
    return line.slice(0, col) + char + line.slice(col + 1);
  });
}

function getSavedLevelIndex() {
  const saved = Number(window.localStorage.getItem(LAST_LEVEL_KEY));
  return Number.isInteger(saved) && saved >= 0 && saved < LEVELS.length ? saved : 9;
}

function readAppliedLevel(index: number): string[] | null {
  try {
    const raw = window.localStorage.getItem(OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const overrides = JSON.parse(raw) as Record<string, string[]>;
    const rows = overrides[String(index)];
    return Array.isArray(rows) && rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

function rowsForLevel(index: number) {
  const rows = readAppliedLevel(index) || LEVELS[index] || makeBlankMap();
  return normalizeRows(rows, Math.max(DEFAULT_COLS, ...rows.map(row => row.length)));
}

function makeExport(rows: string[]) {
  return '[\n' + rows.map(row => `  '${row}',`).join('\n') + '\n]';
}

export default function LevelEditor() {
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(() => getSavedLevelIndex());
  const [levelRows, setLevelRows] = useState<string[]>(() => rowsForLevel(getSavedLevelIndex()));
  const [history, setHistory] = useState<string[][]>([]);
  const paintSnapshotRef = useRef<string[] | null>(null);
  const [selectedChar, setSelectedChar] = useState('#');
  const [isPainting, setIsPainting] = useState(false);
  const [message, setMessage] = useState('');
  const [importText, setImportText] = useState('');

  const cols = useMemo(() => Math.max(DEFAULT_COLS, ...levelRows.map(row => row.length)), [levelRows]);
  const selectedTool = TOOLS.find(tool => tool.char === selectedChar) || TOOLS[1];
  const currentLevelNumber = selectedLevelIndex + 1;
  const exported = useMemo(() => makeExport(levelRows), [levelRows]);

  const pushHistory = (snapshot: string[]) => setHistory(prev => [...prev, snapshot]);

  const undo = () => {
    setHistory(prev => {
      if (prev.length === 0) {
        setMessage('已经没有可以回撤的步骤了');
        return prev;
      }
      const previous = prev[prev.length - 1];
      setLevelRows(previous);
      setMessage('已回撤一步');
      return prev.slice(0, -1);
    });
  };

  const beginPaint = (row: number, col: number) => {
    paintSnapshotRef.current = levelRows;
    setIsPainting(true);
    setLevelRows(prev => setTile(prev, row, col, selectedChar));
  };

  const endPaint = () => {
    if (paintSnapshotRef.current) {
      pushHistory(paintSnapshotRef.current);
      paintSnapshotRef.current = null;
    }
    setIsPainting(false);
  };

  const paintTile = (row: number, col: number) => {
    setLevelRows(prev => setTile(prev, row, col, selectedChar));
  };

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(levelRows));
    setMessage('已保存到这个浏览器');
  };

  const applyToLocalGame = async () => {
    const raw = window.localStorage.getItem(OVERRIDE_STORAGE_KEY);
    const overrides = raw ? JSON.parse(raw) : {};
    overrides[String(selectedLevelIndex)] = levelRows;
    window.localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(levelRows));
    window.localStorage.setItem(LAST_LEVEL_KEY, String(selectedLevelIndex));
    window.localStorage.setItem(PREVIEW_LEVEL_STORAGE_KEY, String(selectedLevelIndex));

    try {
      const response = await fetch('/api/save-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelIndex: selectedLevelIndex, rows: levelRows }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'save failed');
      setMessage(`已应用到第 ${currentLevelNumber} 关并写入本地源码，正在打开预览...`);
    } catch (error) {
      console.error(error);
      setMessage(`已应用到浏览器预览，但写入源码失败：${String(error)}`);
    }

    window.location.href = `/?previewLevel=${selectedLevelIndex}&t=${Date.now()}`;
  };

  const copy = async () => {
    await navigator.clipboard.writeText(exported);
    setMessage('关卡代码已复制');
  };

  const selectLevel = (index: number) => {
    const nextIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    const rows = rowsForLevel(nextIndex);
    pushHistory(levelRows);
    setSelectedLevelIndex(nextIndex);
    window.localStorage.setItem(LAST_LEVEL_KEY, String(nextIndex));
    setLevelRows(rows);
    setMessage(`正在编辑第 ${nextIndex + 1} 关`);
  };

  const applyImport = () => {
    if (!importText.trim()) return;
    pushHistory(levelRows);
    setLevelRows(parseImportedLevel(importText));
    setMessage('已导入关卡代码到画布');
  };

  const clear = () => {
    pushHistory(levelRows);
    setLevelRows(makeBlankMap(DEFAULT_ROWS, cols));
    setMessage('已清空并保留出生点、终点和底部地面');
  };

  return (
    <div className="min-h-screen w-screen overflow-hidden bg-[#17202a] text-white" onMouseUp={endPaint} onMouseLeave={endPaint}>
      <div className="flex h-screen">
        <aside className="w-[300px] shrink-0 border-r border-white/10 bg-[#111827] p-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold">关卡编辑器</h1>
              <p key={`side-level-${selectedLevelIndex}`} className="text-xs text-white/60 mt-1">正在编辑第 {selectedLevelIndex + 1} 关</p>
            </div>
            <Link to="/" className="h-10 w-10 grid place-items-center rounded-md bg-white/10 hover:bg-white/20" title="返回游戏首页">
              <Home size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {TOOLS.map(tool => (
              <button
                key={tool.name}
                onClick={() => setSelectedChar(tool.char)}
                className={`min-h-[62px] rounded-md border px-2 text-left transition ${selectedChar === tool.char ? 'border-yellow-300 ring-2 ring-yellow-300/60' : 'border-white/10 hover:border-white/40'}`}
                style={{ background: tool.color, color: tool.textColor || '#fff' }}
                title={tool.hint}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{tool.name}</span>
                  <span className="font-mono text-lg">{tool.char === ' ' ? '空' : tool.char}</span>
                </div>
                <div className="mt-1 text-[11px] opacity-80">{tool.hint}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <button onClick={undo} disabled={history.length === 0} className="w-full h-11 rounded-md bg-violet-500 hover:bg-violet-600 disabled:bg-white/10 disabled:text-white/35 font-bold flex items-center justify-center gap-2"><Undo2 size={18} />回撤 {history.length > 0 ? `(${history.length})` : ''}</button>
            <button key={`apply-${selectedLevelIndex}`} onClick={applyToLocalGame} className="w-full h-12 rounded-md bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold flex items-center justify-center gap-2"><CheckCircle2 size={19} />应用到第 {selectedLevelIndex + 1} 关并预览</button>
            <button onClick={save} className="w-full h-11 rounded-md bg-emerald-500 hover:bg-emerald-600 font-bold flex items-center justify-center gap-2"><Save size={18} />保存草稿</button>
            <button onClick={copy} className="w-full h-11 rounded-md bg-sky-500 hover:bg-sky-600 font-bold flex items-center justify-center gap-2"><Copy size={18} />复制关卡代码</button>
            <button onClick={clear} className="w-full h-11 rounded-md bg-rose-500 hover:bg-rose-600 font-bold flex items-center justify-center gap-2"><Trash2 size={18} />清空重画</button>
          </div>

          {message && <div className="mt-3 rounded-md bg-white/10 px-3 py-2 text-sm text-yellow-100">{message}</div>}

          <div className="mt-5">
            <div className="text-sm font-bold mb-2">选择要编辑的关卡</div>
            <div className="grid grid-cols-5 gap-2">
              {LEVELS.map((_, idx) => (
                <button key={idx} onClick={() => selectLevel(idx)} className={`h-9 rounded-md font-bold ${selectedLevelIndex === idx ? 'bg-yellow-400 text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}>{idx + 1}</button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-bold mb-2 flex items-center gap-2"><FileUp size={16} />导入关卡代码</div>
            <textarea
              value={importText}
              onChange={event => setImportText(event.target.value)}
              className="h-24 w-full resize-none rounded-md bg-black/30 border border-white/10 p-2 text-xs font-mono outline-none focus:border-sky-400"
              placeholder="把关卡数组粘贴到这里"
            />
            <button onClick={applyImport} className="mt-2 w-full h-10 rounded-md bg-white/10 hover:bg-white/20 font-bold">导入到画布</button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#1f2937] px-4">
            <div className="flex items-center gap-3 text-sm">
              <span key={`top-level-${selectedLevelIndex}`} className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-3 py-2 font-bold text-slate-950">第 {selectedLevelIndex + 1} 关</span>
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2"><Brush size={16} />当前：{selectedTool.name}</span>
              <span className="text-white/60">按住鼠标拖动可以连续摆放</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={undo} disabled={history.length === 0} className="h-9 rounded-md bg-violet-500 px-3 hover:bg-violet-600 disabled:bg-white/10 disabled:text-white/35 flex items-center gap-2"><Undo2 size={16} />回撤</button>
              <button onClick={() => setSelectedChar(' ')} className="h-9 rounded-md bg-white/10 px-3 hover:bg-white/20 flex items-center gap-2"><Eraser size={16} />橡皮擦</button>
              <button onClick={() => setLevelRows(prev => prev.map(row => row))} className="h-9 rounded-md bg-white/10 px-3 hover:bg-white/20 flex items-center gap-2"><RotateCcw size={16} />刷新画布</button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-[#203040] p-4">
            <div className="grid w-max rounded-md border border-white/20 bg-[#83c5f7] p-2 shadow-2xl" style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }}>
              {levelRows.map((row, rowIndex) => row.padEnd(cols, ' ').split('').map((char, colIndex) => {
                const tool = TOOLS.find(item => item.char === char);
                const isEmpty = char === ' ';
                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onMouseDown={() => beginPaint(rowIndex, colIndex)}
                    onMouseEnter={() => { if (isPainting) paintTile(rowIndex, colIndex); }}
                    className="h-7 w-7 border border-black/10 text-[11px] font-bold leading-none hover:ring-2 hover:ring-yellow-300"
                    style={{ background: tool?.color || '#e5e7eb', color: tool?.textColor || '#fff' }}
                    title={`第 ${rowIndex + 1} 行，第 ${colIndex + 1} 列：${tool?.name || '未知'} ${char}`}
                  >
                    {isEmpty ? '' : char}
                  </button>
                );
              }))}
            </div>
          </div>

          <div className="h-[170px] shrink-0 border-t border-white/10 bg-[#111827] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold flex items-center gap-2"><FileDown size={16} />导出的关卡代码</div>
              <button onClick={copy} className="h-8 rounded-md bg-sky-500 px-3 text-sm font-bold hover:bg-sky-600">复制</button>
            </div>
            <textarea readOnly value={exported} className="h-[115px] w-full resize-none rounded-md bg-black/40 border border-white/10 p-2 text-xs font-mono text-lime-100" />
          </div>
        </main>
      </div>
    </div>
  );
}

