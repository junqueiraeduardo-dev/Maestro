// ui.jsx — Shared UI components for Maestro (dark industrial CMMS)

// =========================================================================
// Design tokens (mirror the spec)
// =========================================================================
const M = {
  bg:        '#0F1117',   // levemente mais quente que cinza-puro: dá vida ao dark
  surface:   '#161B22',
  surface2:  '#1B222C',
  border:    '#1E2A3A',
  borderHi:  '#2A3A50',
  amber:     '#F59E0B',
  amberDim:  '#B4730A',
  green:     '#10B981',
  red:       '#EF4444',
  redDim:    '#8C2A2A',
  text:      '#F1F5F9',
  textDim:   '#94A3B8',
  textMute:  '#64748B',
};

// =========================================================================
// Lucide-style icons (inlined SVG paths; stroke=1.75, round caps)
// =========================================================================
function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 2, style }) {
  const P = {
    'home':        <><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5Z"/></>,
    'box':         <><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/><path d="m7.5 5.5 9 5"/></>,
    'wrench':      <><path d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2 2 0 0 1-2.8-2.8L17 8.5a4 4 0 0 1-2.3-2.2Z"/><circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none"/></>,
    'truck':       <><path d="M3 7.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V16H3z"/><path d="M14 10h4l3 3.2V16h-7"/><path d="M3 11h11"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 13h2"/></>,
    'list-checks': <><path d="M3 6h2l1 1 2-2"/><path d="M3 12h2l1 1 2-2"/><path d="M3 18h2l1 1 2-2"/><path d="M11 6h10"/><path d="M11 12h10"/><path d="M11 18h10"/></>,
    'chart':       <><path d="M3 3v18h18"/><path d="M7 14v4"/><path d="M12 9v9"/><path d="M17 5v13"/></>,
    'mic':         <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M9 21h6"/><path d="M11 6h2"/><path d="M11 9h2"/></>,
    'mic-off':     <><path d="M2 2l20 20"/><path d="M9 9v3a3 3 0 0 0 5.1 2.1"/><path d="M15 9.3V6a3 3 0 0 0-5.7-1.3"/><path d="M5 11a7 7 0 0 0 11 5.5"/></>,
    'search':      <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    'pin':         <><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></>,
    'bell':        <><path d="M6 9a6 6 0 0 1 12 0c0 4.5 1 5.5 2 7H4c1-1.5 2-2.5 2-7Z"/><path d="M10 19a2 2 0 0 0 4 0"/><path d="M10.5 3.5a2 2 0 0 1 3 0"/></>,
    'sparkles':    <><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="m5.6 5.6 2.1 2.1"/><path d="m16.3 16.3 2.1 2.1"/><path d="m5.6 18.4 2.1-2.1"/><path d="m16.3 7.7 2.1-2.1"/></>,
    'plus':        <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    'arrow-left':  <><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>,
    'chevron-r':   <><path d="m9 6 6 6-6 6"/></>,
    'chevron-d':   <><path d="m6 9 6 6 6-6"/></>,
    'clock':       <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    'play':        <><path d="M6 4v16l14-8Z"/></>,
    'pause':       <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    'check':       <><path d="m5 12 5 5L20 7"/></>,
    'x':           <><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>,
    'arrow-down':  <><path d="M12 5v14"/><path d="m5 12 7 7 7-7"/></>,
    'arrow-up':    <><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></>,
    'alert':       <><path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5"/><path d="M12 18v.5"/></>,
    'user':        <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    'filter':      <><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></>,
    'camera':      <><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/></>,
    'arrow-up-r':  <><path d="M7 17 17 7"/><path d="M9 7h8v8"/></>,
    'arrow-down-r':<><path d="M7 7l10 10"/><path d="M17 9v8H9"/></>,
    'message':     <><path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1-5a8 8 0 1 1 17-6Z"/></>,
    'flag':        <><path d="M4 21V4"/><path d="M4 4h13l-2 4 2 4H4"/></>,
    'package':     <><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M3 8v8l9 5 9-5V8"/></>,
    'circle':      <><circle cx="12" cy="12" r="9"/></>,
    'circle-dot':  <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></>,
    'history':     <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
    'gauge':       <><path d="M12 14v-4"/><path d="m17 9-3 3"/><path d="M4 18a8 8 0 1 1 16 0"/></>,
    'fuel':        <><path d="M3 21h11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16Z"/><path d="M3 12h11"/><path d="M14 8h2l2 2v8a2 2 0 0 0 4 0v-7l-4-4"/></>,
    'tool':        <><path d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2 2 0 0 1-2.8-2.8L17 8.5a4 4 0 0 1-2.3-2.2Z"/></>,
    'settings':    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    'sprout':      <><path d="M12 21v-9"/><path d="M12 12C12 8.5 9.5 6 5.5 6 5.5 9.5 8 12 12 12Z"/><path d="M12 12c0-3 2.2-5 5.5-5 0 3-2.2 5-5.5 5Z"/></>,
    'briefcase':   <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></>,
    'car':         <><path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11"/><rect x="3" y="11" width="18" height="6" rx="1.5"/><circle cx="7.5" cy="17.5" r="1.9"/><circle cx="16.5" cy="17.5" r="1.9"/></>,
    'clipboard':   <><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4"/><path d="M9 11h6"/><path d="M9 15h6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round" style={style}>
      {P[name] || <circle cx="12" cy="12" r="9"/>}
    </svg>
  );
}

// =========================================================================
// Status pill (operational / maintenance / stopped) — colored dot
// =========================================================================
function StatusDot({ status, size = 12, withRing = false }) {
  const c = status === 'operacional' ? M.green : status === 'manutencao' ? M.amber : M.red;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: c, display: 'inline-block', flexShrink: 0,
      boxShadow: withRing ? `0 0 0 4px ${c}22` : 'none',
    }}/>
  );
}

// =========================================================================
// Tag / Badge
// =========================================================================
function Tag({ children, tone = 'neutral', mono = false, size = 'sm' }) {
  const palette = {
    neutral: { bg: '#1E2A3A',  fg: M.text },
    amber:   { bg: '#3B2A0E',  fg: M.amber },
    green:   { bg: '#0E2B23',  fg: M.green },
    red:     { bg: '#2B1318',  fg: '#FCA5A5' },
    ghost:   { bg: 'transparent', fg: M.textDim, border: `1px solid ${M.border}` },
  }[tone];
  const sz = size === 'lg' ? { fs: 13, py: 6, px: 10 } : { fs: 11, py: 4, px: 8 };
  return (
    <span style={{
      background: palette.bg, color: palette.fg,
      border: palette.border || 'none',
      fontSize: sz.fs, fontWeight: 600, padding: `${sz.py}px ${sz.px}px`,
      borderRadius: 6, letterSpacing: 0.2, lineHeight: 1,
      fontFamily: mono ? "'JetBrains Mono', monospace" : 'Inter, sans-serif',
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// =========================================================================
// Card — surface container
// =========================================================================
function Card({ children, padding = 16, onClick, style, accentColor }) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      onMouseDown={clickable ? (e) => {
        e.currentTarget.style.transform = 'translateY(1px) scale(0.99)';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.35) inset';
      } : undefined}
      onMouseUp={clickable ? (e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      } : undefined}
      onMouseLeave={clickable ? (e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      } : undefined}
      style={{
        background: M.surface,
        border: `1px solid ${M.border}`,
        borderRadius: 12,
        padding,
        position: 'relative',
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform .14s ease, box-shadow .2s ease, border-color .2s ease',
        ...style,
      }}>
      {accentColor && (
        <span style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4, background: accentColor,
        }}/>
      )}
      {children}
    </div>
  );
}

// =========================================================================
// Buttons
// =========================================================================
function Btn({ children, variant = 'primary', onClick, icon, full = false, size = 'md', disabled }) {
  const sz = size === 'lg' ? { h: 56, fs: 17, px: 20 } : size === 'sm' ? { h: 36, fs: 13, px: 12 } : { h: 48, fs: 15, px: 16 };
  const styles = {
    primary:    { bg: M.amber,    fg: '#0E1117', border: 'none' },
    destruct:   { bg: M.red,      fg: '#fff',    border: 'none' },
    ghost:      { bg: 'transparent', fg: M.text, border: `1px solid ${M.border}` },
    'ghost-amber': { bg: 'transparent', fg: M.amber, border: `1px solid ${M.amber}55` },
  }[variant];
  const isPrimary = variant === 'primary';
  return (
    <>
      {isPrimary && (
        <style>{`
          @keyframes maestro-btn-sheen {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(220%); }
          }
        `}</style>
      )}
      <button disabled={disabled} onClick={onClick} style={{
        position: 'relative', overflow: 'hidden',
        height: sz.h, fontSize: sz.fs, padding: `0 ${sz.px}px`,
        background: styles.bg, color: styles.fg, border: styles.border,
        borderRadius: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: full ? '100%' : 'auto', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, letterSpacing: 0.2,
        boxShadow: isPrimary && !disabled ? `0 6px 16px -6px ${M.amber}66` : 'none',
        transition: 'transform .12s ease, filter .15s ease, box-shadow .2s ease',
      }}
      onMouseEnter={(e) => { if (isPrimary && !disabled) e.currentTarget.style.boxShadow = `0 10px 22px -6px ${M.amber}99`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)';
        if (isPrimary && !disabled) e.currentTarget.style.boxShadow = `0 6px 16px -6px ${M.amber}66`; }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
        {icon && <Icon name={icon} size={18}/>}
        <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
        {isPrimary && !disabled && (
          <span style={{
            position: 'absolute', top: 0, bottom: 0, width: '38%',
            background: 'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.42) 50%, transparent 100%)',
            animation: 'maestro-btn-sheen 2.6s ease-in-out infinite',
            pointerEvents: 'none',
          }}/>
        )}
      </button>
    </>
  );
}

// =========================================================================
// Section header (used inside scrollable screens)
// =========================================================================
function SectionHeader({ children, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 4px 8px',
    }}>
      <h3 style={{
        margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: 1.2,
        color: M.textDim, textTransform: 'uppercase',
      }}>{children}</h3>
      {right}
    </div>
  );
}

// =========================================================================
// Top app bar (per screen)
// =========================================================================
function TopBar({ title, onBack, right, mono = false, subtitle }) {
  return (
    <div style={{
      padding: '12px 16px 12px',
      borderBottom: `1px solid ${M.border}`,
      display: 'flex', alignItems: 'center', gap: 12,
      background: M.bg, position: 'sticky', top: 0, zIndex: 10,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 40, height: 40, border: 'none', background: 'transparent',
          color: M.text, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '-8px 0 -8px -8px',
        }}>
          <Icon name="arrow-left" size={22}/>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 17, fontWeight: 700,
          letterSpacing: mono ? 0.8 : -0.2,
          color: M.text, lineHeight: 1.2,
          fontFamily: mono
            ? "'JetBrains Mono', monospace"
            : "'Space Grotesk', 'Inter', sans-serif",
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: M.textDim, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}

// =========================================================================
// Bottom tab bar (5 items)
// =========================================================================
const TABS = [
  { id: 'home',   label: 'Início',       icon: 'home' },
  { id: 'parts',  label: 'Almoxarifado', icon: 'box' },
  { id: 'os',     label: 'OS',           icon: 'wrench' },
  { id: 'equip',  label: 'Equipamentos', icon: 'truck' },
  { id: 'dash',   label: 'Dashboard',    icon: 'chart' },
];

function BottomTabBar({ active, onChange }) {
  return (
    <div style={{
      background: M.surface, borderTop: `1px solid ${M.border}`,
      padding: '8px 4px 12px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
      position: 'relative', flexShrink: 0,
    }}>
      {TABS.map((t, i) => {
        const isActive = t.id === active;
        const isCenter = i === 2;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              padding: '6px 0', minHeight: 56, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: isActive ? M.amber : M.textDim,
              opacity: isCenter ? 0 : 1, pointerEvents: isCenter ? 'none' : 'auto',
            }}>
            <Icon name={t.icon} size={24} strokeWidth={isActive ? 2.2 : 1.75}/>
            <span style={{
              fontSize: 10.5, fontWeight: isActive ? 700 : 500, letterSpacing: 0.2,
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// =========================================================================
// Microphone FAB (sits above tab bar, center)
// =========================================================================
function MicFAB({ state, onPress }) {
  // state: 'idle' | 'listening' | 'thinking'
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  return (
    <>
      <style>{`
        @keyframes maestro-pulse {
          0%   { box-shadow: 0 0 0 0 ${M.amber}88, 0 0 0 0 ${M.amber}55; }
          70%  { box-shadow: 0 0 0 18px ${M.amber}00, 0 0 0 30px ${M.amber}00; }
          100% { box-shadow: 0 0 0 0 ${M.amber}00, 0 0 0 0 ${M.amber}00; }
        }
        @keyframes maestro-spin { to { transform: rotate(360deg); } }
        @keyframes maestro-mic-idle {
          0%,100% { box-shadow: 0 8px 24px -4px ${M.amber}66, 0 4px 12px rgba(0,0,0,0.5); }
          50%     { box-shadow: 0 10px 30px -2px ${M.amber}88, 0 4px 14px rgba(0,0,0,0.55); }
        }
      `}</style>
      {/* Anel orbital — só quando está ouvindo, dá "campo de força" sutil */}
      {isListening && (
        <>
          <span style={{
            position: 'absolute', bottom: 70, left: '50%',
            width: 64, height: 64, borderRadius: '50%',
            border: `2px solid ${M.amber}`,
            pointerEvents: 'none', zIndex: 49,
            animation: 'maestro-orbit 1.8s ease-out infinite',
          }}/>
          <span style={{
            position: 'absolute', bottom: 70, left: '50%',
            width: 64, height: 64, borderRadius: '50%',
            border: `2px solid ${M.amber}`,
            pointerEvents: 'none', zIndex: 49,
            animation: 'maestro-orbit 1.8s ease-out .9s infinite',
          }}/>
        </>
      )}
      <button onClick={onPress}
        aria-label="Microfone"
        style={{
          position: 'absolute',
          bottom: 38, left: '50%',
          transform: `translateX(-50%) scale(${isListening ? 1.1 : 1})`,
          width: 64, height: 64, borderRadius: '50%',
          background: isThinking
            ? `conic-gradient(${M.amber} 0%, ${M.amber}55 50%, ${M.amber} 100%)`
            : `radial-gradient(circle at 35% 30%, #FFC76A 0%, ${M.amber} 60%, ${M.amberDim} 100%)`,
          border: `3px solid ${M.bg}`,
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isListening
            ? `0 0 0 0 ${M.amber}88`
            : `0 8px 24px -4px ${M.amber}66, 0 4px 12px rgba(0,0,0,0.5)`,
          transition: 'transform .2s ease, box-shadow .2s ease, background .2s ease',
          animation: isListening ? 'maestro-pulse 1.4s infinite'
            : isThinking ? 'maestro-spin 1.2s linear infinite'
            : 'maestro-mic-idle 3.4s ease-in-out infinite',
          zIndex: 50,
        }}>
        <Icon name="mic" size={28} strokeWidth={2.2} color="#fff"
          style={{ animation: isThinking ? 'maestro-spin 1.2s linear reverse infinite' : 'none' }}/>
      </button>
    </>
  );
}

// =========================================================================
// Empty state
// =========================================================================
function EmptyState({ icon = 'box', title, body, action, onAction }) {
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: M.border, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={36} color={M.textDim}/>
      </div>
      <div style={{ maxWidth: 240 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: M.text, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: M.textDim, lineHeight: 1.5 }}>{body}</div>
      </div>
      {action && <Btn onClick={onAction}>{action}</Btn>}
    </div>
  );
}

// =========================================================================
// Toast (top sliding)
// =========================================================================
function Toast({ toast }) {
  if (!toast) return null;
  const tone = toast.tone || 'success';
  const palette = {
    success: { bg: '#0F2E25', fg: M.green,  border: M.green,  icon: 'check' },
    error:   { bg: '#2E1418', fg: '#FCA5A5', border: M.red,   icon: 'alert' },
    warn:    { bg: '#2E2410', fg: M.amber,  border: M.amber, icon: 'alert' },
  }[tone];
  return (
    <div style={{
      position: 'absolute', top: 14, left: '50%',
      transform: 'translateX(-50%)',
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.border}55`,
      borderLeft: `3px solid ${palette.border}`,
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      maxWidth: 340, zIndex: 100,
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      animation: 'maestro-toast-in .3s ease',
      fontSize: 14, fontWeight: 500,
    }}>
      <style>{`
        @keyframes maestro-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <Icon name={palette.icon} size={20}/>
      <span>{toast.msg}</span>
    </div>
  );
}

// =========================================================================
// Bottom sheet
// =========================================================================
function BottomSheet({ open, onClose, children, peek = false }) {
  return (
    <>
      <style>{`
        @keyframes maestro-sheet-in {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes maestro-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
      {open && (
        <div onClick={onClose}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 90, animation: 'maestro-backdrop-in .25s ease',
            backdropFilter: 'blur(2px)',
          }}/>
      )}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: M.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTop: `1px solid ${M.border}`,
        zIndex: 95,
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform .42s cubic-bezier(.34,1.56,.64,1)',
        maxHeight: '78%', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
      }}>
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{
            width: 40, height: 4, borderRadius: 2, background: M.borderHi,
          }}/>
        </div>
        <div style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </div>
      </div>
    </>
  );
}

// =========================================================================
// Waveform — animated bars during listening
// =========================================================================
function Waveform({ bars = 28 }) {
  return (
    <>
      <style>{`
        @keyframes maestro-wave {
          0%, 100% { transform: scaleY(0.25); }
          50%      { transform: scaleY(1); }
        }
      `}</style>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 4, height: 56,
      }}>
        {Array.from({ length: bars }).map((_, i) => {
          const seed = (i * 37) % 100;
          const dur = 0.6 + (seed % 40) / 100;
          const delay = -((seed % 80) / 100);
          return (
            <span key={i} style={{
              width: 3, height: '100%',
              background: M.amber, borderRadius: 4,
              animation: `maestro-wave ${dur}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }}/>
          );
        })}
      </div>
    </>
  );
}

// =========================================================================
// Logo — monograma de 5 barras (um "M" implícito + waveform de áudio).
// Mesmas proporções da especificação: alturas 30·100·55·100·30,
// fundo âmbar, barras grafite. `animated` reaproveita a animação de
// "escutando". `word` mostra o lockup horizontal com "MAESTRO".
// =========================================================================
const LOGO_BARS = [30, 100, 55, 100, 30];

function Logo({ size = 32, animated = false, word = false, wordColor }) {
  const mono = (
    <>
      <style>{`
        @keyframes maestro-logo {
          0%, 100% { transform: scaleY(1); }
          50%      { transform: scaleY(0.35); }
        }
      `}</style>
      <div style={{
        width: size, height: size, flexShrink: 0,
        background: M.amber, borderRadius: size * 0.14,
        padding: `${size * 0.25}px ${size * 0.18}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: size * 0.06,
      }}>
        {LOGO_BARS.map((h, i) => (
          <span key={i} style={{
            flex: 1, height: `${h}%`,
            background: '#0E1117', borderRadius: Math.max(1, size * 0.04),
            transformOrigin: 'center',
            animation: animated ? 'maestro-logo 1.1s ease-in-out infinite' : 'none',
            animationDelay: animated ? `${i * 0.18}s` : undefined,
          }}/>
        ))}
      </div>
    </>
  );
  if (!word) return mono;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.45 }}>
      {mono}
      <span style={{
        fontFamily: 'Inter, sans-serif', fontWeight: 800,
        fontSize: size * 0.82, letterSpacing: -0.5, lineHeight: 1,
        color: wordColor || M.text, whiteSpace: 'nowrap',
      }}>MAESTRO</span>
    </div>
  );
}

// =========================================================================
// AnimatedList — entrada em cascata (fade + slide), inspirada no reactbits.
// Sem framer-motion (mantém o zero-build): CSS keyframes + stagger.
// =========================================================================
function AnimatedList({ children, gap = 10, step = 55 }) {
  const items = React.Children.toArray(children);
  return (
    <>
      <style>{`
        @keyframes maestro-al-in {
          from { opacity: 0; transform: translateY(10px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {items.map((c, i) => (
          <div key={c.key != null ? c.key : i} style={{
            animation: 'maestro-al-in .42s cubic-bezier(.22,.9,.3,1.1) both',
            animationDelay: `${Math.min(i, 12) * step}ms`,
          }}>{c}</div>
        ))}
      </div>
    </>
  );
}

// =========================================================================
// CountUp — anima de 0 ao alvo. Dá "vida" a KPIs (anti AI-flat).
// Easing easeOutCubic em ~700ms (faixa boa entre informativo e elegante).
// =========================================================================
function CountUp({ to, duration = 700, prefix = "", suffix = "" }) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const alvo = Number(to) || 0;
    if (alvo === 0) { setV(0); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic
      setV(Math.round(alvo * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span className="num">{prefix}{v}{suffix}</span>;
}

// =========================================================================
// RouteFade — transição entre telas com mola sutil (mais perceptível).
// =========================================================================
function RouteFade({ keyId, children }) {
  return (
    <>
      <style>{`
        @keyframes maestro-route-in {
          0%   { opacity: 0; transform: translateY(14px) scale(.985); }
          60%  { opacity: 1; transform: translateY(-2px) scale(1.003); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div key={keyId} style={{
        animation: 'maestro-route-in .42s cubic-bezier(.34,1.56,.64,1) both',
        height: '100%',
      }}>{children}</div>
    </>
  );
}

// =========================================================================
// Skeleton — placeholder com shimmer. Substitui o spinner triste.
// Use <Skeleton h={64}/> ou <SkeletonList rows={3}/>.
// =========================================================================
function Skeleton({ h = 16, w = '100%', radius = 8, style }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: `linear-gradient(90deg, ${M.surface} 0%, ${M.surface2} 50%, ${M.surface} 100%)`,
      backgroundSize: '200% 100%',
      animation: 'maestro-shimmer 1.4s ease-in-out infinite',
      ...style,
    }}/>
  );
}
function SkeletonList({ rows = 3, h = 84, gap = 10 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} h={h} radius={12}/>
      ))}
    </div>
  );
}

// =========================================================================
// Stamp — selo "carimbo" levemente rotacionado. Detalhe editorial.
// Para usar em OS concluída, etc. (anti card-genérico de IA).
// =========================================================================
function Stamp({ children, cor = M.green, rot = -6 }) {
  return (
    <span style={{
      display: 'inline-block', transform: `rotate(${rot}deg)`,
      border: `2px solid ${cor}`, color: cor,
      padding: '4px 10px', borderRadius: 6,
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 700, fontSize: 12, letterSpacing: 2,
      textTransform: 'uppercase', background: 'transparent',
      boxShadow: `inset 0 0 0 1px ${cor}33`,
    }}>{children}</span>
  );
}

Object.assign(window, {
  M, Icon, StatusDot, Tag, Card, Btn, SectionHeader, TopBar,
  BottomTabBar, MicFAB, EmptyState, Toast, BottomSheet, Waveform, Logo,
  AnimatedList, CountUp, RouteFade, Stamp, Skeleton, SkeletonList, TABS,
});
