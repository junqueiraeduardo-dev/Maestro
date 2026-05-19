// screens.jsx — 7 Maestro screens

const { useState, useEffect, useMemo } = React;

// Spinner de carregamento de tela (dados vindos do backend real)
function ScreenLoader({ label = 'Carregando…' }) {
  return (
    <div style={{
      padding: '64px 24px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 16,
    }}>
      <style>{`@keyframes msp { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        border: `3px solid ${M.border}`, borderTopColor: M.amber,
        animation: 'msp .8s linear infinite',
      }}/>
      <div style={{ fontSize: 13, color: M.textDim }}>{label}</div>
    </div>
  );
}

// Mini-feedback efêmero dentro de uma tela (sem depender do Toast global)
function useFlash() {
  const [msg, setMsg] = useState(null);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2600); };
  const node = msg ? (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 92, zIndex: 30,
      background: '#0F2E25', color: M.green, border: `1px solid ${M.green}55`,
      borderLeft: `3px solid ${M.green}`, borderRadius: 10,
      padding: '12px 14px', fontSize: 13, fontWeight: 600,
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    }}>{msg}</div>
  ) : null;
  return [flash, node];
}

// =========================================================================
// SCREEN 1 — HOME
// =========================================================================
function HomeScreen({ nav, openMic, onLogout }) {
  return (
    <div data-screen-label="01 Home" style={{ paddingBottom: 110 }}>
      {/* Header row */}
      <div style={{
        padding: '18px 16px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Logo size={30} word/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{
            position: 'relative', width: 40, height: 40, borderRadius: 10,
            background: M.surface, border: `1px solid ${M.border}`,
            color: M.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="bell" size={20}/>
            <span style={{
              position: 'absolute', top: 8, right: 9,
              width: 8, height: 8, borderRadius: '50%',
              background: M.red, border: `2px solid ${M.surface}`,
            }}/>
          </button>
          <button
            onClick={() => { if (onLogout && confirm('Sair da conta?')) onLogout(); }}
            title="Sair"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #475569, #1E293B)',
              color: M.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, border: `1px solid ${M.border}`,
              cursor: 'pointer',
            }}>CS</button>
        </div>
      </div>

      {/* Greeting */}
      <div style={{ padding: '8px 16px 20px' }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700, color: M.text,
          lineHeight: 1.25, letterSpacing: -0.3,
        }}>Olá, Carlos</h1>
        <div style={{ fontSize: 13, color: M.textDim, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Seg · 19/05</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <Icon name="pin" size={13}/>
          <span>Oficina Central</span>
        </div>
      </div>

      {/* Module grid */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ModuleCard icon="box" title="Almoxarifado" badge={{ text: '47 itens', tone: 'neutral' }}
          onClick={() => nav.go('parts')} />
        <ModuleCard icon="wrench" title="Ordens de Serviço" badge={{ text: '3 abertas', tone: 'amber' }}
          onClick={() => nav.go('os')} />
        <ModuleCard icon="truck" title="Equipamentos" badge={{ text: '12 ativos', tone: 'neutral' }}
          onClick={() => nav.go('equip')} />
        <ModuleCard icon="list-checks" title="Inspeção do Dia" badge={{ text: '2 pendentes', tone: 'red' }}
          onClick={() => {}} />
      </div>

      {/* Wide Dashboard card */}
      <div style={{ padding: '12px 16px 0' }}>
        <Card onClick={() => nav.go('dash')} padding={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: 'linear-gradient(135deg, #3B2A0E, #1B222C)',
              border: `1px solid ${M.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: M.amber,
            }}>
              <Icon name="chart" size={28}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: M.text }}>Dashboard</div>
              <div style={{ fontSize: 12, color: M.textDim, marginTop: 4 }}>
                Custo, OS por semana e alertas críticos
              </div>
            </div>
            <Icon name="chevron-r" size={20} color={M.textDim}/>
          </div>
        </Card>
      </div>

      {/* Quick voice hint */}
      <div style={{ padding: '20px 16px 0' }}>
        <Card padding={14} style={{ background: M.surface2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Icon name="mic" size={16} color={M.amber}/>
            <div style={{ fontSize: 12, fontWeight: 700, color: M.amber, letterSpacing: 0.5 }}>
              ATALHO POR VOZ
            </div>
          </div>
          <div style={{ fontSize: 13, color: M.textDim, lineHeight: 1.55 }}>
            Toque no microfone e fale.<br/>
            <span style={{ color: M.text }}>"abre OS-1042"</span> · <span style={{ color: M.text }}>"onde está o rolamento 6205"</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ModuleCard({ icon, title, badge, onClick }) {
  const badgePalette = {
    neutral: { bg: '#0E1117', fg: M.textDim, border: M.border },
    amber:   { bg: '#3B2A0E', fg: M.amber,   border: '#3B2A0E' },
    red:     { bg: '#2B1318', fg: '#FCA5A5', border: '#2B1318' },
  }[badge.tone];
  return (
    <Card onClick={onClick} padding={16} style={{ minHeight: 124 }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: M.surface2, border: `1px solid ${M.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: M.text, marginBottom: 12,
        }}>
          <Icon name={icon} size={24} color={M.amber}/>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: M.text, lineHeight: 1.3, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: badgePalette.bg, color: badgePalette.fg,
            border: `1px solid ${badgePalette.border}`,
            fontSize: 11, fontWeight: 600, padding: '4px 8px',
            borderRadius: 6, letterSpacing: 0.2,
          }}>{badge.text}</span>
        </div>
      </div>
    </Card>
  );
}

// =========================================================================
// SCREEN 2 — ALMOXARIFADO (parts by voice)
// =========================================================================
function PartsScreen({ nav, openMic }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);   // null = sem busca; [] = vazio
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null); // null | 'nova' | {edit:peca}
  const [flash, flashNode] = useFlash();

  // busca real com debounce (não martela o backend a cada tecla)
  useEffect(() => {
    const termo = q.trim();
    if (!termo) { setRes(null); setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(() => {
      API.pecaSearch(termo)
        .then(r => setRes(r.pecas || []))
        .catch(() => setRes([]))
        .finally(() => setBusy(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  function recarregarBusca() {
    if (!q.trim()) return;
    API.pecaSearch(q.trim()).then(r => setRes(r.pecas || [])).catch(() => {});
  }

  return (
    <div data-screen-label="02 Almoxarifado" style={{ paddingBottom: 120 }}>
      <TopBar title="ALMOXARIFADO" onBack={() => nav.go('home')}
        right={
          <button onClick={() => setSheet('nova')} style={{
            width: 40, height: 40, borderRadius: 10, background: M.amber, border: 'none',
            color: '#0E1117', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="plus" size={22} strokeWidth={2.4}/>
          </button>
        }/>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: M.surface, border: `1px solid ${M.border}`,
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Icon name="search" size={20} color={M.textDim}/>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar peça por nome ou SKU"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: M.text, fontSize: 15, fontFamily: 'Inter, sans-serif',
            }}/>
          {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: M.textDim, cursor: 'pointer', padding: 0 }}><Icon name="x" size={18}/></button>}
        </div>

        {res !== null && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {busy && <ScreenLoader label="Buscando…"/>}
            {!busy && res.length === 0 && (
              <EmptyState icon="search" title="Nada encontrado"
                body={`Nenhuma peça contém "${q}".`}
                action="Cadastrar peça" onAction={() => setSheet('nova')}/>
            )}
            {!busy && res.map(p => (
              <PartRow key={p.sku} part={p} onClick={() => setSheet({ edit: p })}/>
            ))}
          </div>
        )}

        {res === null && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '24px 0 20px', color: M.textDim,
            }}>
              <span style={{ flex: 1, height: 1, background: M.border }}/>
              <span style={{ fontSize: 12, letterSpacing: 2, fontWeight: 600 }}>OU FALE</span>
              <span style={{ flex: 1, height: 1, background: M.border }}/>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 8px' }}>
              <button onClick={openMic} style={{
                width: 120, height: 120, borderRadius: '50%',
                background: M.amber, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 12px 32px -4px ${M.amber}66`,
                transition: 'transform .08s',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <Icon name="mic" size={48} color="#fff" strokeWidth={2}/>
              </button>
              <div style={{ fontSize: 15, fontWeight: 600, color: M.text, marginTop: 16 }}>
                Toque e fale o comando
              </div>
              <div style={{ fontSize: 12, color: M.textDim, marginTop: 12, lineHeight: 1.8, textAlign: 'center', maxWidth: 280 }}>
                "onde está o rolamento 6205"<br/>
                "tira 2 correias A-42"<br/>
                "kit de troca de óleo"
              </div>
            </div>

            <div style={{ paddingTop: 28 }}>
              <SectionHeader>Estoque</SectionHeader>
              <Card padding={16}>
                <div style={{ fontSize: 13, color: M.textDim, lineHeight: 1.6 }}>
                  Use a busca acima para consultar e <b style={{ color: M.text }}>editar</b> uma
                  peça, ou o botão <b style={{ color: M.amber }}>+</b> para cadastrar uma nova.
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {flashNode}

      {sheet === 'nova' && (
        <PartForm
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); flash('Peça cadastrada'); recarregarBusca(); }}/>
      )}
      {sheet && sheet.edit && (
        <PartForm peca={sheet.edit}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); flash('Peça atualizada'); recarregarBusca(); }}/>
      )}
    </div>
  );
}

function PartRow({ part, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: M.surface, border: `1px solid ${M.border}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: M.amber,
          fontWeight: 700, marginBottom: 4,
        }}>{part.sku}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: M.text, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part.nome}</div>
        <div style={{ fontSize: 12, color: M.textDim, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="pin" size={12}/> {part.loc || '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700,
          color: part.qtd < 6 ? M.red : M.green,
        }}>{part.qtd}</div>
        <div style={{ fontSize: 10, color: M.textDim }}>un.</div>
      </div>
    </button>
  );
}

// Sheet: cadastrar (sem `peca`) ou editar (com `peca`) uma peça do estoque
function PartForm({ peca, onClose, onSaved }) {
  const editando = !!peca;
  const [sku, setSku] = useState(peca ? peca.sku : '');
  const [nome, setNome] = useState(peca ? peca.nome : '');
  const [qtd, setQtd] = useState(String(peca ? peca.qtd : 0));
  const [loc, setLoc] = useState(peca ? (peca.loc || '') : '');
  const [cat, setCat] = useState(peca ? (peca.cat || '') : '');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState(null);

  const inputStyle = {
    width: '100%', background: M.bg, border: `1px solid ${M.border}`,
    borderRadius: 10, padding: '12px 14px', color: M.text,
    fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none',
  };

  function salvar() {
    if (!sku.trim() || !nome.trim()) { setErro('SKU e nome são obrigatórios.'); return; }
    setBusy(true); setErro(null);
    const payload = {
      nome: nome.trim(),
      quantidade: parseInt(qtd, 10) || 0,
      localizacao_fisica: loc.trim(),
      categoria: cat.trim(),
    };
    const p = editando
      ? API.pecaUpdate(peca.sku, payload)
      : API.pecaCreate({ ...payload, sku: sku.trim() });
    p.then(onSaved).catch(e => { setErro(e.message || 'Falha ao salvar.'); setBusy(false); });
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 90, backdropFilter: 'blur(2px)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 95,
        background: M.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTop: `1px solid ${M.border}`, maxHeight: '88%', overflowY: 'auto',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: M.borderHi }}/>
        </div>
        <div style={{ padding: '8px 20px 28px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: M.text, marginBottom: 18 }}>
            {editando ? `Editar ${peca.sku}` : 'Cadastrar peça'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!editando && (
              <input style={inputStyle} placeholder="SKU (ex.: ROL-6205)"
                value={sku} onChange={e => setSku(e.target.value)}/>
            )}
            <input style={inputStyle} placeholder="Nome da peça"
              value={nome} onChange={e => setNome(e.target.value)}/>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 6 }}>Quantidade</div>
                <input style={inputStyle} type="number" min="0"
                  value={qtd} onChange={e => setQtd(e.target.value)}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 6 }}>Local</div>
                <input style={inputStyle} placeholder="Gaveta R1"
                  value={loc} onChange={e => setLoc(e.target.value)}/>
              </div>
            </div>
            <input style={inputStyle} placeholder="Categoria (opcional)"
              value={cat} onChange={e => setCat(e.target.value)}/>
            {erro && <div style={{ fontSize: 13, color: M.red }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" full onClick={onClose}>Cancelar</Btn>
              <Btn variant="primary" full icon="check" disabled={busy} onClick={salvar}>
                {busy ? 'Salvando…' : 'Salvar'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =========================================================================
// SCREEN 3 — ORDENS DE SERVIÇO (list)
// =========================================================================
function OsListScreen({ nav }) {
  const [tab, setTab] = useState('abertas');
  const [lista, setLista] = useState(null); // null = carregando
  const [erro, setErro] = useState(null);
  const [novo, setNovo] = useState(false);
  const tabs = [
    { id: 'abertas',    label: 'Abertas',      filter: 'aberta' },
    { id: 'andamento',  label: 'Em andamento', filter: 'andamento' },
    { id: 'concluidas', label: 'Concluídas',   filter: 'concluida' },
  ];

  function carregar() {
    setLista(null); setErro(null);
    API.osList()
      .then(r => setLista(r.os || []))
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(carregar, []);

  const filtro = tabs.find(t => t.id === tab).filter;
  const filtered = (lista || []).filter(o => o.status === filtro);

  return (
    <div data-screen-label="03 OS — Lista" style={{ paddingBottom: 120 }}>
      <TopBar title="ORDENS DE SERVIÇO" onBack={() => nav.go('home')}
        right={
          <button onClick={() => setNovo(true)} style={{
            width: 40, height: 40, borderRadius: 10, background: M.amber, border: 'none',
            color: '#0E1117', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="plus" size={22} strokeWidth={2.4}/>
          </button>
        }/>

      <div style={{
        display: 'flex', borderBottom: `1px solid ${M.border}`,
        position: 'sticky', top: 65, background: M.bg, zIndex: 5,
      }}>
        {tabs.map(t => {
          const active = t.id === tab;
          const count = (lista || []).filter(o => o.status === t.filter).length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '14px 0', background: 'transparent',
              border: 'none', cursor: 'pointer',
              color: active ? M.amber : M.textDim,
              borderBottom: `2px solid ${active ? M.amber : 'transparent'}`,
              marginBottom: -1,
              fontWeight: active ? 700 : 500, fontSize: 13.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {t.label}
              <span style={{
                background: active ? '#3B2A0E' : M.border,
                color: active ? M.amber : M.textDim,
                fontSize: 11, fontWeight: 700,
                borderRadius: 999, padding: '2px 7px',
                fontFamily: "'JetBrains Mono', monospace",
              }}>{lista ? count : '·'}</span>
            </button>
          );
        })}
      </div>

      {lista === null && !erro && <ScreenLoader label="Carregando ordens…"/>}
      {erro && (
        <EmptyState icon="alert" title="Erro" body={erro}
          action="Tentar de novo" onAction={carregar}/>
      )}
      {lista && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(o => (
            <OsCard key={o.id} os={o} onClick={() => nav.push('os-detail', { id: o.id })}/>
          ))}
          {filtered.length === 0 && (
            <EmptyState icon="wrench" title="Nenhuma OS"
              body="Não há ordens com esse status. Crie uma nova com o botão +."
              action="Nova OS" onAction={() => setNovo(true)}/>
          )}
        </div>
      )}

      {novo && (
        <NewOsSheet
          onClose={() => setNovo(false)}
          onCreated={(os) => {
            setNovo(false);
            nav.push('os-detail', { id: os.id }); // a lista recarrega ao voltar
          }}/>
      )}
    </div>
  );
}

// Sheet de abertura de OS — busca equipamentos reais p/ o seletor
function NewOsSheet({ onClose, onCreated }) {
  const [equips, setEquips] = useState(null);
  const [equipId, setEquipId] = useState('');
  const [desc, setDesc] = useState('');
  const [tipo, setTipo] = useState('corretiva');
  const [prio, setPrio] = useState('normal');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    API.equipList().then(r => {
      setEquips(r.equipamentos || []);
      if (r.equipamentos && r.equipamentos[0]) setEquipId(r.equipamentos[0].id);
    }).catch(e => setErro(e.message));
  }, []);

  function submit() {
    if (!equipId || !desc.trim()) { setErro('Escolha o equipamento e descreva o problema.'); return; }
    setEnviando(true); setErro(null);
    API.osCreate({ equipId, desc: desc.trim(), tipo, prio, mec: 'Operador' })
      .then(r => onCreated(r.os))
      .catch(e => { setErro(e.message || 'Falha ao abrir OS.'); setEnviando(false); });
  }

  const inputStyle = {
    width: '100%', background: M.bg, border: `1px solid ${M.border}`,
    borderRadius: 10, padding: '12px 14px', color: M.text,
    fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none',
  };
  const Seg = ({ val, set, opts }) => (
    <div style={{ display: 'flex', gap: 8 }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => set(o.v)} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          background: val === o.v ? M.amber : 'transparent',
          color: val === o.v ? '#0E1117' : M.textDim,
          border: `1px solid ${val === o.v ? M.amber : M.border}`,
          fontWeight: 700, fontSize: 13,
        }}>{o.l}</button>
      ))}
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 90, backdropFilter: 'blur(2px)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 95,
        background: M.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTop: `1px solid ${M.border}`, maxHeight: '88%', overflowY: 'auto',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: M.borderHi }}/>
        </div>
        <div style={{ padding: '8px 20px 28px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: M.text, marginBottom: 4 }}>Nova Ordem de Serviço</div>
          <div style={{ fontSize: 13, color: M.textDim, marginBottom: 20 }}>Abra uma OS para um equipamento.</div>

          {equips === null ? <ScreenLoader label="Carregando equipamentos…"/> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Equipamento</div>
                <select value={equipId} onChange={e => setEquipId(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none' }}>
                  {equips.map(e => (
                    <option key={e.id} value={e.id} style={{ background: M.surface }}>
                      {e.nome} ({e.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Problema / serviço</div>
                <textarea value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Ex.: vazamento de óleo no compressor"
                  rows={3} style={{ ...inputStyle, resize: 'none' }}/>
              </div>
              <div>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipo</div>
                <Seg val={tipo} set={setTipo} opts={[{ v: 'corretiva', l: 'Corretiva' }, { v: 'preventiva', l: 'Preventiva' }]}/>
              </div>
              <div>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prioridade</div>
                <Seg val={prio} set={setPrio} opts={[{ v: 'normal', l: 'Normal' }, { v: 'urgente', l: 'Urgente' }]}/>
              </div>
              {erro && <div style={{ fontSize: 13, color: M.red }}>{erro}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Btn variant="ghost" full onClick={onClose}>Cancelar</Btn>
                <Btn variant="primary" full icon="check" disabled={enviando}
                  onClick={submit}>{enviando ? 'Abrindo…' : 'Abrir OS'}</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function OsCard({ os, onClick }) {
  const accent = os.tipo === 'corretiva' && os.prio === 'urgente' ? M.red : M.amber;
  return (
    <Card onClick={onClick} padding={14} accentColor={accent} style={{ paddingLeft: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, fontWeight: 700, color: M.text, letterSpacing: 0.5,
            }}>{os.id}</span>
            <Tag tone={accent === M.red ? 'red' : 'amber'}>
              {os.tipo === 'corretiva' ? 'CORRETIVA' : 'PREVENTIVA'}
              {os.prio === 'urgente' && ' · URGENTE'}
            </Tag>
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: M.text, lineHeight: 1.3, marginBottom: 4 }}>
            {os.equip}
          </div>
          <div style={{ fontSize: 12.5, color: M.textDim, lineHeight: 1.4 }}>
            {os.desc}
          </div>
        </div>
        <Icon name="chevron-r" size={18} color={M.textDim} style={{ marginTop: 4, flexShrink: 0 }}/>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${M.border}`,
        fontSize: 12, color: M.textDim,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="user" size={13}/> {os.mec}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="clock" size={13}/> {os.aberta}
        </div>
      </div>
    </Card>
  );
}

// =========================================================================
// SCREEN 4 — OS DETALHE
// =========================================================================
function OsDetailScreen({ nav, params }) {
  const [d, setD] = useState(null);   // { os, pecas, comentarios, tempo }
  const [erro, setErro] = useState(null);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [form, setForm] = useState(null); // null | 'peca' | 'nota'
  const [busy, setBusy] = useState(false);
  const [flash, flashNode] = useFlash();

  function carregar() {
    setErro(null);
    API.osGet(params.id)
      .then(r => {
        setD(r);
        setElapsed(Math.min(99 * 60, (r.tempo && r.tempo.desdeMin) || 0));
      })
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(carregar, [params.id]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed(e => e + 1), 60000);
    return () => clearInterval(t);
  }, [running]);

  if (erro) {
    return (
      <div style={{ paddingBottom: 110 }}>
        <TopBar title={params.id} mono onBack={nav.pop}/>
        <EmptyState icon="alert" title="Erro" body={erro}
          action="Tentar de novo" onAction={carregar}/>
      </div>
    );
  }
  if (!d) {
    return (
      <div style={{ paddingBottom: 110 }}>
        <TopBar title={params.id} mono onBack={nav.pop}/>
        <ScreenLoader label="Carregando OS…"/>
      </div>
    );
  }

  const os = d.os;
  const concluida = os.status === 'concluida';
  const accent = os.tipo === 'corretiva' && os.prio === 'urgente' ? M.red : M.amber;
  const hh = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const mm = String(elapsed % 60).padStart(2, '0');

  function fechar() {
    setBusy(true);
    API.osClose(os.codigo)
      .then(() => { flash('OS fechada'); setTimeout(nav.pop, 700); })
      .catch(e => { setErro(e.message); setBusy(false); });
  }
  function enviarForm(payload) {
    setBusy(true);
    const p = form === 'peca'
      ? API.osAddPeca(os.codigo, payload)
      : API.osComment(os.codigo, payload);
    p.then(() => {
      setForm(null); setBusy(false);
      flash(form === 'peca' ? 'Peça registrada' : 'Nota adicionada');
      carregar();
    }).catch(e => { setErro(e.message); setBusy(false); });
  }

  return (
    <div data-screen-label="04 OS — Detalhe" style={{ paddingBottom: 110 }}>
      <TopBar title={os.codigo} mono onBack={nav.pop}
        subtitle={`${os.tipo === 'corretiva' ? 'Corretiva' : 'Preventiva'}${os.prio === 'urgente' ? ' · Urgente' : ''}${concluida ? ' · Concluída' : ''}`}/>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card padding={16} accentColor={concluida ? M.green : accent} style={{ paddingLeft: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: M.surface2, border: `1px solid ${M.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: M.amber,
            }}><Icon name="truck" size={24}/></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: M.text, lineHeight: 1.25 }}>{os.equip}</div>
              <div style={{ fontSize: 12, color: M.textDim, marginTop: 4,
                fontFamily: "'JetBrains Mono', monospace" }}>{os.equipId}</div>
            </div>
            {concluida && <Tag tone="green">CONCLUÍDA</Tag>}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14,
            marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${M.border}`,
          }}>
            <KV label="Mecânico" value={(os.mec || '—').split(' ')[0]}/>
            <KV label="Aberta em" value={os.abertaEm}/>
            <KV label="Prioridade" value={os.prio === 'urgente' ? 'Urgente' : 'Normal'} tone={os.prio === 'urgente' ? 'red' : 'text'}/>
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: M.textDim, lineHeight: 1.5 }}>{os.desc}</div>
        </Card>

        <div>
          <SectionHeader right={
            !concluida ? (
              <button onClick={() => setForm('peca')} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: M.amber, fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4, padding: 0,
              }}><Icon name="plus" size={14}/> ADICIONAR</button>
            ) : null
          }>Peças utilizadas</SectionHeader>
          <Card padding={0}>
            {d.pecas.length === 0 && (
              <div style={{ padding: '18px 14px', fontSize: 13, color: M.textDim, textAlign: 'center' }}>
                Nenhuma peça registrada.
              </div>
            )}
            {d.pecas.map((p, i) => (
              <div key={(p.sku || '') + i} style={{
                padding: '12px 14px',
                borderTop: i > 0 ? `1px solid ${M.border}` : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {p.sku && (
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12, color: M.amber, fontWeight: 700, marginBottom: 3,
                    }}>{p.sku}</div>
                  )}
                  <div style={{ fontSize: 13.5, color: M.text, fontWeight: 500 }}>{p.nome}</div>
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 16, fontWeight: 700, color: M.text,
                  background: M.surface2, borderRadius: 8, padding: '6px 12px',
                }}>×{p.qtd}</div>
              </div>
            ))}
          </Card>
        </div>

        <div>
          <SectionHeader>Tempo desde a abertura</SectionHeader>
          <Card padding={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: running && !concluida ? '#0E2B23' : M.surface2,
                border: `1px solid ${running && !concluida ? M.green + '44' : M.border}`,
                color: running && !concluida ? M.green : M.textDim,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="clock" size={28}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 28, fontWeight: 700, color: M.text, lineHeight: 1,
                  letterSpacing: 1,
                }}>{hh}:{mm}</div>
                <div style={{ fontSize: 12, color: M.textDim, marginTop: 6 }}>
                  Iniciado {d.tempo.iniciado}
                </div>
              </div>
              {!concluida && (
                <button onClick={() => setRunning(r => !r)} style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: running ? '#2E2410' : M.amber,
                  color: running ? M.amber : '#0E1117',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={running ? 'pause' : 'play'} size={20} strokeWidth={2.4}/>
                </button>
              )}
            </div>
          </Card>
        </div>

        <div>
          <SectionHeader>Comentários</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.comentarios.length === 0 && (
              <Card padding={14}>
                <div style={{ fontSize: 13, color: M.textDim }}>Sem comentários ainda.</div>
              </Card>
            )}
            {d.comentarios.map((c, i) => (
              <Card key={i} padding={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: M.text }}>{c.autor}</span>
                  <span style={{ fontSize: 11, color: M.textDim,
                    fontFamily: "'JetBrains Mono', monospace" }}>{c.hora}</span>
                </div>
                <div style={{ fontSize: 13, color: M.textDim, lineHeight: 1.5 }}>{c.texto}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {flashNode}

      {!concluida && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: M.bg, borderTop: `1px solid ${M.border}`,
          padding: '10px 12px', display: 'flex', gap: 8, zIndex: 20,
        }}>
          <Btn variant="ghost" size="sm" icon="package" onClick={() => setForm('peca')}>Peça</Btn>
          <Btn variant="ghost" size="sm" icon="message" onClick={() => setForm('nota')}>Nota</Btn>
          <div style={{ flex: 1 }}>
            <Btn variant="primary" size="sm" icon="check" full disabled={busy}
              onClick={fechar}>Fechar OS</Btn>
          </div>
        </div>
      )}

      {form && (
        <OsActionForm kind={form} busy={busy}
          onClose={() => setForm(null)} onSubmit={enviarForm}/>
      )}
    </div>
  );
}

// Form inline (peça ou nota) sobre a tela de detalhe
function OsActionForm({ kind, busy, onClose, onSubmit }) {
  const [nome, setNome] = useState('');
  const [sku, setSku] = useState('');
  const [qtd, setQtd] = useState('1');
  const [texto, setTexto] = useState('');
  const inputStyle = {
    width: '100%', background: M.bg, border: `1px solid ${M.border}`,
    borderRadius: 10, padding: '12px 14px', color: M.text,
    fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none',
  };
  function go() {
    if (kind === 'peca') {
      if (!nome.trim()) return;
      onSubmit({ nome: nome.trim(), sku: sku.trim(), qtd: parseInt(qtd, 10) || 1 });
    } else {
      if (!texto.trim()) return;
      onSubmit({ texto: texto.trim(), autor: 'Operador' });
    }
  }
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 90, backdropFilter: 'blur(2px)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 95,
        background: M.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTop: `1px solid ${M.border}`, boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: M.borderHi }}/>
        </div>
        <div style={{ padding: '8px 20px 28px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: M.text, marginBottom: 18 }}>
            {kind === 'peca' ? 'Registrar peça usada' : 'Adicionar nota'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {kind === 'peca' ? (
              <>
                <input style={inputStyle} placeholder="Nome da peça" value={nome}
                  onChange={e => setNome(e.target.value)}/>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input style={{ ...inputStyle, flex: 2 }} placeholder="SKU (opcional)"
                    value={sku} onChange={e => setSku(e.target.value)}/>
                  <input style={{ ...inputStyle, flex: 1 }} type="number" min="1"
                    value={qtd} onChange={e => setQtd(e.target.value)}/>
                </div>
              </>
            ) : (
              <textarea style={{ ...inputStyle, resize: 'none' }} rows={3}
                placeholder="Escreva a nota…" value={texto}
                onChange={e => setTexto(e.target.value)}/>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" full onClick={onClose}>Cancelar</Btn>
              <Btn variant="primary" full icon="check" disabled={busy} onClick={go}>
                {busy ? 'Salvando…' : 'Salvar'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function KV({ label, value, tone }) {
  const color = tone === 'red' ? M.red : tone === 'amber' ? M.amber : M.text;
  return (
    <div>
      <div style={{ fontSize: 10.5, color: M.textDim, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

// =========================================================================
// SCREEN 5 — EQUIPAMENTOS (list)
// =========================================================================
function EquipListScreen({ nav }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('todos');
  const [todos, setTodos] = useState(null);
  const [erro, setErro] = useState(null);

  const [novo, setNovo] = useState(false);
  function carregar() {
    setErro(null);
    API.equipList()
      .then(r => setTodos(r.equipamentos || []))
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(carregar, []);

  const types = ['todos', ...new Set((todos || []).map(e => e.tipo).filter(Boolean))];
  const filtered = (todos || []).filter(e =>
    (type === 'todos' || e.tipo === type) &&
    (q === '' || e.nome.toLowerCase().includes(q.toLowerCase()) ||
      (e.placa || '').toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div data-screen-label="05 Equipamentos — Lista" style={{ paddingBottom: 120 }}>
      <TopBar title="EQUIPAMENTOS" onBack={() => nav.go('home')}
        right={
          <button onClick={() => setNovo(true)} style={{
            width: 40, height: 40, borderRadius: 10, background: M.amber, border: 'none',
            color: '#0E1117', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="plus" size={22} strokeWidth={2.4}/>
          </button>
        }/>

      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{
          background: M.surface, border: `1px solid ${M.border}`,
          borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="search" size={18} color={M.textDim}/>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou placa"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: M.text, fontSize: 14, fontFamily: 'Inter, sans-serif' }}/>
        </div>
      </div>

      <div style={{ padding: '4px 12px 8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {types.map(t => {
            const active = t === type;
            return (
              <button key={t} onClick={() => setType(t)} style={{
                background: active ? M.amber : M.surface,
                color: active ? '#0E1117' : M.textDim,
                border: `1px solid ${active ? M.amber : M.border}`,
                borderRadius: 999, padding: '8px 14px',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>{t === 'todos' ? 'Todos' : t}</button>
            );
          })}
        </div>
      </div>

      {todos === null && !erro && <ScreenLoader label="Carregando equipamentos…"/>}
      {erro && (
        <EmptyState icon="alert" title="Erro" body={erro}
          action="Tentar de novo" onAction={carregar}/>
      )}
      {todos && (
        <div style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(e => (
            <EquipRow key={e.id} equip={e} onClick={() => nav.push('equip-detail', { id: e.id })}/>
          ))}
          {filtered.length === 0 && (
            <EmptyState icon="truck" title="Nada encontrado"
              body="Nenhum equipamento com esse filtro."
              action="Novo equipamento" onAction={() => setNovo(true)}/>
          )}
        </div>
      )}

      {novo && (
        <EquipForm
          onClose={() => setNovo(false)}
          onCreated={(eq) => { setNovo(false); nav.push('equip-detail', { id: eq.id }); }}/>
      )}
    </div>
  );
}

// Sheet: cadastrar novo equipamento
function EquipForm({ onClose, onCreated }) {
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [placa, setPlaca] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState(null);
  const inputStyle = {
    width: '100%', background: M.bg, border: `1px solid ${M.border}`,
    borderRadius: 10, padding: '12px 14px', color: M.text,
    fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none',
  };
  function salvar() {
    if (!codigo.trim() || !nome.trim()) { setErro('Código e nome são obrigatórios.'); return; }
    setBusy(true); setErro(null);
    API.equipCreate({
      codigo: codigo.trim(), nome: nome.trim(), tipo: tipo.trim(),
      modelo: modelo.trim(), ano: ano ? parseInt(ano, 10) : null, placa: placa.trim(),
    }).then(r => onCreated(r.equip))
      .catch(e => { setErro(e.message || 'Falha ao cadastrar.'); setBusy(false); });
  }
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 90, backdropFilter: 'blur(2px)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 95,
        background: M.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTop: `1px solid ${M.border}`, maxHeight: '88%', overflowY: 'auto',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: M.borderHi }}/>
        </div>
        <div style={{ padding: '8px 20px 28px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: M.text, marginBottom: 18 }}>Novo equipamento</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input style={inputStyle} placeholder="Código (ex.: CAM-09)"
              value={codigo} onChange={e => setCodigo(e.target.value)}/>
            <input style={inputStyle} placeholder="Nome (ex.: Caminhão Volvo FH)"
              value={nome} onChange={e => setNome(e.target.value)}/>
            <input style={inputStyle} placeholder="Tipo (ex.: Caminhão, Trator)"
              value={tipo} onChange={e => setTipo(e.target.value)}/>
            <div style={{ display: 'flex', gap: 12 }}>
              <input style={{ ...inputStyle, flex: 2 }} placeholder="Modelo"
                value={modelo} onChange={e => setModelo(e.target.value)}/>
              <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Ano"
                value={ano} onChange={e => setAno(e.target.value)}/>
            </div>
            <input style={inputStyle} placeholder="Placa / identificação"
              value={placa} onChange={e => setPlaca(e.target.value)}/>
            {erro && <div style={{ fontSize: 13, color: M.red }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" full onClick={onClose}>Cancelar</Btn>
              <Btn variant="primary" full icon="check" disabled={busy} onClick={salvar}>
                {busy ? 'Salvando…' : 'Cadastrar'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EquipRow({ equip, onClick }) {
  const iconMap = { Caminhão: 'truck', Trator: 'truck', Empilhadeira: 'truck',
    Compressor: 'gauge', Esteira: 'settings', Colheitadeira: 'truck',
    Bomba: 'gauge', Gerador: 'gauge', Prensa: 'settings' };
  const statusLabel = { operacional: 'Operacional', manutencao: 'Em manutenção', parado: 'Parado' };
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left',
      background: M.surface, border: `1px solid ${M.border}`,
      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 10,
        background: M.surface2, border: `1px solid ${M.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: M.textDim,
      }}>
        <Icon name={iconMap[equip.tipo] || 'truck'} size={26}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: M.text,
          lineHeight: 1.25, marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{equip.nome}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: M.textDim }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{equip.placa}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{equip.tipo}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <StatusDot status={equip.status} size={10} withRing/>
        <span style={{ fontSize: 10, color: M.textDim, lineHeight: 1 }}>{statusLabel[equip.status]}</span>
      </div>
    </button>
  );
}

// =========================================================================
// SCREEN 6 — EQUIPAMENTO DETALHE
// =========================================================================
function EquipDetailScreen({ nav, params }) {
  const [d, setD] = useState(null);   // { equip, history }
  const [erro, setErro] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [flash, flashNode] = useFlash();
  const statusLabel = { operacional: 'Operacional', manutencao: 'Em manutenção', parado: 'Parado' };

  function carregar() {
    setErro(null);
    API.equipGet(params.id)
      .then(setD)
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(carregar, [params.id]);

  function mudarStatus(novo) {
    if (savingStatus || (d && d.equip.status === novo)) return;
    setSavingStatus(true);
    API.equipUpdate(params.id, { status: novo })
      .then(() => { flash('Status atualizado'); carregar(); })
      .catch(e => setErro(e.message || 'Falha ao atualizar.'))
      .finally(() => setSavingStatus(false));
  }

  if (erro) {
    return (
      <div style={{ paddingBottom: 110 }}>
        <TopBar title={params.id} mono onBack={nav.pop}/>
        <EmptyState icon="alert" title="Erro" body={erro}
          action="Tentar de novo" onAction={carregar}/>
      </div>
    );
  }
  if (!d) {
    return (
      <div style={{ paddingBottom: 110 }}>
        <TopBar title={params.id} mono onBack={nav.pop}/>
        <ScreenLoader label="Carregando equipamento…"/>
      </div>
    );
  }

  const equip = d.equip;
  const history = d.history || [];

  return (
    <div data-screen-label="06 Equipamento — Detalhe" style={{ paddingBottom: 110 }}>
      {/* Custom header w/ photo placeholder */}
      <div style={{ position: 'relative', height: 200,
        background: `linear-gradient(180deg, #1B222C 0%, ${M.bg} 100%)`,
        overflow: 'hidden',
      }}>
        {/* placeholder stripes */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, transparent 0 10px, rgba(245,158,11,0.05) 10px 20px)`,
        }}/>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: M.textDim, opacity: 0.6, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8,
        }}>
          <Icon name="camera" size={36} color={M.textDim}/>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
            FOTO DO EQUIPAMENTO
          </div>
        </div>
        <button onClick={nav.pop} style={{
          position: 'absolute', top: 14, left: 14,
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(14,17,23,0.7)', backdropFilter: 'blur(8px)',
          border: `1px solid ${M.border}`, color: M.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="arrow-left" size={20}/>
        </button>
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(14,17,23,0.7)', backdropFilter: 'blur(8px)',
          border: `1px solid ${M.border}`, color: M.text,
          borderRadius: 999, padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600,
        }}>
          <StatusDot status={equip.status}/>
          <span>{statusLabel[equip.status]}</span>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Title */}
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: M.text, lineHeight: 1.2 }}>
            {equip.nome}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, color: M.textDim, fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace" }}>
            <span>{equip.modelo}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{equip.ano}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{equip.placa}</span>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <MiniKPI label="Custo do mês" value={brlK(equip.custoMes)} tone="amber"/>
          <MiniKPI label="OS no ano" value={String(equip.osAno)}/>
          <MiniKPI label="Última manut." value={equip.ultimaManut || '—'}/>
        </div>

        {/* Timeline */}
        <div>
          <SectionHeader>Histórico</SectionHeader>
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            <span style={{
              position: 'absolute', left: 11, top: 8, bottom: 8,
              width: 2, background: M.border,
            }}/>
            {history.map((h, i) => {
              const color = h.tipo === 'os' ? M.amber : h.tipo === 'insp' ? M.green : M.text;
              return (
                <div key={i} style={{ position: 'relative', paddingBottom: 18 }}>
                  <span style={{
                    position: 'absolute', left: -22, top: 4,
                    width: 12, height: 12, borderRadius: '50%',
                    background: color, boxShadow: `0 0 0 4px ${M.bg}, 0 0 0 5px ${M.border}`,
                  }}/>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 12, color: M.textDim,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{h.data}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: M.text }}>{h.titulo}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: M.textDim, lineHeight: 1.4 }}>{h.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <SectionHeader>Situação do equipamento</SectionHeader>
          <Card padding={12}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 'operacional', l: 'Operacional', c: M.green },
                { v: 'manutencao',  l: 'Manutenção',  c: M.amber },
                { v: 'parado',      l: 'Parado',      c: M.red },
              ].map(o => {
                const on = equip.status === o.v;
                return (
                  <button key={o.v} disabled={savingStatus}
                    onClick={() => mudarStatus(o.v)} style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      cursor: savingStatus ? 'wait' : 'pointer',
                      background: on ? o.c : 'transparent',
                      color: on ? '#0E1117' : M.textDim,
                      border: `1px solid ${on ? o.c : M.border}`,
                      fontWeight: 700, fontSize: 12.5,
                    }}>{o.l}</button>
                );
              })}
            </div>
          </Card>
        </div>

        {flashNode}
        <Btn variant="primary" icon="plus" full onClick={() => nav.go('os')}>Abrir nova OS</Btn>
      </div>
    </div>
  );
}

function MiniKPI({ label, value, tone }) {
  const color = tone === 'amber' ? M.amber : M.text;
  return (
    <div style={{
      background: M.surface, border: `1px solid ${M.border}`,
      borderRadius: 10, padding: '12px 10px',
    }}>
      <div style={{ fontSize: 10, color: M.textDim, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color,
        fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

// =========================================================================
// SCREEN 7 — DASHBOARD (gestor)
// =========================================================================
function DashScreen({ nav }) {
  const [d, setD] = useState(null);   // { os:[], equip:[] }
  const [erro, setErro] = useState(null);

  function carregar() {
    setErro(null);
    Promise.all([API.osList(), API.equipList()])
      .then(([a, b]) => setD({ os: a.os || [], equip: b.equipamentos || [] }))
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(carregar, []);

  if (erro) {
    return (
      <div style={{ paddingBottom: 110 }}>
        <TopBar title="DASHBOARD" onBack={() => nav.go('home')}/>
        <EmptyState icon="alert" title="Erro" body={erro}
          action="Tentar de novo" onAction={carregar}/>
      </div>
    );
  }
  if (!d) {
    return (
      <div style={{ paddingBottom: 110 }}>
        <TopBar title="DASHBOARD" onBack={() => nav.go('home')}/>
        <ScreenLoader label="Carregando indicadores…"/>
      </div>
    );
  }

  const os = d.os, eq = d.equip;
  const c = (arr, k, v) => arr.filter(x => x[k] === v).length;
  const osAb = c(os, 'status', 'aberta');
  const osAnd = c(os, 'status', 'andamento');
  const osCon = c(os, 'status', 'concluida');
  const osTot = os.length || 1;
  const eqParado = eq.filter(e => e.status === 'parado');
  const eqManut = c(eq, 'status', 'manutencao');

  const kpis = [
    { label: 'OS abertas', valor: osAb, cor: M.amber },
    { label: 'Em andamento', valor: osAnd, cor: M.text },
    { label: 'Equip. parados', valor: eqParado.length, cor: eqParado.length ? M.red : M.green },
    { label: 'Equipamentos', valor: eq.length, cor: M.text },
  ];
  const dist = [
    { l: 'Abertas', n: osAb, cor: M.amber },
    { l: 'Andamento', n: osAnd, cor: M.text },
    { l: 'Concluídas', n: osCon, cor: M.green },
  ];

  return (
    <div data-screen-label="07 Dashboard" style={{ paddingBottom: 110 }}>
      <TopBar title="DASHBOARD" onBack={() => nav.go('home')}/>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {kpis.map(k => (
            <Card key={k.label} padding={14}>
              <div style={{ fontSize: 11, color: M.textDim, letterSpacing: 0.4,
                textTransform: 'uppercase', marginBottom: 8 }}>{k.label}</div>
              <div style={{
                fontSize: 26, fontWeight: 700, color: k.cor,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{k.valor}</div>
            </Card>
          ))}
        </div>

        <Card padding={16}>
          <div style={{ fontSize: 14, fontWeight: 700, color: M.text, marginBottom: 4 }}>
            Ordens de serviço
          </div>
          <div style={{ fontSize: 11, color: M.textDim, marginBottom: 16 }}>
            {os.length} no total
          </div>
          {os.length === 0 ? (
            <div style={{ fontSize: 13, color: M.textDim, padding: '8px 0' }}>
              Nenhuma OS ainda. Abra a primeira na aba OS.
            </div>
          ) : dist.map(s => (
            <div key={s.l} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: 12, color: M.textDim, marginBottom: 5 }}>
                <span>{s.l}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: M.text }}>{s.n}</span>
              </div>
              <div style={{ height: 8, background: M.bg, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(s.n / osTot) * 100}%`,
                  background: s.cor, borderRadius: 4 }}/>
              </div>
            </div>
          ))}
        </Card>

        <Card padding={16}>
          <div style={{ fontSize: 14, fontWeight: 700, color: M.text, marginBottom: 14 }}>
            Situação da frota
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { l: 'Operacional', n: c(eq, 'status', 'operacional'), cor: M.green },
              { l: 'Manutenção', n: eqManut, cor: M.amber },
              { l: 'Parado', n: eqParado.length, cor: M.red },
            ].map(s => (
              <div key={s.l} style={{ flex: 1, textAlign: 'center',
                background: M.bg, borderRadius: 10, padding: '14px 6px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.cor,
                  fontFamily: "'JetBrains Mono', monospace" }}>{s.n}</div>
                <div style={{ fontSize: 11, color: M.textDim, marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>

        <div>
          <SectionHeader>Atenção</SectionHeader>
          {eqParado.length === 0 ? (
            <Card padding={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, color: M.green }}>
                <Icon name="check" size={18}/> Nenhum equipamento parado.
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {eqParado.map(e => (
                <Card key={e.id} padding={14} accentColor={M.red} style={{ paddingLeft: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: '#2B1318', color: M.red,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon name="alert" size={18}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: M.text }}>{e.nome}</div>
                      <div style={{ fontSize: 12, color: M.textDim, marginTop: 2 }}>
                        {e.id} · parado
                      </div>
                    </div>
                    <button onClick={() => nav.push('equip-detail', { id: e.id })} style={{
                      background: 'transparent', border: `1px solid ${M.red}66`,
                      color: '#FCA5A5', borderRadius: 8, padding: '6px 12px',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    }}>Ver</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  HomeScreen, PartsScreen, OsListScreen, OsDetailScreen,
  EquipListScreen, EquipDetailScreen, DashScreen,
});
