import React, { useState, useCallback, useEffect, useRef, Component } from 'react';

// ============================================
// DM HUD v2.0 - Multi-Campaign + BYOK
// ============================================

// Error Boundary to catch crashes and prevent white screen
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 App crashed:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-500 rounded-xl p-6 max-w-lg">
            <h2 className="text-red-400 font-semibold text-lg mb-2">⚠️ Something went wrong</h2>
            <p className="text-slate-300 text-sm mb-4">
              The app encountered an error. Your data is safe - try refreshing the page.
            </p>
            <div className="bg-slate-900 border border-slate-700 rounded p-3 mb-4">
              <p className="text-xs text-slate-400 font-mono">{this.state.error?.toString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded font-medium"
              >
                Refresh App
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                Try to Continue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Custom SVG Icons
const Icons = {
  party: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 8a3 3 0 1 0 0 6M18 8a3 3 0 1 0 0 6"/><path d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z"/></svg>),
  enemy: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="8" r="5"/><path d="M9 8h.01M15 8h.01M9 11c.5.5 1.5 1 3 1s2.5-.5 3-1M8 14l-3 7h14l-3-7"/></svg>),
  character: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>),
  location: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>),
  item: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14.5 2l6 6-8.5 8.5a2 2 0 0 1-1.4.6H7v-3.6a2 2 0 0 1 .6-1.4L14.5 2zM16 8l-2-2M3 22l3-3"/></svg>),
  plot: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>),
  exploration: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>),
  combat: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M6.5 6.5l11 11M6.5 17.5l11-11"/></svg>),
  settings: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  audio: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>),
  transcript: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg>),
  delete: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>),
  check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M20 6L9 17l-5-5"/></svg>),
  close: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12"/></svg>),
  play: (<svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M8 5v14l11-7z"/></svg>),
  stop: (<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>),
  record: (<svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><circle cx="12" cy="12" r="8"/></svg>),
  back: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>),
  plus: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 5v14M5 12h14"/></svg>),
  key: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>),
  book: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
  dice: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>),
};

// D&D 5.5e Conditions
const DND_CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Exhaustion'];

// Card types
const CARD_TYPES = {
  CHARACTER: { label: 'Character', icon: 'character', color: 'violet' },
  LOCATION: { label: 'Location', icon: 'location', color: 'cyan' },
  ITEM: { label: 'Item', icon: 'item', color: 'amber' },
  PLOT: { label: 'Plot', icon: 'plot', color: 'pink' },
  ENEMY: { label: 'Enemy', icon: 'enemy', color: 'red' },
};

// Riff templates
const RIFF_TEMPLATES = {
  CHARACTER: [
    { key: 'fullName', label: 'Full Name', prompt: 'a fitting full name' },
    { key: 'appearance', label: 'Appearance', prompt: 'a brief physical description' },
    { key: 'voice', label: 'Voice', prompt: 'their voice quality or accent' },
    { key: 'secret', label: 'Secret', prompt: 'a hidden motivation' },
  ],
  LOCATION: [
    { key: 'atmosphere', label: 'Atmosphere', prompt: 'the mood of this place' },
    { key: 'sounds', label: 'Sounds', prompt: 'what sounds can be heard' },
    { key: 'notable', label: 'Notable Feature', prompt: 'a distinctive feature' },
  ],
  ITEM: [
    { key: 'origin', label: 'Origin', prompt: 'where this came from' },
    { key: 'property', label: 'Hidden Property', prompt: 'a secret property' },
  ],
  ENEMY: [
    { key: 'distinguishing', label: 'Distinguishing', prompt: 'what makes this one distinct' },
    { key: 'tactics', label: 'Tactics', prompt: 'how they fight' },
    { key: 'weakness', label: 'Weakness', prompt: 'a vulnerability' },
  ],
  PLOT: [
    { key: 'twist', label: 'Twist', prompt: 'an unexpected development' },
    { key: 'connection', label: 'Connection', prompt: 'how this connects elsewhere' },
  ],
};

// Storage hook
const useStorage = (key, defaultValue) => {
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          setValue(parsed);
        }
      } catch (e) {
        console.error('❌ Storage load error:', e);
        // If parse fails, clear the corrupted data and use default
        try {
          localStorage.removeItem(key);
          console.log('🧹 Cleared corrupted storage for:', key);
        } catch (clearError) {
          console.error('Failed to clear storage:', clearError);
        }
      }
      setLoaded(true);
    };
    load();
  }, [key]);

  const save = useCallback(async (newValue) => {
    setValue(newValue);
    try {
      const serialized = JSON.stringify(newValue);
      // Check size (localStorage limit is ~5-10MB depending on browser)
      const sizeInMB = new Blob([serialized]).size / 1024 / 1024;
      if (sizeInMB > 8) {
        console.warn(`⚠️ Storage size warning: ${sizeInMB.toFixed(2)}MB - approaching browser limits`);
      }
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.error('❌ Storage save error:', e);
      if (e.name === 'QuotaExceededError') {
        alert('Storage limit exceeded. Consider archiving old sessions or clearing data.');
      }
    }
  }, [key]);

  return [value, save, loaded];
};

// Utility components
const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-slate-700 text-slate-200',
    canon: 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40',
    riff: 'bg-amber-900/40 text-amber-300 border border-dashed border-amber-500/50',
    status: 'bg-purple-900/50 text-purple-300 border border-purple-500/40',
    pc: 'bg-violet-900/50 text-violet-300 border border-violet-500/40',
  };
  const sizes = { sm: 'px-1.5 py-0.5 text-[10px]', md: 'px-2 py-0.5 text-xs' };
  return <span className={`rounded font-medium ${variants[variant]} ${sizes[size]}`}>{children}</span>;
};

const Button = ({ children, onClick, variant = 'default', size = 'md', className = '', disabled = false }) => {
  const variants = {
    default: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    primary: 'bg-violet-600 hover:bg-violet-500 text-white',
    danger: 'bg-red-600/80 hover:bg-red-500 text-white',
    ghost: 'bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-slate-200',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    riff: 'bg-amber-600/80 hover:bg-amber-500 text-white',
  };
  const sizes = { xs: 'px-1.5 py-0.5 text-[10px]', sm: 'px-2 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2 text-base' };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`rounded font-medium transition-all ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  );
};

const IconButton = ({ icon, onClick, variant = 'ghost', title = '' }) => {
  const variants = { ghost: 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200', danger: 'hover:bg-red-900/50 text-slate-400 hover:text-red-400' };
  return <button onClick={onClick} title={title} className={`p-1.5 rounded transition-all ${variants[variant]}`}>{Icons[icon]}</button>;
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-4 max-w-sm mx-4">
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-300 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
};

// Player Roster Modal
const PlayerRosterModal = ({ isOpen, onClose, playerRoster, onSave }) => {
  const [roster, setRoster] = useState(playerRoster || []);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setRoster(playerRoster || []);
  }, [playerRoster, isOpen]);

  const addPlayer = () => {
    const newPlayer = {
      id: `player-${Date.now()}`,
      playerName: '',
      characterName: '',
      characterId: null, // Will link to character card
      aliases: []
    };
    setRoster([...roster, newPlayer]);
    setEditingId(newPlayer.id);
  };

  const updatePlayer = (id, updates) => {
    setRoster(roster.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePlayer = (id) => {
    setRoster(roster.filter(p => p.id !== id));
  };

  const addAlias = (id) => {
    const player = roster.find(p => p.id === id);
    if (player) {
      const alias = prompt('Add character alias/nickname:');
      if (alias && alias.trim()) {
        updatePlayer(id, { aliases: [...(player.aliases || []), alias.trim()] });
      }
    }
  };

  const removeAlias = (playerId, alias) => {
    const player = roster.find(p => p.id === playerId);
    if (player) {
      updatePlayer(playerId, { aliases: player.aliases.filter(a => a !== alias) });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold">Player Roster</h2>
          <IconButton icon="close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs text-slate-500 mb-4">
            Define your players and their characters to prevent AI from creating duplicates. Include common aliases and mispronunciations.
          </p>

          <div className="space-y-3">
            {roster.map(player => (
              <div key={player.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Player Name (Real)</label>
                    <input
                      type="text"
                      value={player.playerName}
                      onChange={(e) => updatePlayer(player.id, { playerName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                      placeholder="Michael"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Character Name (In-Game)</label>
                    <input
                      type="text"
                      value={player.characterName}
                      onChange={(e) => updatePlayer(player.id, { characterName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                      placeholder="Kermit the Barbarian"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Aliases / Common Mispronunciations</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(player.aliases || []).map((alias, i) => (
                      <span key={i} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 flex items-center gap-1">
                        {alias}
                        <button onClick={() => removeAlias(player.id, alias)} className="text-slate-500 hover:text-red-400">×</button>
                      </span>
                    ))}
                    <button
                      onClick={() => addAlias(player.id)}
                      className="bg-slate-800 border border-dashed border-slate-600 rounded px-2 py-1 text-xs text-slate-400 hover:text-violet-400 hover:border-violet-500"
                    >
                      + Add alias
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove Player
                </button>
              </div>
            ))}
          </div>

          <Button variant="ghost" onClick={addPlayer} className="w-full mt-3">+ Add Player</Button>
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(roster); onClose(); }}>Save Roster</Button>
        </div>
      </div>
    </div>
  );
};

// Arc Modal (DM Context)
const ArcModal = ({ isOpen, onClose, arc, onSave }) => {
  const [localArc, setLocalArc] = useState(arc);

  useEffect(() => { setLocalArc(arc); }, [arc, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">{Icons.book} Campaign Arc</h2>
          <IconButton icon="close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs text-slate-500 mb-3">Campaign secrets, plot threads, and DM-only context. Never revealed to players but used by AI for suggestions.</p>
          <textarea
            value={localArc}
            onChange={(e) => setLocalArc(e.target.value)}
            className="w-full h-64 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white resize-none"
            placeholder="The BBEG is actually the king's advisor. The ancient artifact they seek is cursed..."
          />
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(localArc); onClose(); }}>Save Arc</Button>
        </div>
      </div>
    </div>
  );
};

// Settings Modal (API Keys only)
const SettingsModal = ({ isOpen, onClose, settings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => { setLocalSettings(settings); }, [settings, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">{Icons.settings} Settings</h2>
          <IconButton icon="close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 mb-3">API keys stored locally in your browser only.</p>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Anthropic API Key</label>
              <input type="password" value={localSettings.anthropicKey || ''} onChange={(e) => setLocalSettings({ ...localSettings, anthropicKey: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white" placeholder="sk-ant-..." />
              <p className="text-xs text-slate-500 mt-1">For AI suggestions and processing</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Deepgram API Key</label>
              <input type="password" value={localSettings.deepgramKey || ''} onChange={(e) => setLocalSettings({ ...localSettings, deepgramKey: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white" placeholder="Your Deepgram key" />
              <p className="text-xs text-slate-500 mt-1">For real-time audio transcription</p>
            </div>
            <div className="pt-2 border-t border-slate-700">
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${localSettings.anthropicKey ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <span className="text-slate-400">Anthropic: {localSettings.anthropicKey ? 'Configured' : 'Not set'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className={`w-2 h-2 rounded-full ${localSettings.deepgramKey ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <span className="text-slate-400">Deepgram: {localSettings.deepgramKey ? 'Configured' : 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSaveSettings(localSettings); onClose(); }}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
};

// Session Report Modal
const SessionReportModal = ({ isOpen, onClose, session, cards, settings, onGenerateReport }) => {
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReport(null);
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const generateReport = async () => {
    setGenerating(true);
    try {
      const generatedReport = await onGenerateReport(session, cards);
      setReport(generatedReport);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    const markdown = `# ${session.name} - Session Report\n\n${report.recap ? `## Recap\n${report.recap}\n\n` : ''}${report.mvp ? `## MVP\n**${report.mvp.character}** - ${report.mvp.reason}\n\n` : ''}${report.highlights?.length ? `## Highlights\n${report.highlights.map(h => `- ${h}`).join('\n')}\n\n` : ''}${report.quotes?.length ? `## Memorable Quotes\n${report.quotes.map(q => `> "${q.text}" - ${q.character}`).join('\n\n')}\n\n` : ''}${report.events?.length ? `## Key Events\n${report.events.map(e => `- **${e.character}**: ${e.detail}`).join('\n')}\n` : ''}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name.replace(/\s+/g, '-')}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">{Icons.transcript} Session Report</h2>
          <IconButton icon="close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!report ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">Generate an AI-powered session report with highlights, MVP, and memorable moments.</p>
              <Button variant="primary" onClick={generateReport} disabled={generating || !settings.anthropicKey}>
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
              {!settings.anthropicKey && (
                <p className="text-xs text-amber-400 mt-2">API key required</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {report.recap && (
                <div>
                  <h3 className="text-lg font-semibold text-violet-400 mb-2">Session Recap</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{report.recap}</p>
                </div>
              )}

              {report.mvp && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-amber-400 mb-2">🏆 Session MVP</h3>
                  <p className="text-sm text-amber-200"><strong>{report.mvp.character}</strong></p>
                  <p className="text-sm text-amber-300/80 mt-1">{report.mvp.reason}</p>
                </div>
              )}

              {report.highlights?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-2">✨ Highlights</h3>
                  <ul className="space-y-2">
                    {report.highlights.map((h, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-500">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.quotes?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">💬 Memorable Quotes</h3>
                  <div className="space-y-3">
                    {report.quotes.map((q, i) => (
                      <blockquote key={i} className="border-l-2 border-cyan-500 pl-3 py-1">
                        <p className="text-sm text-slate-300 italic">"{q.text}"</p>
                        <p className="text-xs text-cyan-400 mt-1">— {q.character}</p>
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}

              {report.events?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-violet-400 mb-2">📌 Key Events</h3>
                  <ul className="space-y-2">
                    {report.events.map((e, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-violet-500">•</span>
                        <span><strong>{e.character}:</strong> {e.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {report && (
          <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={exportReport}>Export Markdown</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Campaign Card
const CampaignCard = ({ campaign, onClick, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const chars = campaign.cards?.filter(c => c.type === 'CHARACTER').length || 0;
  const locs = campaign.cards?.filter(c => c.type === 'LOCATION').length || 0;

  return (
    <>
      <div onClick={onClick} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-5 cursor-pointer transition-all group relative">
        <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          className="absolute top-3 right-3 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition-all">
          {Icons.delete}
        </button>
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center mb-4 text-white">{Icons.dice}</div>
        <h3 className="font-semibold text-white text-lg mb-1">{campaign.name}</h3>
        <div className="flex gap-3 text-xs text-slate-500 mb-3">
          <span>{chars} characters</span>
          <span>{locs} locations</span>
        </div>
        <p className="text-xs text-slate-600">Updated {new Date(campaign.updatedAt).toLocaleDateString()}</p>
      </div>
      <ConfirmModal isOpen={showConfirm} title="Delete Campaign?" message={`Delete "${campaign.name}"? This cannot be undone.`}
        onConfirm={() => { onDelete(campaign.id); setShowConfirm(false); }} onCancel={() => setShowConfirm(false)} />
    </>
  );
};

// Campaigns Home
const CampaignsHome = ({ campaigns, onSelect, onCreate, onDelete, settings, onOpenSettings }) => {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">DM HUD</h1>
          <button onClick={onOpenSettings} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">{Icons.settings} Settings</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-200">Your Campaigns</h2>
          <Button variant="primary" onClick={() => setShowNew(true)} className="flex items-center gap-2">{Icons.plus} New Campaign</Button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-600">{Icons.dice}</div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">No campaigns yet</h3>
            <p className="text-sm text-slate-500 mb-4">Create your first campaign to get started</p>
            <Button variant="primary" onClick={() => setShowNew(true)}>Create Campaign</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(c => <CampaignCard key={c.id} campaign={c} onClick={() => onSelect(c.id)} onDelete={onDelete} />)}
          </div>
        )}

        {(!settings.anthropicKey || !settings.deepgramKey) && (
          <div className="mt-8 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-amber-400">{Icons.key}</span>
              <div>
                <h4 className="font-medium text-amber-200 text-sm">API Keys Not Configured</h4>
                <p className="text-xs text-amber-300/70 mt-1">Add your API keys in Settings to enable AI and transcription.</p>
                <button onClick={onOpenSettings} className="text-xs text-amber-400 hover:text-amber-300 mt-2 underline">Configure →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-4">New Campaign</h3>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newName.trim() && (onCreate(newName.trim()), setNewName(''), setShowNew(false))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white mb-4" placeholder="Campaign name..." autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => { if (newName.trim()) { onCreate(newName.trim()); setNewName(''); setShowNew(false); } }} disabled={!newName.trim()}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact Card
const CompactCard = ({ card, onClick, onQuickHP, onDelete, isInCombat, onReorder }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cardType = CARD_TYPES[card.type] || CARD_TYPES.CHARACTER;
  const hasRiffs = Object.keys(card.riffs || {}).length > 0;
  const colorClass = { violet: 'text-violet-400', cyan: 'text-cyan-400', amber: 'text-amber-400', pink: 'text-pink-400', red: 'text-red-400' }[cardType.color] || 'text-slate-400';

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId !== card.id && onReorder) {
      onReorder(draggedId, card.id);
    }
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={onClick}
        className={`relative rounded-lg p-2.5 cursor-move transition-all group ${card.isCanon ? 'bg-slate-800/90 border border-slate-600/50 hover:border-slate-500' : 'bg-slate-800/50 border-2 border-dashed border-amber-500/40'} ${card.hp?.current === 0 ? 'opacity-50' : ''} ${isDragging ? 'opacity-40' : ''}`}>
        {!card.isPC && (
          <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 border border-slate-600 text-slate-400 text-xs opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white flex items-center justify-center z-10">
            {Icons.close}
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className={colorClass}>{Icons[cardType.icon]}</span>
          <span className="font-medium text-white text-sm truncate flex-1">{card.name}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {card.isPC && <Badge variant="pc" size="sm">PC</Badge>}
            {card.type === 'CHARACTER' && card.inParty && <Badge variant="status" size="sm">Party</Badge>}
            {!card.isCanon && <Badge variant="riff" size="sm">Riff</Badge>}
            {hasRiffs && card.isCanon && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
        </div>
        {card.status?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
            {card.status.map((s, i) => <Badge key={i} variant="status" size="sm">{s}</Badge>)}
          </div>
        )}
        {card.hp && (
          <div className="mt-2 flex items-center gap-2 ml-5">
            <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${card.hp.current / card.hp.max > 0.5 ? 'bg-emerald-500' : card.hp.current / card.hp.max > 0.25 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${(card.hp.current / card.hp.max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 font-mono w-12 text-right">{card.hp.current}/{card.hp.max}</span>
            {isInCombat && (
              <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                <button onClick={() => onQuickHP(card.id, -1)} className="w-5 h-5 rounded bg-red-900/50 hover:bg-red-800 text-red-300 text-xs">−</button>
                <button onClick={() => onQuickHP(card.id, 1)} className="w-5 h-5 rounded bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 text-xs">+</button>
              </div>
            )}
          </div>
        )}
        {card.notes && !card.hp && <div className="mt-1 ml-5 text-[10px] text-slate-500 truncate">{card.notes}</div>}
      </div>
      <ConfirmModal isOpen={showConfirm} title="Delete?" message={`Delete "${card.name}"?`}
        onConfirm={() => { onDelete(card.id); setShowConfirm(false); }} onCancel={() => setShowConfirm(false)} />
    </>
  );
};

// Detail Drawer
const DetailDrawer = ({ card, isOpen, onClose, onUpdate, onDelete, onGenerateRiff, isGenerating, onGetCharacterEvents }) => {
  const [activeTab, setActiveTab] = useState('canon');
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');

  if (!isOpen || !card) return null;
  const cardType = CARD_TYPES[card.type] || CARD_TYPES.CHARACTER;
  const templates = RIFF_TEMPLATES[card.type] || [];
  const colorClass = { violet: 'bg-violet-900/50 text-violet-400', cyan: 'bg-cyan-900/50 text-cyan-400', amber: 'bg-amber-900/50 text-amber-400', pink: 'bg-pink-900/50 text-pink-400', red: 'bg-red-900/50 text-red-400' }[cardType.color];

  const saveEdit = (field) => {
    if (field === 'name') onUpdate(card.id, { name: editValue });
    else if (field === 'notes') onUpdate(card.id, { notes: editValue });
    else if (field === 'newFact') onUpdate(card.id, { canonFacts: [...(card.canonFacts || []), editValue] });
    setEditField(null); setEditValue('');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-slate-900 border-l border-slate-700 z-50 flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
              <span className="scale-150">{Icons[cardType.icon]}</span>
            </span>
            <div>
              {editField === 'name' ? (
                <div className="flex gap-2">
                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-semibold w-40"
                    autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit('name')} />
                  <Button size="sm" variant="primary" onClick={() => saveEdit('name')}>Save</Button>
                </div>
              ) : (
                <h2 className="text-lg font-semibold text-white cursor-pointer hover:text-violet-300"
                  onClick={() => { setEditField('name'); setEditValue(card.name); }}>{card.name}</h2>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={card.isCanon ? 'canon' : 'riff'}>{card.isCanon ? 'Canon' : 'Riff'}</Badge>
                {card.type === 'CHARACTER' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdate(card.id, { isPC: !card.isPC })}
                      className="transition-opacity hover:opacity-80"
                      title="Toggle PC/NPC"
                    >
                      <Badge variant={card.isPC ? 'pc' : 'default'}>
                        {card.isPC ? 'PC' : 'NPC'}
                      </Badge>
                    </button>
                    <button
                      onClick={() => onUpdate(card.id, { inParty: !card.inParty })}
                      className="transition-opacity hover:opacity-80"
                      title="Toggle Party Member"
                    >
                      <Badge variant={card.inParty ? 'status' : 'default'}>
                        {card.inParty ? 'Party' : 'Solo'}
                      </Badge>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <IconButton icon="close" onClick={onClose} />
        </div>

        {(card.hp || card.type === 'CHARACTER' || card.type === 'ENEMY') && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">HP</span>
              {card.hp ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={card.hp.current}
                    onChange={(e) => {
                      const newCurrent = parseInt(e.target.value) || 0;
                      onUpdate(card.id, { hp: { ...card.hp, current: Math.max(0, Math.min(card.hp.max, newCurrent)) } });
                    }}
                    className="w-12 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-center text-sm font-mono"
                  />
                  <span className="text-slate-400">/</span>
                  <input
                    type="number"
                    value={card.hp.max}
                    onChange={(e) => {
                      const newMax = parseInt(e.target.value) || 1;
                      onUpdate(card.id, { hp: { current: Math.min(card.hp.current, newMax), max: newMax } });
                    }}
                    className="w-12 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-center text-sm font-mono"
                  />
                </div>
              ) : (
                <Button size="xs" variant="primary" onClick={() => {
                  onUpdate(card.id, { hp: { current: 10, max: 10 } });
                }}>
                  Add HP
                </Button>
              )}
            </div>
            {card.hp && (
              <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
                <div className={`h-full ${card.hp.current / card.hp.max > 0.5 ? 'bg-emerald-500' : card.hp.current / card.hp.max > 0.25 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${(card.hp.current / card.hp.max) * 100}%` }} />
              </div>
            )}
          </div>
        )}

        {/* D&D 5.5e Stats Section - only for CHARACTERs and ENEMYs */}
        {(card.type === 'CHARACTER' || card.type === 'ENEMY') && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="text-xs text-slate-400 uppercase mb-2">Stats</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => {
                const value = card.stats?.[stat] || 10;
                const modifier = Math.floor((value - 10) / 2);
                return (
                  <div key={stat} className="bg-slate-900 rounded p-2 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">{stat}</div>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => {
                        const newVal = parseInt(e.target.value) || 10;
                        onUpdate(card.id, { stats: { ...(card.stats || {}), [stat]: newVal } });
                      }}
                      className="w-full bg-transparent text-white text-center text-sm font-semibold mb-1 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded"
                    />
                    <div className="text-[10px] text-slate-400">
                      {modifier >= 0 ? '+' : ''}{modifier}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">AC</label>
                <input
                  type="number"
                  value={card.ac || ''}
                  onChange={(e) => onUpdate(card.id, { ac: parseInt(e.target.value) || null })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Level</label>
                <input
                  type="number"
                  value={card.level || ''}
                  onChange={(e) => onUpdate(card.id, { level: parseInt(e.target.value) || null })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Class</label>
                <input
                  type="text"
                  value={card.class || ''}
                  onChange={(e) => onUpdate(card.id, { class: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-center text-xs"
                  placeholder="-"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex border-b border-slate-700">
          <button onClick={() => setActiveTab('canon')} className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'canon' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400'}`}>Canon</button>
          <button onClick={() => setActiveTab('riffs')} className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'riffs' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400'}`}>
            Riffs {Object.keys(card.riffs || {}).length > 0 && <span className="ml-1 px-1.5 text-[10px] bg-amber-500 text-black rounded-full">{Object.keys(card.riffs || {}).length}</span>}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'canon' ? (
            <div className="space-y-3">
              {card.genesis && (
                <div className="bg-violet-900/20 border border-violet-500/30 rounded-lg p-3">
                  <div className="text-xs text-violet-400 uppercase mb-1 flex items-center gap-1">
                    {Icons.transcript} Genesis
                  </div>
                  <p className="text-xs text-violet-200/80 italic leading-relaxed">"{card.genesis}"</p>
                  {card.createdAt && (
                    <p className="text-[10px] text-violet-400/60 mt-1">
                      {new Date(card.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-500 uppercase mb-1">Notes</div>
                {editField === 'notes' ? (
                  <div className="space-y-2">
                    <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm h-20 resize-none" autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => saveEdit('notes')}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 cursor-pointer hover:text-white" onClick={() => { setEditField('notes'); setEditValue(card.notes || ''); }}>
                    {card.notes || <span className="italic text-slate-500">Click to add...</span>}
                  </p>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase mb-2">Facts</div>
                <div className="space-y-2">
                  {(card.canonFacts || []).map((f, i) => (
                    <div key={i} className="flex items-start gap-2 bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-2">
                      <span className="text-emerald-400">{Icons.check}</span>
                      <span className="text-sm text-slate-200 flex-1">{f}</span>
                      <button onClick={() => onUpdate(card.id, { canonFacts: card.canonFacts.filter((_, j) => j !== i) })} className="text-slate-500 hover:text-red-400 text-xs">×</button>
                    </div>
                  ))}
                  {editField === 'newFact' ? (
                    <div className="space-y-2">
                      <input value={editValue} onChange={e => setEditValue(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        placeholder="New fact..." autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit('newFact')} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => saveEdit('newFact')}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditField('newFact'); setEditValue(''); }}
                      className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-sm text-slate-500 hover:text-white hover:border-slate-400">
                      + Add Fact
                    </button>
                  )}
                </div>
              </div>

              {/* Character Events/Milestones */}
              {onGetCharacterEvents && (() => {
                const charEvents = onGetCharacterEvents(card.name);
                return charEvents.length > 0 ? (
                  <div>
                    <div className="text-xs text-slate-500 uppercase mb-2">Events & Milestones</div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {charEvents.map((evt) => {
                        const typeColors = {
                          check: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
                          save: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
                          attack: 'text-red-400 bg-red-900/20 border-red-500/30',
                          discovery: 'text-amber-400 bg-amber-900/20 border-amber-500/30',
                          levelup: 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30',
                          story: 'text-violet-400 bg-violet-900/20 border-violet-500/30'
                        };
                        const colorClass = typeColors[evt.type] || 'text-slate-400 bg-slate-800/50 border-slate-700';

                        return (
                          <div key={evt.id} className={`flex items-start gap-2 rounded-lg p-2 border ${colorClass}`}>
                            <div className="flex-1">
                              <div className="text-xs font-medium capitalize">{evt.type}</div>
                              <div className="text-xs opacity-90">{evt.detail}</div>
                              {evt.outcome && (
                                <div className="text-[10px] opacity-70 mt-0.5">
                                  {evt.outcome === 'success' && '✓ Success'}
                                  {evt.outcome === 'fail' && '✗ Fail'}
                                  {evt.outcome === 'critical' && '⚡ Critical'}
                                  {evt.outcome === 'fumble' && '💥 Fumble'}
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => {
                const val = card.riffs?.[t.key];
                return (
                  <div key={t.key} className={`rounded-lg p-3 ${val ? 'bg-amber-900/20 border border-amber-500/30' : 'bg-slate-800/50 border border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400 uppercase">{t.label}</span>
                      <div className="flex gap-1">
                        {val && <Button size="xs" variant="success" onClick={() => {
                          const fact = `${t.label}: ${val}`;
                          const newRiffs = { ...card.riffs }; delete newRiffs[t.key];
                          onUpdate(card.id, { canonFacts: [...(card.canonFacts || []), fact], riffs: newRiffs });
                        }}>Canonize</Button>}
                        <Button size="xs" variant={val ? 'ghost' : 'riff'} onClick={() => onGenerateRiff(card, t)} disabled={isGenerating}>
                          {isGenerating ? '...' : val ? '↻' : 'Generate'}
                        </Button>
                      </div>
                    </div>
                    {val ? <p className="text-sm text-amber-200">{val}</p> : <p className="text-sm text-slate-600 italic">Not generated</p>}
                  </div>
                );
              })}
              <Button variant="riff" className="w-full mt-4" onClick={() => templates.forEach(t => !card.riffs?.[t.key] && onGenerateRiff(card, t))} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate All'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Audio Panel with Live Session
const AudioPanel = ({ settings, onProcess, isProcessing }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [liveStatus, setLiveStatus] = useState('idle');

  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptBufferRef = useRef('');
  const bufferTimerRef = useRef(null);

  const startLiveSession = async () => {
    if (!settings.deepgramKey) {
      setError('Deepgram API key required');
      return;
    }

    try {
      setError(null);
      setLiveStatus('requesting');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setLiveStatus('connecting');

      // Connect to Deepgram WebSocket
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true&interim_results=false`,
        ['token', settings.deepgramKey]
      );

      socketRef.current = ws;

      ws.onopen = () => {
        setLiveStatus('recording');
        setIsLive(true);

        // Start recording
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(250); // Send audio chunks every 250ms
      };

      ws.onmessage = (message) => {
        const data = JSON.parse(message.data);

        if (data.type === 'Results' && data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;

          if (transcript.trim()) {
            // Buffer transcript chunks to prevent incomplete sentence processing
            transcriptBufferRef.current += ' ' + transcript;

            // Clear existing timer
            if (bufferTimerRef.current) {
              clearTimeout(bufferTimerRef.current);
            }

            // Flush buffer after 2 seconds of silence (complete thought)
            // OR if buffer ends with sentence-ending punctuation
            const endsWithPunctuation = /[.!?;]\s*$/.test(transcriptBufferRef.current.trim());
            const delay = endsWithPunctuation ? 500 : 2000;

            bufferTimerRef.current = setTimeout(() => {
              const bufferedText = transcriptBufferRef.current.trim();
              if (bufferedText) {
                // Determine speaker (you could enhance this with voice recognition)
                const speaker = data.channel_index?.[0] === 0 ? 'DM' : 'Player';
                console.log(`🎤 Flushing buffered transcript (${bufferedText.length} chars)`);
                onProcess(`${speaker}: ${bufferedText}`);
                transcriptBufferRef.current = '';
              }
            }, delay);
          }
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
        stopLiveSession();
      };

      ws.onclose = () => {
        if (liveStatus === 'recording') {
          stopLiveSession();
        }
      };

    } catch (e) {
      console.error('Live session error:', e);
      setError(e.message || 'Microphone access denied');
      setLiveStatus('idle');
    }
  };

  const stopLiveSession = () => {
    // Flush any remaining buffered transcript
    if (bufferTimerRef.current) {
      clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
    if (transcriptBufferRef.current.trim()) {
      console.log('🎤 Flushing final buffered transcript on stop');
      onProcess(`DM: ${transcriptBufferRef.current.trim()}`);
      transcriptBufferRef.current = '';
    }

    // Stop media recorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsLive(false);
    setLiveStatus('idle');
  };

  const transcribe = async () => {
    if (!settings.deepgramKey || !file) return;
    setStatus('transcribing'); setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true', {
        method: 'POST',
        headers: { 'Authorization': `Token ${settings.deepgramKey}`, 'Content-Type': file.type || 'audio/wav' },
        body: buffer,
      });
      if (!res.ok) throw new Error(`Deepgram: ${res.status}`);
      const data = await res.json();
      const paras = data.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs;
      if (paras) {
        console.log(`📄 Processing ${paras.length} transcript paragraphs...`);
        for (let i = 0; i < paras.length; i++) {
          const p = paras[i];
          const speaker = p.speaker === 0 ? 'DM' : `Player ${p.speaker}`;
          const text = p.sentences.map(s => s.text).join(' ');
          setProgress(((i + 1) / paras.length) * 100);
          console.log(`  [${i+1}/${paras.length}] ${speaker}: ${text.substring(0, 50)}...`);
          await onProcess(`${speaker}: ${text}`);
          // Wait for AI processing to complete before next chunk
          await new Promise(r => setTimeout(r, 500));
        }
      } else {
        const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        if (text) {
          console.log('📄 Processing single transcript chunk');
          await onProcess(`DM: ${text}`);
        }
      }
      setStatus('complete');
      console.log('✅ File transcription complete');
    } catch (e) { setError(e.message); setStatus('error'); }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">{Icons.audio}</span>
          <span className="text-sm font-medium text-slate-300">Audio Session</span>
        </div>

        {/* Live Session Button */}
        <div className="flex items-center gap-2">
          {!isLive ? (
            <Button
              size="sm"
              variant="primary"
              onClick={startLiveSession}
              disabled={!settings.deepgramKey || liveStatus === 'connecting'}
              className="flex items-center gap-1.5"
            >
              {Icons.record}
              {liveStatus === 'connecting' ? 'Connecting...' : 'Start Live Session'}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="danger"
              onClick={stopLiveSession}
              className="flex items-center gap-1.5 animate-pulse"
            >
              {Icons.stop}
              Stop Session
            </Button>
          )}

          {!isLive && status === 'idle' && (
            <label className="cursor-pointer">
              <input type="file" accept="audio/*" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setStatus('ready'); setProgress(0); setError(null); } }} className="hidden" />
              <span className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300">Upload File</span>
            </label>
          )}
        </div>
      </div>

      {error && <div className="text-xs text-red-400 mb-2 p-2 bg-red-900/20 rounded">{error}</div>}

      {isLive && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span>LIVE - Listening...</span>
        </div>
      )}

      {file && !isLive && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400">{file.name}</div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-2">
            {status === 'ready' && <Button size="sm" variant="primary" onClick={transcribe} disabled={!settings.deepgramKey} className="flex items-center gap-1">{Icons.play} Transcribe</Button>}
            {status === 'transcribing' && <span className="text-xs text-violet-400 animate-pulse">Processing... {progress.toFixed(0)}%</span>}
            {status === 'complete' && <span className="text-xs text-emerald-400 flex items-center gap-1">{Icons.check} Done</span>}
            <Button size="sm" variant="ghost" onClick={() => { setFile(null); setStatus('idle'); setProgress(0); setError(null); }}>Clear</Button>
          </div>
          {!settings.deepgramKey && <p className="text-xs text-amber-400">Add Deepgram key in Settings</p>}
        </div>
      )}

      {!file && !isLive && (
        <p className="text-xs text-slate-500">
          {settings.deepgramKey ? 'Start a live session or upload an audio file' : 'Add Deepgram key in Settings to enable'}
        </p>
      )}
    </div>
  );
};

// Create Card Modal
const CreateCardModal = ({ isOpen, onClose, onCreate, cardType }) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [hp, setHp] = useState('');
  const [isPC, setIsPC] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    const card = {
      type: cardType,
      name: name.trim(),
      notes: notes.trim(),
      isCanon: true,
    };
    if (cardType === 'CHARACTER') {
      card.isPC = isPC;
      card.inParty = isPC; // Default: PCs start in party, NPCs don't
    }
    if ((cardType === 'CHARACTER' || cardType === 'ENEMY') && hp.trim()) {
      const hpNum = parseInt(hp);
      if (!isNaN(hpNum) && hpNum > 0) {
        card.hp = { current: hpNum, max: hpNum };
      }
    }
    onCreate(card);
    setName('');
    setNotes('');
    setHp('');
    setIsPC(false);
    onClose();
  };

  const typeLabels = {
    CHARACTER: 'Character',
    LOCATION: 'Location',
    ITEM: 'Item',
    ENEMY: 'Enemy',
    PLOT: 'Plot Thread'
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
        <h3 className="font-semibold text-lg mb-4">New {typeLabels[cardType]}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
              placeholder={`${typeLabels[cardType]} name...`}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white h-20 resize-none"
              placeholder="Description, details..."
            />
          </div>
          {(cardType === 'CHARACTER' || cardType === 'ENEMY') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">HP (optional)</label>
              <input
                type="number"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                placeholder="Hit points..."
              />
            </div>
          )}
          {cardType === 'CHARACTER' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPC"
                checked={isPC}
                onChange={(e) => setIsPC(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="isPC" className="text-sm text-slate-300">Player Character</label>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={!name.trim()}>Create</Button>
        </div>
      </div>
    </div>
  );
};

// Campaign View
const CampaignView = ({ campaign, onUpdate, onBack, settings, onSaveSettings }) => {
  // Session management - initialize with backwards compatibility
  const sessions = campaign.sessions || [{
    id: `session-${Date.now()}`,
    name: 'Session 1',
    startTime: campaign.createdAt,
    endTime: null,
    transcript: campaign.transcript || [],
    events: [],
    isActive: true
  }];
  const activeSession = sessions.find(s => s.isActive) || sessions[sessions.length - 1];

  const [mode, setMode] = useState('exploration');
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [genRiff, setGenRiff] = useState(false);
  const [input, setInput] = useState('');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(activeSession.id);
  const [showRoster, setShowRoster] = useState(false);
  const [showArc, setShowArc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const transcriptRef = useRef(null);

  // Keep a ref to always get the latest campaign state
  const campaignRef = useRef(campaign);
  useEffect(() => {
    campaignRef.current = campaign;
  }, [campaign]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || activeSession;
  const cards = campaign.cards || [];
  const transcript = currentSession.transcript || [];
  const dmContext = campaign.dmContext || '';
  const playerRoster = campaign.playerRoster || [];

  const save = (updates) => onUpdate({ ...campaignRef.current, ...updates, updatedAt: new Date().toISOString() });

  // Use campaignRef.current to always get latest state and avoid stale closure issues
  const updateCard = (id, updates) => {
    const latest = campaignRef.current;
    onUpdate({ ...latest, cards: latest.cards.map(c => c.id === id ? { ...c, ...updates } : c), updatedAt: new Date().toISOString() });
  };

  const deleteCard = (id) => {
    const latest = campaignRef.current;
    onUpdate({ ...latest, cards: latest.cards.filter(c => c.id !== id), updatedAt: new Date().toISOString() });
    if (selected?.id === id) setSelected(null);
  };

  const addCard = (card, genesisText = null) => {
    const latest = campaignRef.current;
    const nc = {
      ...card,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
      riffs: {},
      canonFacts: card.canonFacts || [],
      status: card.status || [],
      genesis: genesisText || null,  // Store the transcript snippet where this was introduced
      createdAt: new Date().toISOString()
    };
    onUpdate({ ...latest, cards: [...latest.cards, nc], updatedAt: new Date().toISOString() });
    return nc;
  };

  const quickHP = (id, d) => {
    const latest = campaignRef.current;
    onUpdate({ ...latest, cards: latest.cards.map(c => c.id === id && c.hp ? { ...c, hp: { ...c.hp, current: Math.max(0, Math.min(c.hp.max, c.hp.current + d)) } } : c), updatedAt: new Date().toISOString() });
  };

  const reorderCards = (draggedId, targetId) => {
    const latest = campaignRef.current;
    const cards = [...latest.cards];

    const draggedIdx = cards.findIndex(c => c.id === draggedId);
    const targetIdx = cards.findIndex(c => c.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    // Remove dragged card and insert at target position
    const [draggedCard] = cards.splice(draggedIdx, 1);
    cards.splice(targetIdx, 0, draggedCard);

    onUpdate({ ...latest, cards, updatedAt: new Date().toISOString() });
  };

  const getCharacterEvents = (characterName) => {
    const latest = campaignRef.current;
    const allEvents = [];

    // Collect events from all sessions
    (latest.sessions || []).forEach(session => {
      (session.events || []).forEach(event => {
        if (event.character.toLowerCase() === characterName.toLowerCase()) {
          allEvents.push({ ...event, sessionId: session.id, sessionName: session.name });
        }
      });
    });

    // Sort by timestamp, newest first
    return allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const genRiffFn = async (card, template) => {
    if (!settings.anthropicKey) return;
    setGenRiff(true);
    try {
      const latest = campaignRef.current;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: `You are assisting a Dungeon Master running a D&D 5.5e campaign. Generate creative, atmospheric ${template.prompt} for ${card.name}, a ${card.type} in their campaign.

Existing notes: ${card.notes || 'None'}
DM's secret context: ${latest.dmContext || 'None'}

Return ONLY the ${template.label} in 1-2 vivid sentences. Be creative and evocative. This is for a tabletop RPG game.`
          }]
        })
      });
      const data = await res.json();
      const val = data.content?.[0]?.text?.trim();
      if (val) {
        const latestNow = campaignRef.current;
        onUpdate({ ...latestNow, cards: latestNow.cards.map(c => c.id === card.id ? { ...c, riffs: { ...c.riffs, [template.key]: val } } : c), updatedAt: new Date().toISOString() });
      }
    } catch (e) { console.error(e); }
    setGenRiff(false);
  };

  const generateReport = async (session, cards) => {
    if (!settings.anthropicKey) throw new Error('API key required');

    const sessionTranscript = session.transcript || [];
    const sessionEvents = session.events || [];
    const pcCards = cards.filter(c => c.isPC);

    // Build transcript summary
    const transcriptText = sessionTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n');

    // Build events summary
    const eventsText = sessionEvents.map(e => `${e.character} - ${e.type}: ${e.detail}${e.outcome ? ` (${e.outcome})` : ''}`).join('\n');

    const prompt = `You are a D&D session chronicler. Generate a session report from this gameplay transcript and events.

SESSION: ${session.name}
PLAYER CHARACTERS: ${pcCards.map(c => c.name).join(', ')}

TRANSCRIPT:
${transcriptText}

KEY EVENTS:
${eventsText}

Generate a JSON report with:
{
  "recap": "2-3 paragraph narrative summary of what happened in the session",
  "mvp": {"character": "name", "reason": "why they were MVP this session"},
  "highlights": ["3-5 memorable moments from the session"],
  "quotes": [{"character": "name", "text": "memorable quote"}],
  "events": [{"character": "name", "detail": "significant event"}]
}

Focus on storytelling, dramatic moments, and player achievements. Be concise but engaging.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    const data = await res.json();
    let response = data.content?.[0]?.text?.trim() || '';

    if (response.startsWith('```')) {
      response = response.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    return JSON.parse(response);
  };

  // Helper to update current session
  const updateSession = (sessionUpdates) => {
    const latest = campaignRef.current;
    const updatedSessions = (latest.sessions || sessions).map(s =>
      s.id === currentSessionId ? { ...s, ...sessionUpdates } : s
    );
    onUpdate({
      ...latest,
      sessions: updatedSessions,
      updatedAt: new Date().toISOString()
    });
  };

  const processAI = async (text) => {
    // Always save transcript first - use campaignRef to get latest state
    const ts = new Date().toLocaleTimeString();
    const speaker = text.toLowerCase().startsWith('dm:') ? 'DM' : 'Player';
    const txt = text.replace(/^(dm:|player:)\s*/i, '');

    // Get latest campaign state and append to transcript in current session
    const latest = campaignRef.current;
    const currentSessions = latest.sessions || sessions;
    const session = currentSessions.find(s => s.id === currentSessionId);
    const updatedSessions = currentSessions.map(s =>
      s.id === currentSessionId
        ? { ...s, transcript: [...(s.transcript || []), { speaker, text: txt, timestamp: ts }] }
        : s
    );
    onUpdate({
      ...latest,
      sessions: updatedSessions,
      updatedAt: new Date().toISOString()
    });

    if (!settings.anthropicKey) {
      console.log('⚠️ No Anthropic API key - skipping AI processing');
      return;
    }

    setProcessing(true);
    try {
      console.log('🤖 Processing transcript:', text);

      // Get latest state for AI prompt
      const latestForPrompt = campaignRef.current;

      // Build context-efficient summary of existing cards
      const existingCardsSummary = latestForPrompt.cards.map(c => {
        const facts = (c.canonFacts || []).join('; ');
        return `${c.name} (${c.type}): ${c.notes || ''}${facts ? ' | ' + facts : ''}`;
      }).join('\n') || 'None';

      // Build player roster summary to prevent duplicates
      const currentRoster = latestForPrompt.playerRoster || playerRoster || [];
      const rosterSummary = currentRoster.map(p => {
        const aliases = p.aliases && p.aliases.length ? ` (aliases: ${p.aliases.join(', ')})` : '';
        return `- Player: ${p.playerName} → Character: ${p.characterName}${aliases}`;
      }).join('\n') || 'None defined';

      // Get recent transcript context (last 5 entries for context continuity)
      const currentSessions = latestForPrompt.sessions || sessions;
      const session = currentSessions.find(s => s.id === currentSessionId);
      const sessionTranscript = session?.transcript || [];
      const recentTranscript = sessionTranscript.slice(-5).map(t => `${t.speaker}: ${t.text}`).join('\n');

      const prompt = `You are analyzing D&D gameplay transcript to extract and update entities.

PLAYER ROSTER (DO NOT create cards for these real player names - only their character names):
${rosterSummary}

EXISTING ENTITIES:
${existingCardsSummary}

RECENT CONTEXT:
${recentTranscript}

NEW TRANSCRIPT: ${text}

DM SECRET CONTEXT: ${latestForPrompt.dmContext}

INSTRUCTIONS:
1. NEVER create CHARACTER cards for real PLAYER names (left side of roster arrows) - these are out-of-game identities
2. DO create CHARACTER cards for in-game character names (right side of roster arrows) on FIRST mention if they don't exist yet
3. Entity TYPE rules:
   - CHARACTER: ALL people/creatures (goblins, orcs, bandits, thieves, NPCs, party members, monsters, everyone)
     - Set "isHostile": true if attacking/aggressive (goblins charging, bandits ambushing)
     - Set "isHostile": false if friendly/neutral/not yet hostile
     - Set "inCombat": true when they engage in combat (attacking OR being attacked)
   - LOCATION: Places (taverns, caves, cities, dungeons)
   - ITEM: Objects (weapons, treasure, quest items, artifacts)
   - PLOT: Story threads, mysteries, quests
4. Combat state management:
   - "tall goblin draws sword and charges" → UPDATE that goblin: {"inCombat": true, "isHostile": true}
   - "party negotiates successfully" → UPDATE goblins: {"inCombat": false, "isHostile": false}
   - When combat starts, BOTH attackers AND defenders get "inCombat": true
5. If a character name or alias from the roster is mentioned AGAIN, update the EXISTING character card (don't create duplicates)
6. CRITICAL - Entity clarification patterns (UPDATE existing, DON'T create new):
   - "the barmaid introduces herself as Greta" → UPDATE existing "barmaid" with name: "Greta"
   - "the tall goblin in the middle" → UPDATE existing goblin with description
   - Look at RECENT CONTEXT - if a generic term was JUST mentioned, this is likely a clarification
7. For multiple creatures (e.g., "three goblins", "six thieves"), use "count" field (count: 3, count: 6)
8. Only create NEW entities if they're genuinely new, not clarifications of recent mentions
9. IMPORTANT: Detect HP changes from phrases like:
   - "X takes 5 damage" → {"name": "X", "damage": 5}
   - "The orc did 3 points of damage to Y" → {"name": "Y", "damage": 3}
   - "damaged someone for 2 points" (use context to identify who took damage)
   - "X deals 8 damage to Y" → {"name": "Y", "damage": 8}
   - "heals for 10" → {"name": "X", "healing": 10}
8. Extract D&D 5.5e stats when mentioned:
   - Ability scores (STR, DEX, CON, INT, WIS, CHA): "Kermit has 18 charisma" → update CHARACTER with stats: {CHA: 18}
   - AC, Level, Class: "level 5 barbarian with AC 16" → level: 5, class: "Barbarian", ac: 16
9. IMPORTANT: Extract character events/milestones:
   - Ability checks: "Kermit rolls 18 on persuasion" → {"character": "Kermit", "type": "check", "detail": "Persuasion 18", "outcome": "success"}
   - Saving throws: "Clara fails her DEX save" → {"character": "Clara", "type": "save", "detail": "DEX save", "outcome": "fail"}
   - Attack rolls: "natural 20!" → {"character": "X", "type": "attack", "detail": "Natural 20", "outcome": "critical"}
   - Discoveries: "finds a secret door" → {"character": "X", "type": "discovery", "detail": "Secret door"}
   - Level ups: "reaches level 5" → {"character": "X", "type": "levelup", "detail": "Level 5"}
   - Story moments: "makes a deal with the demon" → {"character": "X", "type": "story", "detail": "Deal with demon"}

Return ONLY valid JSON (no markdown):
{
  "newCards": [
    {"type": "CHARACTER", "name": "Greta", "notes": "Innkeeper", "isCanon": true, "isPC": false, "inParty": false, "isHostile": false, "inCombat": false, "count": 1},
    {"type": "CHARACTER", "name": "Goblin", "notes": "Goblin encountered on road", "isCanon": true, "isHostile": false, "inCombat": false, "count": 3}
  ],
  "cardUpdates": [
    {"name": "Goblin 2", "updates": {"notes": "Tall goblin in the middle with broadsword", "inCombat": true, "isHostile": true}},
    {"name": "Gargamel Vincent", "updates": {"inCombat": true}}
  ],
  "hpChanges": [
    {"name": "Everett", "damage": 5}
  ],
  "statusChanges": [
    {"name": "Clara", "addStatus": ["Poisoned"]}
  ],
  "events": [
    {"character": "Kermit", "type": "check", "detail": "Persuasion 18", "outcome": "success"},
    {"character": "Clara", "type": "discovery", "detail": "Found ancient tome"}
  ],
  "modeSwitch": "combat"
}

- newCards: EVERYTHING is type "CHARACTER" (goblins, thieves, NPCs, monsters, everyone!)
  - "three goblins" → {"type": "CHARACTER", "name": "Goblin", "count": 3, "isHostile": false} (creates Goblin 1-3)
  - Set "isHostile": true ONLY if actively attacking in this transcript
  - Set "inCombat": true ONLY if engaged in combat right now
  - Set "isPC": true for player characters, "inParty": true if traveling with party
- cardUpdates: UPDATE existing cards with combat state changes
  - "tall goblin charges" → UPDATE {"inCombat": true, "isHostile": true}
  - "party negotiates" → UPDATE {"inCombat": false, "isHostile": false}
- hpChanges: damage/healing with character names
- statusChanges: D&D 5.5e conditions
- modeSwitch: "combat" when combat starts, null otherwise

If no changes, return empty arrays.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ API Error:', res.status, errorText);
        throw new Error(`API Error: ${res.status}`);
      }

      const data = await res.json();
      let response = data.content?.[0]?.text?.trim() || '';
      console.log('📝 AI Response:', response);

      if (response.startsWith('```')) response = response.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();

      const ai = JSON.parse(response);
      console.log('✅ Parsed AI result:', ai);

      // Handle HP changes
      if (ai.hpChanges?.length) {
        console.log(`💔 Processing ${ai.hpChanges.length} HP changes:`, ai.hpChanges);
        const latestForHP = campaignRef.current;

        ai.hpChanges.forEach(change => {
          console.log(`  Looking for card: "${change.name}"`);
          const card = latestForHP.cards.find(c =>
            c.name.toLowerCase() === change.name.toLowerCase()
          );

          if (card && card.hp) {
            const delta = change.damage ? -change.damage : (change.healing || 0);
            const newCurrent = Math.max(0, Math.min(card.hp.max, card.hp.current + delta));
            console.log(`  ✅ ${card.name}: ${card.hp.current} → ${newCurrent} (${delta > 0 ? '+' : ''}${delta})`);
            updateCard(card.id, { hp: { ...card.hp, current: newCurrent } });
          } else if (card) {
            console.log(`  ⚠️ Found "${card.name}" but it has no HP (current HP: ${JSON.stringify(card.hp)})`);
          } else {
            console.log(`  ⚠️ Could not find any card matching: "${change.name}"`);
            console.log(`  Available cards:`, latestForHP.cards.map(c => c.name));
          }
        });
      }

      // Handle status changes
      if (ai.statusChanges?.length) {
        console.log(`🎭 Processing ${ai.statusChanges.length} status changes`);
        const latestForStatus = campaignRef.current;

        ai.statusChanges.forEach(change => {
          const card = latestForStatus.cards.find(c =>
            c.name.toLowerCase() === change.name.toLowerCase()
          );

          if (card) {
            let newStatus = [...(card.status || [])];

            if (change.addStatus) {
              change.addStatus.forEach(s => {
                if (!newStatus.includes(s)) {
                  newStatus.push(s);
                  console.log(`  ${card.name}: +${s}`);
                }
              });
            }

            if (change.removeStatus) {
              change.removeStatus.forEach(s => {
                newStatus = newStatus.filter(existing => existing !== s);
                console.log(`  ${card.name}: -${s}`);
              });
            }

            updateCard(card.id, { status: newStatus });
          } else {
            console.log(`  ⚠️ Could not find card: ${change.name}`);
          }
        });
      }

      // Handle events/milestones
      if (ai.events?.length) {
        console.log(`🎯 Recording ${ai.events.length} character events`);
        const latestForEvents = campaignRef.current;
        const currentSessions = latestForEvents.sessions || sessions;
        const session = currentSessions.find(s => s.id === currentSessionId);

        if (session) {
          const newEvents = ai.events.map(event => ({
            ...event,
            timestamp: new Date().toISOString(),
            id: `event-${Date.now()}-${Math.random().toString(36).substr(2,9)}`
          }));

          const updatedSessions = currentSessions.map(s =>
            s.id === currentSessionId
              ? { ...s, events: [...(s.events || []), ...newEvents] }
              : s
          );

          onUpdate({
            ...latestForEvents,
            sessions: updatedSessions,
            updatedAt: new Date().toISOString()
          });

          newEvents.forEach(evt => {
            console.log(`  📌 ${evt.character}: ${evt.type} - ${evt.detail}`);
          });
        }
      }

      // Handle card updates
      if (ai.cardUpdates?.length) {
        console.log(`🔄 Updating ${ai.cardUpdates.length} existing cards`);
        const latestForUpdates = campaignRef.current;

        ai.cardUpdates.forEach(update => {
          const existingCard = latestForUpdates.cards.find(c =>
            c.name.toLowerCase() === update.name.toLowerCase()
          );

          if (existingCard) {
            console.log(`  Updating "${existingCard.name}" with:`, update.updates);

            // Apply updates to existing card (don't merge notes, replace them)
            const updatedCard = {
              ...existingCard,
              ...update.updates
            };

            updateCard(existingCard.id, updatedCard);
          } else {
            console.log(`  ⚠️ Could not find card to update: ${update.name}`);
          }
        });
      }

      // Handle new cards
      if (ai.newCards?.length) {
        console.log(`➕ Creating new cards from ${ai.newCards.length} definitions`);

        // Get latest state again before creating cards
        const latestForCards = campaignRef.current;

        // Expand cards with count > 1 into multiple cards
        const expandedCards = ai.newCards.flatMap(c => {
          const count = c.count || 1;
          if (count > 1) {
            // Create multiple cards (e.g., "Orc 1", "Orc 2", "Orc 3")
            console.log(`  Expanding "${c.name}" into ${count} cards`);
            return Array.from({ length: count }, (_, i) => ({
              ...c,
              name: `${c.name} ${i + 1}`,
              count: undefined
            }));
          }
          return [{ ...c, count: undefined }];
        });

        // Batch create all new cards at once to avoid race conditions
        const newCardsToAdd = expandedCards
          .filter(c => {
            const isDuplicate = latestForCards.cards.some(x => x.name.toLowerCase() === c.name.toLowerCase());
            if (isDuplicate) {
              console.log('  Skipping duplicate:', c.name);
              return false;
            }
            console.log('  Will create card:', c.name);
            return true;
          })
          .map(c => ({
            ...c,
            id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            riffs: {},
            canonFacts: c.canonFacts || [],
            status: c.status || [],
            genesis: text,  // Store the transcript that created this card
            createdAt: new Date().toISOString(),
            inCombat: mode === 'combat' && (c.type === 'ENEMY' || c.type === 'CHARACTER') // Auto-add to combat if in combat mode
          }));

        if (newCardsToAdd.length > 0) {
          console.log(`  Adding ${newCardsToAdd.length} cards in batch`);
          onUpdate({
            ...latestForCards,
            cards: [...latestForCards.cards, ...newCardsToAdd],
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Handle combatants - add characters/enemies to combat view
      if (ai.combatants?.length) {
        console.log(`⚔️ Adding ${ai.combatants.length} combatants to combat view:`, ai.combatants);
        const latestForCombat = campaignRef.current;

        ai.combatants.forEach(name => {
          const card = latestForCombat.cards.find(c =>
            (c.type === 'CHARACTER' || c.type === 'ENEMY') && c.name.toLowerCase() === name.toLowerCase()
          );

          if (card && !card.inCombat) {
            console.log(`  ⚔️ Adding ${card.name} (${card.type}) to combat`);
            updateCard(card.id, { inCombat: true });
          } else if (!card) {
            console.log(`  ⚠️ Combatant not found: ${name}`);
          }
        });
      }

      if (!ai.newCards?.length && !ai.cardUpdates?.length && !ai.hpChanges?.length && !ai.statusChanges?.length) {
        console.log('ℹ️ No changes to make');
      }
      if (ai.modeSwitch) {
        console.log('🔄 Switching mode to:', ai.modeSwitch);
        setMode(ai.modeSwitch);
      }
    } catch (e) {
      console.error('❌ AI processing error:', e);
      console.error('Stack:', e.stack);
    }
    setProcessing(false);
  };

  const submit = () => { if (input.trim()) { processAI(input); setInput(''); } };

  // Combat view: split by hostility
  const combatParty = cards.filter(c => c.type === 'CHARACTER' && c.inCombat && !c.isHostile); // Party members and allies in combat
  const combatEnemies = cards.filter(c => c.type === 'CHARACTER' && c.inCombat && c.isHostile); // Hostile creatures in combat

  // Exploration view: show ALL characters not in combat
  const party = cards.filter(c => c.type === 'CHARACTER' && c.inParty); // Party members
  const npcs = cards.filter(c => c.type === 'CHARACTER' && !c.inParty && !c.inCombat); // NPCs/creatures not in party or combat
  const locations = cards.filter(c => c.type === 'LOCATION');
  const items = cards.filter(c => c.type === 'ITEM');
  const plots = cards.filter(c => c.type === 'PLOT');

  useEffect(() => { if (selected) { const u = cards.find(c => c.id === selected.id); if (u) setSelected(u); else setSelected(null); } }, [cards]);
  useEffect(() => { if (transcriptRef.current && transcriptOpen) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight; }, [transcript, transcriptOpen]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/80 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1">{Icons.back}</button>
            <h1 className="text-lg font-semibold text-white">{campaign.name}</h1>

            {/* Session Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">|</span>
              <select
                value={currentSessionId}
                onChange={(e) => setCurrentSessionId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                {sessions.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `Session ${i + 1}`} {s.endTime ? '(Archived)' : '(Active)'}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const newSession = {
                    id: `session-${Date.now()}`,
                    name: `Session ${sessions.length + 1}`,
                    startTime: new Date().toISOString(),
                    endTime: null,
                    transcript: [],
                    events: [],
                    isActive: true
                  };
                  const latest = campaignRef.current;
                  // Mark old sessions as inactive
                  const updatedSessions = (latest.sessions || sessions).map(s => ({ ...s, isActive: false }));
                  onUpdate({
                    ...latest,
                    sessions: [...updatedSessions, newSession],
                    updatedAt: new Date().toISOString()
                  });
                  setCurrentSessionId(newSession.id);
                }}
                className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 bg-slate-800 border border-slate-700 rounded"
                title="Start new session"
              >
                + New
              </button>
            </div>

            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 ml-2">
              <button onClick={() => setMode('exploration')} className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${mode === 'exploration' ? 'bg-violet-600 text-white' : 'text-slate-400'}`}>{Icons.exploration} Exploration</button>
              <button onClick={() => setMode('combat')} className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${mode === 'combat' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>{Icons.combat} Combat</button>
            </div>
            {processing && <span className="text-xs text-violet-400 animate-pulse">Processing...</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRoster(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span className="text-xs">Roster</span>
            </button>
            <button onClick={() => setShowArc(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-white">{Icons.book} <span className="text-xs">Arc</span></button>
            <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-white">{Icons.transcript} <span className="text-xs">Report</span></button>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-white">{Icons.settings} <span className="text-xs">Settings</span></button>
          </div>
        </div>
      </header>

      <div className="p-4 pb-40">
        {mode === 'combat' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">{Icons.party} Party</h2>
                <button onClick={() => setCreateModalType('CHARACTER')} className="p-1 rounded hover:bg-slate-700/50 text-emerald-400 hover:text-emerald-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {combatParty.length === 0 ? (
                  <div className="text-slate-600 text-xs italic p-3 border border-dashed border-slate-700 rounded-lg text-center">No party members in combat</div>
                ) : (
                  combatParty.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onQuickHP={quickHP} onDelete={deleteCard} onReorder={reorderCards} isInCombat />)
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">{Icons.enemy} Enemies</h2>
                <button onClick={() => setCreateModalType('ENEMY')} className="p-1 rounded hover:bg-slate-700/50 text-red-400 hover:text-red-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {combatEnemies.length === 0 ? <div className="text-slate-600 text-xs italic p-3 border border-dashed border-slate-700 rounded-lg text-center">No enemies in combat</div>
                  : combatEnemies.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onQuickHP={quickHP} onDelete={deleteCard} onReorder={reorderCards} isInCombat />)}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-violet-400 flex items-center gap-1.5">{Icons.character} Characters</h2>
                <button onClick={() => setCreateModalType('CHARACTER')} className="p-1 rounded hover:bg-slate-700/50 text-violet-400 hover:text-violet-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {[...party, ...npcs].length === 0 ? (
                  <div className="text-slate-600 text-xs italic p-3 border border-dashed border-slate-700 rounded-lg text-center">No characters</div>
                ) : (
                  [...party, ...npcs].map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onQuickHP={quickHP} onDelete={deleteCard} onReorder={reorderCards} isInCombat={false} />)
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-cyan-400 flex items-center gap-1.5">{Icons.location} Locations</h2>
                <button onClick={() => setCreateModalType('LOCATION')} className="p-1 rounded hover:bg-slate-700/50 text-cyan-400 hover:text-cyan-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {locations.length === 0 ? <div className="text-slate-600 text-xs italic p-3 border border-dashed border-slate-700 rounded-lg text-center">No locations</div>
                  : locations.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onDelete={deleteCard} onReorder={reorderCards} isInCombat={false} />)}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">{Icons.item} Items</h2>
                <button onClick={() => setCreateModalType('ITEM')} className="p-1 rounded hover:bg-slate-700/50 text-amber-400 hover:text-amber-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? <div className="text-slate-600 text-xs italic p-3 border border-dashed border-slate-700 rounded-lg text-center">No items</div>
                  : items.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onDelete={deleteCard} onReorder={reorderCards} isInCombat={false} />)}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-pink-400 flex items-center gap-1.5">{Icons.plot} Plot</h2>
                <button onClick={() => setCreateModalType('PLOT')} className="p-1 rounded hover:bg-slate-700/50 text-pink-400 hover:text-pink-300">
                  {Icons.plus}
                </button>
              </div>
              <div className="space-y-2">
                {plots.length === 0 ? <div className="text-slate-600 text-xs italic p-3 border border-dashed border-slate-700 rounded-lg text-center">No plot threads</div>
                  : plots.map(c => <CompactCard key={c.id} card={c} onClick={() => setSelected(c)} onDelete={deleteCard} onReorder={reorderCards} isInCombat={false} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        <div className="max-w-4xl mx-auto space-y-2">
          <AudioPanel settings={settings} onProcess={processAI} isProcessing={processing} />
          <div className={`bg-slate-900/80 rounded-lg border border-slate-700 transition-all ${transcriptOpen ? 'h-96' : 'h-10'}`}>
            <button onClick={() => setTranscriptOpen(!transcriptOpen)} className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 border-b border-slate-700">
              <span className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${transcript.length > 0 ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                {Icons.transcript} Transcript ({transcript.length} entries)
              </span>
              <span className="text-[10px]">{transcriptOpen ? 'Hide ▼' : 'Show ▲'}</span>
            </button>
            {transcriptOpen && (
              <div ref={transcriptRef} className="px-3 py-3 overflow-y-auto overflow-x-hidden" style={{ maxHeight: '350px' }}>
                {transcript.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No transcript yet. Start speaking or typing to begin.</p>
                ) : (
                  <div className="space-y-3">
                    {transcript.map((e, i) => (
                      <div key={i} className="text-xs border-l-2 border-slate-700 pl-3 py-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold ${e.speaker === 'DM' ? 'text-violet-400' : 'text-cyan-400'}`}>{e.speaker}</span>
                          <span className="text-slate-600 text-[10px]">{e.timestamp}</span>
                        </div>
                        <div className="text-slate-300 leading-relaxed">{e.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !processing && submit()}
              placeholder="DM: As you enter..." disabled={processing}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
            <Button variant="primary" onClick={submit} disabled={processing || !input.trim()}>{processing ? '...' : 'Send'}</Button>
          </div>
        </div>
      </div>

      <DetailDrawer card={selected} isOpen={!!selected} onClose={() => setSelected(null)} onUpdate={updateCard} onDelete={deleteCard} onGenerateRiff={genRiffFn} isGenerating={genRiff} onGetCharacterEvents={getCharacterEvents} />
      <CreateCardModal isOpen={!!createModalType} onClose={() => setCreateModalType(null)} onCreate={addCard} cardType={createModalType} />
      <PlayerRosterModal
        isOpen={showRoster}
        onClose={() => setShowRoster(false)}
        playerRoster={playerRoster}
        onSave={(roster) => {
          const latest = campaignRef.current;
          onUpdate({ ...latest, playerRoster: roster, updatedAt: new Date().toISOString() });
        }}
      />
      <ArcModal
        isOpen={showArc}
        onClose={() => setShowArc(false)}
        arc={dmContext}
        onSave={(arc) => {
          const latest = campaignRef.current;
          onUpdate({ ...latest, dmContext: arc, updatedAt: new Date().toISOString() });
        }}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSaveSettings={onSaveSettings}
      />
      <SessionReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        session={currentSession}
        cards={cards}
        settings={settings}
        onGenerateReport={generateReport}
      />
    </div>
  );
};

// Main App (without error boundary)
function AppCore() {
  const [campaigns, setCampaigns, campaignsLoaded] = useStorage('dm-hud-campaigns', []);
  const [settings, setSettings, settingsLoaded] = useStorage('dm-hud-settings', {});
  const [activeId, setActiveId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const active = campaigns.find(c => c.id === activeId);

  const create = (name) => {
    const firstSession = {
      id: `session-${Date.now()}`,
      name: 'Session 1',
      startTime: new Date().toISOString(),
      endTime: null,
      transcript: [],
      events: [], // Character events: rolls, checks, discoveries, etc.
      isActive: true
    };
    const nc = {
      id: `campaign-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dmContext: '',
      cards: [], // Campaign-level persistent cards
      sessions: [firstSession],
      playerRoster: [] // {playerName, characterName, characterId, aliases: []}
    };
    setCampaigns([...campaigns, nc]);
    setActiveId(nc.id);
  };

  const del = (id) => { setCampaigns(campaigns.filter(c => c.id !== id)); if (activeId === id) setActiveId(null); };
  const update = (updated) => setCampaigns(campaigns.map(c => c.id === updated.id ? updated : c));
  const saveDmContext = (ctx) => { if (active) update({ ...active, dmContext: ctx }); };

  if (!campaignsLoaded || !settingsLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>;

  return (
    <>
      {active ? (
        <CampaignView campaign={active} onUpdate={update} onBack={() => setActiveId(null)} settings={settings} onSaveSettings={setSettings} />
      ) : (
        <CampaignsHome campaigns={campaigns} onSelect={setActiveId} onCreate={create} onDelete={del} settings={settings} onOpenSettings={() => setShowSettings(true)} />
      )}
    </>
  );
}

// Wrapped export with error boundary
export default function App() {
  return (
    <ErrorBoundary>
      <AppCore />
    </ErrorBoundary>
  );
}
