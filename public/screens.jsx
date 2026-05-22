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
function lerPerfil() {
  try {
    return {
      nome: localStorage.getItem('maestro_nome') || '',
      email: localStorage.getItem('maestro_email') || '',
      perfil: localStorage.getItem('maestro_perfil') || '',
    };
  } catch (_) { return { nome: '', email: '', perfil: '' }; }
}

// Exemplos de cadastro adaptados à profissão escolhida no login
function exemplosPerfil() {
  const { perfil } = lerPerfil();
  const M = {
    'Produtor rural': {
      sku: 'FIL-TRATOR', nome: 'Filtro de óleo do trator',
      loc: 'Galpão A', cat: 'Trator',
      voz: ['"onde está o filtro de combustível"', '"tira 2 óleo 15w40"', '"kit de revisão do trator"'],
      eqCod: 'TRT-01', eqNome: 'Trator John Deere 6110', eqTipo: 'Trator',
    },
    'Empresário': {
      sku: 'ROL-6205', nome: 'Rolamento 6205',
      loc: 'Gaveta R1', cat: 'Rolamentos',
      voz: ['"onde está o rolamento 6205"', '"tira 3 correia A-42"', '"kit de manutenção"'],
      eqCod: 'CMP-02', eqNome: 'Compressor Atlas GA22', eqTipo: 'Compressor',
    },
    'Dono de loja / oficina': {
      sku: 'PAST-FRE', nome: 'Pastilha de freio dianteira',
      loc: 'Prateleira 3', cat: 'Freios',
      voz: ['"onde está a pastilha de freio"', '"tira 1 jogo de lona"', '"kit de revisão"'],
      eqCod: 'ELV-01', eqNome: 'Elevador automotivo', eqTipo: 'Elevador',
    },
    'Mecânico / Operador': {
      sku: 'COR-A42', nome: 'Correia A-42',
      loc: 'Painel C2', cat: 'Transmissão',
      voz: ['"onde está a correia A-42"', '"tira 2 retentor"', '"kit de troca de óleo"'],
      eqCod: 'EMP-04', eqNome: 'Empilhadeira Hyster H50', eqTipo: 'Empilhadeira',
    },
    'Gestor de manutenção': {
      sku: 'MAN-R2-12', nome: 'Mangueira hidráulica 1/2"',
      loc: 'Carretel H1', cat: 'Hidráulica',
      voz: ['"onde está a mangueira hidráulica"', '"tira 1 filtro coalescente"', '"kit de revisão 500 horas"'],
      eqCod: 'GER-01', eqNome: 'Gerador Stemac 250kVA', eqTipo: 'Gerador',
    },
  };
  return M[perfil] || {
    sku: 'PC-001', nome: 'Nome do item',
    loc: 'Prateleira A1', cat: 'Categoria',
    voz: ['"onde está o filtro de óleo"', '"tira 2 óleo 5w30"', '"kit de troca de óleo"'],
    eqCod: 'EQ-01', eqNome: 'Nome do equipamento', eqTipo: 'Tipo',
  };
}

// Widget temático conforme a profissão escolhida no login
function widgetPerfil(perfil) {
  const W = {
    'Produtor rural': { icon: 'sprout', titulo: 'Campo & Frota', frase: 'Tratores, colheitadeiras e insumos sob controle.' },
    'Empresário': { icon: 'briefcase', titulo: 'Visão do negócio', frase: 'Custos, ordens e estoque num lugar só.' },
    'Dono de loja / oficina': { icon: 'car', titulo: 'Sua oficina', frase: 'Peças e serviços organizados e rápidos.' },
    'Mecânico / Operador': { icon: 'wrench', titulo: 'Mão na massa', frase: 'Ache peças e registre serviços por voz.' },
    'Gestor de manutenção': { icon: 'clipboard', titulo: 'Manutenção', frase: 'Indicadores e ordens sempre em dia.' },
  };
  return W[perfil] || { icon: 'settings', titulo: perfil || 'Bem-vindo', frase: 'Seu estoque e manutenção por voz.' };
}

function HomeScreen({ nav, openMic, onLogout }) {
  const { nome: nomeReal, email, perfil } = lerPerfil();
  const nome = nomeReal ? nomeReal.split(' ')[0] : (email ? email.split('@')[0] : 'bem-vindo');
  const iniciais = ((nomeReal || email || 'MA').trim().slice(0, 2)).toUpperCase();
  const exVoz = exemplosPerfil().voz;
  const hoje = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  }).format(new Date());

  const [st, setSt] = useState(null);   // estatísticas reais
  const [notif, setNotif] = useState(false);
  const [umenu, setUmenu] = useState(false);

  useEffect(() => {
    Promise.all([
      API.osList().catch(() => ({ os: [] })),
      API.equipList().catch(() => ({ equipamentos: [] })),
      API.pecaSearch('').catch(() => ({ pecas: [] })),
      API.inspecoesHoje().catch(() => ({ inspecoes: [] })),
    ]).then(([a, b, c, d]) => {
      const os = a.os || [], eq = b.equipamentos || [], pc = c.pecas || [], ins = d.inspecoes || [];
      const inspIds = new Set(ins.map(i => i.equipId));
      setSt({
        pecas: pc.length,
        baixas: pc.filter(p => p.qtd < (p.ponto || 6)),
        osAb: os.filter(o => o.status === 'aberta').length,
        equip: eq.length,
        parados: eq.filter(e => e.status === 'parado'),
        pend: eq.filter(e => !inspIds.has(e.id)).length,
      });
    });
  }, []);

  const temAlerta = st && (st.osAb > 0 || st.parados.length > 0 || st.baixas.length > 0);
  const txt = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;

  return (
    <div data-screen-label="01 Home" style={{ paddingBottom: 110 }}>
      <div style={{
        padding: '18px 16px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Logo size={30} word/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setNotif(true)} style={{
            position: 'relative', width: 40, height: 40, borderRadius: 10,
            background: M.surface, border: `1px solid ${M.border}`,
            color: M.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              display: 'inline-flex', transformOrigin: '50% 8%',
              animation: temAlerta ? 'maestro-bell 1.2s ease 0.6s 2' : 'none',
            }}>
              <Icon name="bell" size={20}/>
            </span>
            {temAlerta && (
              <span style={{
                position: 'absolute', top: 8, right: 9,
                width: 8, height: 8, borderRadius: '50%',
                background: M.red, border: `2px solid ${M.surface}`,
                boxShadow: `0 0 0 0 ${M.red}66`,
                animation: 'maestro-pulse 1.6s ease-out infinite',
              }}/>
            )}
          </button>
          <button
            onClick={() => setUmenu(true)}
            title="Conta"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #475569, #1E293B)',
              color: M.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, border: `1px solid ${M.border}`,
              cursor: 'pointer',
            }}>{iniciais}</button>
        </div>
      </div>

      <div style={{ padding: '8px 16px 16px' }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700, color: M.text,
          lineHeight: 1.25, letterSpacing: -0.3,
        }}>Olá, {nome}</h1>
        <div style={{ fontSize: 13, color: M.textDim, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ textTransform: 'capitalize' }}>{hoje}</span>
          {perfil && <><span style={{ opacity: 0.4 }}>·</span><span>{perfil}</span></>}
          {(() => {
            const list = (typeof window !== 'undefined' && window.__workspaces) || [];
            const active = window.API.workspaceActive();
            const cur = list.find(w => w.id === active);
            if (!cur) return null;
            return <><span style={{ opacity: 0.4 }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: M.amber }}>
                <Icon name="pin" size={12}/>{cur.nome}
              </span></>;
          })()}
          {window.API.role() === 'pai' && (
            <><span style={{ opacity: 0.4 }}>·</span>
            <span style={{ color: M.amber, fontWeight: 700 }}>admin</span></>
          )}
        </div>
      </div>

      {/* Widget temático por perfil */}
      <div style={{ padding: '0 16px 16px' }}>
        {(() => {
          const w = widgetPerfil(perfil);
          return (
            <div style={{
              background: `linear-gradient(135deg, #3B2A0E, ${M.surface2})`,
              border: `1px solid ${M.border}`, borderRadius: 16,
              padding: 18, display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: 14, flexShrink: 0,
                background: M.bg, border: `1px solid ${M.amber}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: M.amber,
              }}>
                <Icon name={w.icon} size={32}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: M.text }}>{w.titulo}</div>
                <div style={{ fontSize: 12.5, color: M.textDim, marginTop: 4, lineHeight: 1.4 }}>{w.frase}</div>
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ModuleCard icon="box" title="Almoxarifado"
          badge={{ text: st ? txt(st.pecas, 'peça', 'peças') : '…', tone: 'neutral' }}
          onClick={() => nav.go('parts')} />
        <ModuleCard icon="wrench" title="Ordens de Serviço"
          badge={{ text: st ? txt(st.osAb, 'aberta', 'abertas') : '…', tone: st && st.osAb ? 'amber' : 'neutral' }}
          onClick={() => nav.go('os')} />
        <ModuleCard icon="truck" title="Equipamentos"
          badge={{ text: st ? txt(st.equip, 'ativo', 'ativos') : '…', tone: 'neutral' }}
          onClick={() => nav.go('equip')} />
        <ModuleCard icon="list-checks" title="Inspeção do Dia"
          badge={{ text: st ? txt(st.pend, 'pendente', 'pendentes') : '…', tone: st && st.pend ? 'red' : 'neutral' }}
          onClick={() => nav.push('inspecao')} />
      </div>

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
                Resumo de ordens, frota e alertas
              </div>
            </div>
            <Icon name="chevron-r" size={20} color={M.textDim}/>
          </div>
        </Card>
      </div>

      {window.API.role() === 'pai' && (
        <div style={{ padding: '12px 16px 0' }}>
          <Card onClick={() => nav.push('gestao')} padding={18}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: 'linear-gradient(135deg, #2B1318, #1B222C)',
                border: `1px solid ${M.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: M.amber,
              }}>
                <Icon name="user" size={28}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: M.text }}>
                  Gestão <span style={{ fontSize: 11, color: M.amber }}>· admin</span>
                </div>
                <div style={{ fontSize: 12, color: M.textDim, marginTop: 4 }}>
                  Quem usou e o que cada um fez
                </div>
              </div>
              <Icon name="chevron-r" size={20} color={M.textDim}/>
            </div>
          </Card>
        </div>
      )}

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
            <span style={{ color: M.text }}>{exVoz[0]}</span> · <span style={{ color: M.text }}>{exVoz[1]}</span>
          </div>
        </Card>
      </div>

      {notif && <NotificationsSheet st={st} nav={nav} onClose={() => setNotif(false)}/>}
      {umenu && <UserMenuSheet onClose={() => setUmenu(false)} onLogout={onLogout}/>}
    </div>
  );
}

function NotificationsSheet({ st, nav, onClose }) {
  const itens = [];
  if (st) {
    st.parados.forEach(e => itens.push({
      cor: M.red, ic: 'alert', t: `${e.nome} parado`,
      d: `${e.id} · equipamento parado`, go: () => { onClose(); nav.push('equip-detail', { id: e.id }); },
    }));
    if (st.osAb > 0) itens.push({
      cor: M.amber, ic: 'wrench', t: `${st.osAb} OS aberta(s)`,
      d: 'Ordens de serviço aguardando', go: () => { onClose(); nav.go('os'); },
    });
    st.baixas.forEach(p => itens.push({
      cor: M.amber, ic: 'cart', t: `Estoque baixo: ${p.nome}`,
      d: `${p.sku} · ${p.qtd} em estoque${p.ponto ? ' (mín. ' + p.ponto + ')' : ''} · toque para comprar`,
      go: () => { onClose(); window.open(window.API.mlBusca(p.nome, p.cat), '_blank'); },
    }));
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
        borderTop: `1px solid ${M.border}`, maxHeight: '80%', overflowY: 'auto',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: M.borderHi }}/>
        </div>
        <div style={{ padding: '8px 20px 28px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: M.text, marginBottom: 16 }}>Notificações</div>
          {!st ? (
            <div style={{ fontSize: 13, color: M.textDim }}>Carregando…</div>
          ) : itens.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, color: M.green, padding: '12px 0' }}>
              <Icon name="check" size={20}/> Tudo certo, sem alertas.
            </div>
          ) : (
            <AnimatedList gap={10}>
              {itens.map((a, i) => (
                <button key={i} onClick={a.go} style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: M.surface2, border: `1px solid ${M.border}`,
                  borderRadius: 12, padding: 14,
                  display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: M.bg, color: a.cor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon name={a.ic} size={18}/></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: M.text }}>{a.t}</div>
                    <div style={{ fontSize: 12, color: M.textDim, marginTop: 2 }}>{a.d}</div>
                  </div>
                  <Icon name="chevron-r" size={16} color={M.textDim}/>
                </button>
              ))}
            </AnimatedList>
          )}
        </div>
      </div>
    </>
  );
}

// Menu da conta (avatar): ver perfil · gerenciar assinaturas · sair
function UserMenuSheet({ onClose, onLogout }) {
  const [view, setView] = useState('menu');
  const [pagando, setPagando] = useState(false);
  const [erroPag, setErroPag] = useState(null);
  // exclusão de conta (LGPD): exige digitar "EXCLUIR" pra evitar acidente
  const [confirmaTxt, setConfirmaTxt] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erroExc, setErroExc] = useState(null);
  // cancelar assinatura
  const [cancelando, setCancelando] = useState(false);
  const [okCancel, setOkCancel] = useState(null);
  // equipe
  const [equipe, setEquipe] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erroEq, setErroEq] = useState(null);
  const { nome, email, perfil } = lerPerfil();
  const role = window.API.role();
  const plano = window.API.plan() || { plan: 'premium' };
  const papelLabel = role === 'pai' ? 'Administrador (pai)'
    : role === 'trial' ? 'Teste grátis' : 'Usuário (filho)';

  function excluir() {
    if (confirmaTxt.trim().toUpperCase() !== 'EXCLUIR') {
      setErroExc('Digite EXCLUIR (em maiúsculas) para confirmar.');
      return;
    }
    setExcluindo(true); setErroExc(null);
    window.API.contaExcluir()
      .then(() => {
        // limpa tudo do navegador (token, perfil, preferências) e desloga
        try { localStorage.clear(); } catch (_) {}
        if (onLogout) onLogout();
      })
      .catch(err => {
        setExcluindo(false);
        setErroExc((err && err.message) || 'Falha ao excluir. Tente novamente.');
      });
  }

  function cancelarAssinatura() {
    if (!window.confirm('Cancelar a assinatura?\n\nVocê mantém o acesso até a data de validade. Não cobramos a próxima renovação.')) return;
    setCancelando(true); setErroPag(null);
    window.API.contaCancelar()
      .then(j => { setCancelando(false); setOkCancel(j); })
      .catch(err => {
        setCancelando(false);
        setErroPag((err && err.message) || 'Falha ao cancelar.');
      });
  }

  function carregarEquipe() {
    setErroEq(null);
    window.API.equipeListar()
      .then(setEquipe)
      .catch(err => setErroEq((err && err.message) || 'Falha ao carregar equipe.'));
  }

  function gerarConvite() {
    setGerando(true); setErroEq(null);
    window.API.conviteCriar(7, 25)
      .then(() => { setGerando(false); carregarEquipe(); })
      .catch(err => {
        setGerando(false);
        setErroEq((err && err.message) || 'Falha ao gerar convite.');
      });
  }

  function revogarConvite(codigo) {
    if (!window.confirm('Revogar este convite?')) return;
    window.API.conviteRevogar(codigo)
      .then(() => carregarEquipe())
      .catch(err => setErroEq((err && err.message) || 'Falha ao revogar.'));
  }

  function copiarLinkConvite(codigo) {
    var url = window.location.origin + '/?convite=' + codigo;
    try { navigator.clipboard.writeText(url); }
    catch (_) {
      var ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
  }

  function pagar(planoId) {
    setPagando(true); setErroPag(null);
    window.API.payCheckout(planoId, email)
      .then(url => { window.location.href = url; })
      .catch(e => { setErroPag(e.message || 'Falha ao iniciar pagamento.'); setPagando(false); });
  }

  const linha = (k, v) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12,
      padding: '12px 0', borderBottom: `1px solid ${M.border}` }}>
      <span style={{ fontSize: 13, color: M.textDim }}>{k}</span>
      <span style={{ fontSize: 13.5, color: M.text, fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
  );
  const opt = (icon, titulo, desc, onClick, danger) => (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: M.surface2, border: `1px solid ${M.border}`,
      borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: M.bg, color: danger ? M.red : M.amber,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={icon} size={18}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: danger ? '#FCA5A5' : M.text }}>{titulo}</div>
        <div style={{ fontSize: 12, color: M.textDim, marginTop: 2 }}>{desc}</div>
      </div>
      <Icon name="chevron-r" size={16} color={M.textDim}/>
    </button>
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
        borderTop: `1px solid ${M.border}`, maxHeight: '85%', overflowY: 'auto',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: M.borderHi }}/>
        </div>
        <div style={{ padding: '8px 20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            {view !== 'menu' && (
              <button onClick={() => setView('menu')} style={{
                background: 'none', border: 'none', color: M.text, cursor: 'pointer',
                padding: 0, display: 'flex',
              }}><Icon name="arrow-left" size={20}/></button>
            )}
            <div style={{ fontSize: 18, fontWeight: 700, color: M.text }}>
              {view === 'perfil' ? 'Meu perfil'
                : view === 'assinaturas' ? 'Assinatura'
                : view === 'workspace' ? 'Workspace'
                : view === 'equipe' ? 'Equipe'
                : view === 'ajuda' ? 'Ajuda e contato'
                : view === 'excluir' ? 'Excluir conta'
                : 'Conta'}
            </div>
          </div>

          {view === 'menu' && (() => {
            const list = (typeof window !== 'undefined' && window.__workspaces) || [];
            const active = window.API.workspaceActive();
            const cur = list.find(w => w.id === active);
            return (
              <AnimatedList gap={10}>
                {opt('user', 'Ver perfil', `${nome || email || '—'}`, () => setView('perfil'))}
                {opt('pin', 'Workspace',
                  cur ? `Ativo: ${cur.nome}` : 'Escolher / criar',
                  () => setView('workspace'))}
                {opt('chart', 'Gerenciar assinatura',
                  plano.plan === 'trial' ? `Teste grátis · ${plano.dias} dia(s)` : 'Plano Premium',
                  () => setView('assinaturas'))}
                {role === 'pai' && (
                  opt('user', 'Equipe',
                    'Convidar funcionários e ver atividade',
                    () => { setView('equipe'); carregarEquipe(); })
                )}
                {opt('check', 'Ajuda e contato', 'Suporte, privacidade, termos',
                  () => setView('ajuda'))}
                {opt('arrow-up-r', 'Sair da conta', 'Encerrar sessão neste aparelho',
                  () => { if (confirm('Sair da conta?')) onLogout && onLogout(); }, true)}
                {opt('x', 'Excluir minha conta', 'Apaga seu cadastro e chave Premium (LGPD)',
                  () => { setConfirmaTxt(''); setErroExc(null); setView('excluir'); }, true)}
              </AnimatedList>
            );
          })()}

          {view === 'perfil' && (
            <div>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #475569, #1E293B)',
                border: `1px solid ${M.border}`, color: M.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 20,
              }}>{((nome || email || 'MA').trim().slice(0, 2)).toUpperCase()}</div>
              {linha('Nome', nome || '—')}
              {linha('E-mail', email || '—')}
              {linha('Profissão', perfil || '—')}
              {linha('Papel', papelLabel)}
              {linha('Plano', plano.plan === 'trial' ? `Teste grátis (${plano.dias}d)` : 'Premium')}
            </div>
          )}

          {view === 'workspace' && <WorkspacePicker onSwitched={onClose}/>}

          {view === 'assinaturas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card padding={16}>
                <div style={{ fontSize: 12, color: M.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Plano atual</div>
                {plano.plan === 'trial' ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800, color: M.amber }}>Teste grátis</div>
                    <div style={{ fontSize: 13, color: M.textDim, marginTop: 4 }}>
                      Restam <b style={{ color: M.text }}>{plano.dias} dia(s)</b>. Depois, o acesso é bloqueado.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800, color: M.green }}>Premium ativo</div>
                    <div style={{ fontSize: 13, color: M.textDim, marginTop: 4 }}>
                      Acesso total. {role === 'pai' ? 'Você é o administrador.' : 'Usuário da equipe.'}
                    </div>
                  </>
                )}
              </Card>

              <div style={{ fontSize: 12, color: M.textDim, letterSpacing: 0.4,
                textTransform: 'uppercase', marginTop: 2 }}>Assinar / renovar</div>
              <div style={{ fontSize: 12, color: M.textDim, lineHeight: 1.5, marginTop: -4 }}>
                Pagamento por cartão ou Pix na página segura do Mercado Pago.
                Sua chave aparece <b style={{ color: M.text }}>na tela</b> assim
                que confirmar — com botão de copiar e login automático.
              </div>

              {[
                { id: 'mensal', t: 'Mensal', p: 'R$ 39/mês' },
                { id: 'anual', t: 'Anual', p: 'R$ 351/ano · −25%' },
                { id: 'equipe', t: 'Equipe Mensal (até 25)', p: 'R$ 149/mês' },
                { id: 'equipe_anual', t: 'Equipe Anual (até 25)', p: 'R$ 1.341/ano · −25%' },
              ].map(o => (
                <button key={o.id} disabled={pagando} onClick={() => pagar(o.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: M.surface2, border: `1px solid ${M.border}`,
                    borderRadius: 12, padding: '14px 16px', cursor: pagando ? 'wait' : 'pointer',
                  }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: M.text }}>{o.t}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: M.amber, fontWeight: 700 }}>{o.p}</span>
                    <Icon name="chevron-r" size={16} color={M.textDim}/>
                  </span>
                </button>
              ))}

              {erroPag && <div style={{ fontSize: 13, color: M.red, textAlign: 'center' }}>{erroPag}</div>}
              {pagando && <div style={{ fontSize: 12.5, color: M.textDim, textAlign: 'center' }}>Abrindo pagamento seguro…</div>}

              <button onClick={() => { if (onLogout) onLogout(); }} style={{
                marginTop: 4, background: 'transparent', border: 'none',
                color: M.textDim, fontSize: 12.5, cursor: 'pointer', padding: 8,
              }}>Já tenho a chave / trocar conta</button>

              {/* Cancelar assinatura — só pra Premium pagante ativo */}
              {plano.plan === 'premium' && role === 'pai' && !okCancel && (
                <>
                  <div style={{ marginTop: 16, paddingTop: 16,
                    borderTop: `1px solid ${M.border}` }}>
                    <div style={{ fontSize: 12, color: M.textDim,
                      letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      Cancelar
                    </div>
                    <div style={{ fontSize: 12.5, color: M.textDim,
                      lineHeight: 1.5, marginTop: 6 }}>
                      Você mantém o acesso até a validade. Não há cobrança automática
                      depois — pra renovar, basta assinar de novo.
                    </div>
                    <button onClick={cancelarAssinatura} disabled={cancelando}
                      style={{
                        marginTop: 12, width: '100%', padding: '12px 16px',
                        borderRadius: 10, background: 'transparent',
                        border: `1px solid ${M.red}66`, color: '#FCA5A5',
                        fontWeight: 700, fontSize: 13,
                        cursor: cancelando ? 'wait' : 'pointer',
                      }}>
                      {cancelando ? 'Cancelando…' : 'Cancelar minha assinatura'}
                    </button>
                  </div>
                </>
              )}
              {okCancel && (
                <div style={{
                  marginTop: 16, padding: 14, background: 'rgba(34,197,94,0.08)',
                  border: `1px solid ${M.green}55`, borderRadius: 10,
                  fontSize: 13, color: M.green, lineHeight: 1.5,
                }}>
                  ✓ Assinatura cancelada. Acesso mantido até <b style={{ color: M.text }}>
                    {new Date(okCancel.valido_ate).toLocaleDateString('pt-BR')}
                  </b>.
                </div>
              )}
            </div>
          )}

          {view === 'equipe' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12.5, color: M.textDim, lineHeight: 1.55 }}>
                Convide até 25 funcionários. Eles cadastram grátis com o link
                e entram no <b style={{ color: M.text }}>seu workspace</b>. Toda
                ação deles aparece em <b style={{ color: M.text }}>Gestão</b>.
              </div>

              <Btn variant="primary" full icon="check" disabled={gerando}
                onClick={gerarConvite}>
                {gerando ? 'Gerando…' : 'Gerar novo link de convite'}
              </Btn>

              {erroEq && <div style={{ fontSize: 13, color: M.red,
                textAlign: 'center' }}>{erroEq}</div>}

              {equipe && (
                <>
                  <div style={{ fontSize: 12, color: M.textDim,
                    letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 8 }}>
                    Convites ({(equipe.convites || []).filter(c => c.ativo).length} ativos)
                  </div>
                  {(equipe.convites || []).length === 0 && (
                    <div style={{ fontSize: 12.5, color: M.textMute,
                      textAlign: 'center', padding: 12 }}>Nenhum convite ainda.</div>
                  )}
                  {(equipe.convites || []).map(c => (
                    <Card key={c.codigo} padding={12}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 13, fontWeight: 700,
                            color: c.ativo ? M.amber : M.textMute,
                            wordBreak: 'break-all',
                          }}>{c.codigo}</div>
                          <div style={{ fontSize: 11, color: M.textDim, marginTop: 3 }}>
                            {c.ativo
                              ? `${c.usos}/${c.maxUsos} usos · até ${new Date(c.expira).toLocaleDateString('pt-BR')}`
                              : c.revogado ? 'Revogado' : 'Expirado'}
                          </div>
                        </div>
                        {c.ativo && (
                          <>
                            <button onClick={() => copiarLinkConvite(c.codigo)}
                              title="Copiar link"
                              style={{
                                background: M.amber, color: '#0E1117', border: 'none',
                                borderRadius: 8, padding: '6px 10px',
                                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                              }}>
                              Copiar link
                            </button>
                            <button onClick={() => revogarConvite(c.codigo)}
                              title="Revogar"
                              style={{
                                background: 'transparent', color: M.textDim,
                                border: `1px solid ${M.border}`,
                                borderRadius: 8, padding: '6px 10px',
                                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                              }}>×</button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}

                  <div style={{ fontSize: 12, color: M.textDim,
                    letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 14 }}>
                    Membros ({(equipe.membros || []).length})
                  </div>
                  {(equipe.membros || []).length === 0 && (
                    <div style={{ fontSize: 12.5, color: M.textMute,
                      textAlign: 'center', padding: 12 }}>
                      Ninguém entrou ainda. Gere e compartilhe um link acima.
                    </div>
                  )}
                  {(equipe.membros || []).map(m => (
                    <Card key={m.email} padding={12}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #475569, #1E293B)',
                          color: M.text, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontWeight: 700, fontSize: 12,
                        }}>{m.email.slice(0, 2).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: M.text, fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' }}>{m.email}</div>
                          <div style={{ fontSize: 11, color: M.textDim, marginTop: 2 }}>
                            Trial até {new Date(m.ate).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {view === 'ajuda' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card padding={16}>
                <div style={{ fontSize: 12, color: M.textDim, textTransform: 'uppercase',
                  letterSpacing: 0.4, marginBottom: 6 }}>Suporte</div>
                <div style={{ fontSize: 14, color: M.text, lineHeight: 1.5 }}>
                  Dúvidas, bugs, sugestões? Manda e-mail — respondo em até 24h em dias úteis.
                </div>
                <a href="mailto:junqueiraeduardo2@gmail.com?subject=Maestro%20-%20Suporte"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12,
                    padding: '10px 14px', background: M.amber, color: '#0E1117',
                    borderRadius: 10, fontWeight: 700, fontSize: 13.5,
                    textDecoration: 'none',
                  }}>
                  <Icon name="check" size={14}/>
                  junqueiraeduardo2@gmail.com
                </a>
              </Card>
              <a href="/sobre.html" target="_blank" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: M.surface2, border: `1px solid ${M.border}`,
                borderRadius: 12, padding: '14px 16px', textDecoration: 'none', color: M.text,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Sobre o Maestro</span>
                <Icon name="chevron-r" size={16} color={M.textDim}/>
              </a>
              <a href="/privacidade.html" target="_blank" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: M.surface2, border: `1px solid ${M.border}`,
                borderRadius: 12, padding: '14px 16px', textDecoration: 'none', color: M.text,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Política de Privacidade</span>
                <Icon name="chevron-r" size={16} color={M.textDim}/>
              </a>
              <a href="/termos.html" target="_blank" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: M.surface2, border: `1px solid ${M.border}`,
                borderRadius: 12, padding: '14px 16px', textDecoration: 'none', color: M.text,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Termos de Uso</span>
                <Icon name="chevron-r" size={16} color={M.textDim}/>
              </a>
              <div style={{ fontSize: 11.5, color: M.textMute, textAlign: 'center',
                marginTop: 8, lineHeight: 1.6 }}>
                Maestro CMMS · versão de produção
              </div>
            </div>
          )}

          {view === 'excluir' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: `1px solid ${M.red}44`,
                borderRadius: 12, padding: 14, color: '#FCA5A5', fontSize: 13.5, lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: M.red }}>
                  Isto é irreversível
                </div>
                Vamos apagar do nosso servidor:
                <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
                  <li>seu e-mail, nome e senha (hash)</li>
                  <li>sua chave Premium ativa (se houver)</li>
                </ul>
                <div style={{ marginTop: 10, fontSize: 12.5, color: '#FCA5A5BB' }}>
                  Dados operacionais do <b>workspace</b> (peças, OS, equipamentos)
                  PERMANECEM, pois pertencem à empresa, não a você. Se você é o único usuário,
                  ninguém mais terá acesso a eles.
                </div>
                {plano.plan !== 'trial' && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: '#FCA5A5BB' }}>
                    <b>Importante:</b> a cobrança recorrente do Mercado Pago precisa ser
                    cancelada por você no painel do MP. Excluir a conta aqui não cancela
                    o cartão.
                  </div>
                )}
              </div>

              <div style={{ fontSize: 13, color: M.textDim }}>
                Para confirmar, digite <b style={{ color: M.text }}>EXCLUIR</b> abaixo:
              </div>
              <input type="text" value={confirmaTxt}
                onChange={e => setConfirmaTxt(e.target.value)}
                placeholder="EXCLUIR"
                autoCapitalize="characters"
                style={{
                  width: '100%', padding: '14px 16px',
                  background: M.bg, color: M.text,
                  border: `1px solid ${erroExc ? M.red : M.border}`,
                  borderRadius: 10, fontSize: 15, fontWeight: 600,
                  letterSpacing: 1, textAlign: 'center',
                  outline: 'none',
                }}/>
              {erroExc && (
                <div style={{ fontSize: 13, color: M.red, textAlign: 'center' }}>
                  {erroExc}
                </div>
              )}
              <button onClick={excluir} disabled={excluindo}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 10,
                  background: M.red, color: '#fff', border: 'none',
                  fontWeight: 800, fontSize: 14, cursor: excluindo ? 'wait' : 'pointer',
                  opacity: excluindo ? 0.6 : 1,
                }}>
                {excluindo ? 'Excluindo…' : 'Excluir minha conta para sempre'}
              </button>
              <button onClick={() => setView('menu')} style={{
                background: 'transparent', border: 'none', color: M.textDim,
                fontSize: 13, cursor: 'pointer', padding: 8,
              }}>Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Workspace picker dentro do UserMenu — listar / trocar / criar
function WorkspacePicker({ onSwitched }) {
  const [list, setList] = useState(window.__workspaces || null);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoSlug, setNovoSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState(null);
  const active = window.API.workspaceActive();

  function carregar() {
    setErro(null);
    API.workspaceList()
      .then(r => { setList(r.workspaces || []); window.__workspaces = r.workspaces || []; })
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(() => { if (list === null) carregar(); }, []);

  function trocar(id) {
    if (id === active) return;
    window.API.workspaceSetActive(id);
    // Reload garante que toda tela busque dados do novo workspace.
    location.reload();
  }
  function criar() {
    const nome = novoNome.trim();
    const slug = (novoSlug.trim() || nome).toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!nome) { setErro('Informe um nome.'); return; }
    setBusy(true); setErro(null);
    API.workspaceCreate({ slug, nome })
      .then(r => {
        window.API.workspaceSetActive(r.workspace.id);
        location.reload();
      })
      .catch(e => { setErro(e.message || 'Falha ao criar workspace.'); setBusy(false); });
  }

  const inputStyle = {
    width: '100%', background: M.bg, border: `1px solid ${M.border}`,
    borderRadius: 10, padding: '12px 14px', color: M.text,
    fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, color: M.textDim, lineHeight: 1.5 }}>
        Cada workspace é um espaço isolado (loja, fazenda, unidade). Os dados
        não se misturam entre eles.
      </div>
      {list === null ? (
        <ScreenLoader label="Carregando…"/>
      ) : list.length === 0 ? (
        <Card padding={14}>
          <div style={{ fontSize: 13, color: M.textDim }}>Nenhum workspace ainda.</div>
        </Card>
      ) : (
        <AnimatedList gap={8}>
          {list.map(w => {
            const on = w.id === active;
            return (
              <button key={w.id} onClick={() => trocar(w.id)} style={{
                width: '100%', textAlign: 'left', cursor: on ? 'default' : 'pointer',
                background: on ? '#3B2A0E' : M.surface2,
                border: `1px solid ${on ? M.amber : M.border}`,
                borderRadius: 12, padding: 14,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: M.bg, color: on ? M.amber : M.textDim,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Icon name="pin" size={16}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: M.text }}>{w.nome}</div>
                  <div style={{ fontSize: 11, color: M.textDim, marginTop: 2,
                    fontFamily: "'JetBrains Mono', monospace" }}>{w.slug}</div>
                </div>
                {on && <Tag tone="amber">ativo</Tag>}
              </button>
            );
          })}
        </AnimatedList>
      )}

      {!criando ? (
        <Btn variant="ghost" full icon="plus" onClick={() => setCriando(true)}>
          Novo workspace
        </Btn>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={inputStyle} placeholder="Nome (ex.: Loja Centro)"
            value={novoNome} onChange={e => setNovoNome(e.target.value)}/>
          <input style={inputStyle} placeholder="Slug (ex.: loja-centro — opcional)"
            value={novoSlug} onChange={e => setNovoSlug(e.target.value)}/>
          {erro && <div style={{ fontSize: 13, color: M.red }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" full onClick={() => { setCriando(false); setErro(null); }}>Cancelar</Btn>
            <Btn variant="primary" full icon="check" disabled={busy} onClick={criar}>
              {busy ? 'Criando…' : 'Criar e ativar'}
            </Btn>
          </div>
        </div>
      )}
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
  const [todos, setTodos] = useState(null);  // lista completa (A→Z)
  const [res, setRes] = useState(null);       // null = mostra todos; [] = busca vazia
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [verTudo, setVerTudo] = useState(false); // ignora filtro de perfil
  const [flash, flashNode] = useFlash();

  function carregarTodos() {
    API.pecaSearch('', verTudo)
      .then(r => setTodos(r.pecas || []))
      .catch(() => setTodos([]));
  }
  useEffect(carregarTodos, [verTudo]);

  // busca real com debounce (só quando há termo)
  useEffect(() => {
    const termo = q.trim();
    if (!termo) { setRes(null); setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(() => {
      API.pecaSearch(termo, verTudo)
        .then(r => setRes(r.pecas || []))
        .catch(() => setRes([]))
        .finally(() => setBusy(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q, verTudo]);

  function recarregarBusca() {
    carregarTodos();
    if (!q.trim()) return;
    API.pecaSearch(q.trim(), verTudo).then(r => setRes(r.pecas || [])).catch(() => {});
  }

  // O que aparece na lista: resultado da busca (se digitando) OU todos.
  const lista = q.trim() ? res : todos;
  const sorted = (lista || []).slice().sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
  );

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

        {(() => {
          let perf = ''; try { perf = localStorage.getItem('maestro_perfil') || ''; } catch (_) {}
          if (!perf) return null;
          return (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 8, marginTop: 10, fontSize: 11.5, color: M.textMute, letterSpacing: 0.3,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="user" size={12} color={M.textMute}/>
                {verTudo
                  ? <>Mostrando <b style={{ color: M.amber }}>todas as peças</b> (qualquer perfil)</>
                  : <>Filtro: perfil <b style={{ color: M.amber }}>{perf}</b></>}
              </span>
              <button onClick={() => setVerTudo(v => !v)} style={{
                background: 'transparent', border: 'none', color: M.amber,
                cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: 0,
              }}>{verTudo ? 'Filtrar' : 'Ver tudo'}</button>
            </div>
          );
        })()}

        <div style={{ marginTop: 16 }}>
          {/* Loader inicial */}
          {todos === null && !q.trim() && <SkeletonList rows={4} h={70}/>}
          {busy && <ScreenLoader label="Buscando…"/>}

          {/* Busca sem resultado */}
          {!busy && q.trim() && res && res.length === 0 && (
            <EmptyState icon="search" title="Não achei essa peça"
              body={`Procurei por "${q}" no estoque e não veio nada. Você pode cadastrar agora.`}
              action="Cadastrar peça" onAction={() => setSheet('nova')}/>
          )}

          {/* Sem peças cadastradas ainda */}
          {!busy && !q.trim() && todos && todos.length === 0 && (
            <EmptyState icon="box" title="Seu estoque está vazio"
              body="Cadastre a primeira peça para começar — ou peça ao microfone (botão amarelo abaixo)."
              action="Cadastrar peça" onAction={() => setSheet('nova')}/>
          )}

          {/* Lista (A→Z): resultado da busca ou todos */}
          {!busy && sorted.length > 0 && (() => {
            const valorTotal = sorted.reduce((acc, p) =>
              acc + (p.preco != null ? Number(p.preco) * Number(p.qtd || 0) : 0), 0);
            const fmtBRL = (n) => 'R$ ' + n.toLocaleString('pt-BR', {
              minimumFractionDigits: 2, maximumFractionDigits: 2,
            });
            return (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                margin: '4px 4px 10px', fontSize: 11, color: M.textDim,
                textTransform: 'uppercase', letterSpacing: 0.6,
              }}>
                <span>{sorted.length} {sorted.length === 1 ? 'peça' : 'peças'}{q.trim() ? '' : ' no estoque'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: M.amber }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h13"/><path d="M3 12h9"/><path d="M3 18h6"/>
                    <path d="M17 4v16"/><path d="m13 16 4 4 4-4"/>
                  </svg>
                  A → Z
                </span>
              </div>
              {valorTotal > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: M.surface2, border: `1px solid ${M.border}`,
                  borderRadius: 12, padding: '12px 14px', marginBottom: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: M.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Valor total do estoque
                    </div>
                    <div style={{ fontSize: 11, color: M.textMute, marginTop: 2 }}>
                      {q.trim() ? 'desta busca' : 'das peças com preço cadastrado'}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 18, fontWeight: 700, color: M.green,
                  }}>{fmtBRL(valorTotal)}</div>
                </div>
              )}
              <AnimatedList gap={8}>
                {sorted.map(p => (
                  <PartRow key={p.sku} part={p} onClick={() => setSheet({ edit: p })}/>
                ))}
              </AnimatedList>
            </>
            );
          })()}
        </div>
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
          onSaved={() => { setSheet(null); flash('Peça atualizada'); recarregarBusca(); }}
          onDeleted={() => { setSheet(null); flash('Peça excluída'); recarregarBusca(); }}/>
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
        <div style={{ fontSize: 12, color: M.textDim, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="pin" size={12}/> {part.loc || '—'}
          </span>
          {part.tutorial && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: M.amber }}>
              <Icon name="play" size={11}/> tutorial
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700,
          color: part.qtd < (part.ponto || 6) ? M.red : M.green,
        }}>{part.qtd}</div>
        <div style={{ fontSize: 10, color: M.textDim }}>un.</div>
      </div>
    </button>
  );
}

// Sheet: cadastrar (sem `peca`) ou editar (com `peca`) uma peça do estoque
function PartForm({ peca, onClose, onSaved, onDeleted }) {
  const editando = !!peca;
  const ex = exemplosPerfil();
  const [sku, setSku] = useState(peca ? peca.sku : '');
  const [nome, setNome] = useState(peca ? peca.nome : '');
  const [qtd, setQtd] = useState(String(peca ? peca.qtd : 0));
  const [loc, setLoc] = useState(peca ? (peca.loc || '') : '');
  const [cat, setCat] = useState(peca ? (peca.cat || '') : '');
  const [tut, setTut] = useState(peca ? (peca.tutorial || '') : '');
  const [ponto, setPonto] = useState(peca && peca.ponto != null ? String(peca.ponto) : '');
  const [preco, setPreco] = useState(peca && peca.preco != null
    ? String(peca.preco).replace('.', ',') : '');
  // universal = visível em todos os perfis (perfil = 'TODOS'). Default: false.
  const [universal, setUniversal] = useState(peca ? peca.perfil === 'TODOS' : false);
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
    const perfilAtual = (function () {
      try { return localStorage.getItem('maestro_perfil') || ''; } catch (_) { return ''; }
    })();
    const payload = {
      nome: nome.trim(),
      quantidade: parseInt(qtd, 10) || 0,
      localizacao_fisica: loc.trim(),
      categoria: cat.trim(),
      tutorial_url: tut.trim(),
      ponto_reposicao: ponto.trim() === '' ? null : (parseInt(ponto, 10) || 0),
      preco: preco.trim() === '' ? null : preco.trim().replace(',', '.'),
      perfil: universal ? 'TODOS' : perfilAtual,
    };
    const p = editando
      ? API.pecaUpdate(peca.sku, payload)
      : API.pecaCreate({ ...payload, sku: sku.trim() });
    p.then(onSaved).catch(e => { setErro(e.message || 'Falha ao salvar.'); setBusy(false); });
  }

  function excluir() {
    if (!confirm(`Excluir a peça ${peca.sku}? Esta ação não pode ser desfeita.`)) return;
    setBusy(true); setErro(null);
    API.pecaDelete(peca.sku)
      .then(() => onDeleted())
      .catch(e => { setErro(e.message || 'Falha ao excluir.'); setBusy(false); });
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
              <input style={inputStyle} placeholder={`SKU (ex.: ${ex.sku})`}
                value={sku} onChange={e => setSku(e.target.value)}/>
            )}
            <input style={inputStyle} placeholder={`Nome da peça (ex.: ${ex.nome})`}
              value={nome} onChange={e => setNome(e.target.value)}/>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 6 }}>Quantidade</div>
                <input style={inputStyle} type="number" min="0"
                  value={qtd} onChange={e => setQtd(e.target.value)}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 6 }}>Local</div>
                <input style={inputStyle} placeholder={ex.loc}
                  value={loc} onChange={e => setLoc(e.target.value)}/>
              </div>
            </div>
            <input style={inputStyle} placeholder={`Categoria — ex.: ${ex.cat} (opcional)`}
              value={cat} onChange={e => setCat(e.target.value)}/>
            <div>
              <div style={{ fontSize: 12, color: M.textDim, marginBottom: 6 }}>
                Vídeo tutorial (link YouTube — opcional)
              </div>
              <input style={inputStyle} type="url" inputMode="url"
                placeholder="https://youtu.be/..."
                value={tut} onChange={e => setTut(e.target.value)}/>
              {/^https?:\/\//.test(tut.trim()) && (
                <a href={tut.trim()} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 8, fontSize: 13, color: M.amber, fontWeight: 600,
                    textDecoration: 'none' }}>
                  <Icon name="play" size={14}/> Abrir tutorial
                </a>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 6 }}>
                  Preço unitário (R$)
                </div>
                <input style={inputStyle} inputMode="decimal"
                  placeholder="ex.: 89,90"
                  value={preco} onChange={e => setPreco(e.target.value)}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: M.textDim, marginBottom: 6 }}>
                  Ponto de reposição
                </div>
                <input style={inputStyle} type="number" min="0"
                  placeholder="ex.: 6"
                  value={ponto} onChange={e => setPonto(e.target.value)}/>
              </div>
            </div>
            {(() => {
              const perfilAtual = (function () {
                try { return localStorage.getItem('maestro_perfil') || ''; } catch (_) { return ''; }
              })();
              const dono = editando ? (peca.perfil || perfilAtual) : perfilAtual;
              return (
                <div style={{
                  background: M.bg, border: `1px solid ${M.border}`,
                  borderRadius: 10, padding: 12,
                }}>
                  <div style={{ fontSize: 12, color: M.textDim, marginBottom: 6 }}>
                    Aparece para
                  </div>
                  <div style={{ fontSize: 14, color: M.text, fontWeight: 600 }}>
                    {universal ? 'Todos os perfis' : (dono || '—')}
                  </div>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
                    fontSize: 13, color: M.textDim, cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={universal}
                      onChange={(e) => setUniversal(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: M.amber }}/>
                    Visível para todos os perfis
                  </label>
                </div>
              );
            })()}
            {editando && (
              <a
                href={window.API.mlBusca(peca.nome, peca.cat)}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'transparent', border: `1px solid ${M.amber}55`,
                  color: M.amber, borderRadius: 10, padding: '12px 0',
                  fontSize: 14, fontWeight: 700, textDecoration: 'none',
                }}>
                <Icon name="cart" size={16}/> Buscar fornecedor no Mercado Livre
              </a>
            )}
            {erro && <div style={{ fontSize: 13, color: M.red }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" full onClick={onClose}>Cancelar</Btn>
              <Btn variant="primary" full icon="check" disabled={busy} onClick={salvar}>
                {busy ? 'Salvando…' : 'Salvar'}
              </Btn>
            </div>
            {editando && window.API.role() === 'pai' && (
              <button onClick={excluir} disabled={busy} style={{
                marginTop: 6, background: 'transparent', border: `1px solid ${M.red}55`,
                color: '#FCA5A5', borderRadius: 10, padding: '12px 0',
                fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
              }}>Excluir peça</button>
            )}
            {editando && window.API.role() !== 'pai' && (
              <div style={{ fontSize: 11.5, color: M.textMute, textAlign: 'center', marginTop: 4 }}>
                Só o administrador pode excluir.
              </div>
            )}
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

      {lista === null && !erro && (
        <div style={{ padding: 16 }}><SkeletonList rows={4} h={92}/></div>
      )}
      {erro && (
        <EmptyState icon="alert" title="Erro" body={erro}
          action="Tentar de novo" onAction={carregar}/>
      )}
      {lista && (
        <div style={{ padding: '16px' }}>
          <AnimatedList gap={10}>
            {filtered.map(o => (
              <OsCard key={o.id} os={o} onClick={() => nav.push('os-detail', { id: o.id })}/>
            ))}
          </AnimatedList>
          {filtered.length === 0 && (
            <EmptyState icon="wrench" title="Tudo em ordem por aqui"
              body="Nenhuma OS com esse status. Quando algo precisar de manutenção, abra por aqui."
              action="Abrir uma OS" onAction={() => setNovo(true)}/>
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
  function excluirOs() {
    if (!confirm(`Excluir a ${os.codigo}? Não pode ser desfeito.`)) return;
    setBusy(true);
    API.osDelete(os.codigo)
      .then(() => nav.pop())
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
            {concluida && <Stamp cor={M.green}>concluída</Stamp>}
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

        {window.API.role() === 'pai' && (
          <button onClick={excluirOs} disabled={busy} style={{
            background: 'transparent', border: `1px solid ${M.red}55`,
            color: '#FCA5A5', borderRadius: 10, padding: '12px 0',
            fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
          }}>Excluir OS</button>
        )}
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
  const [verTudo, setVerTudo] = useState(false);

  const [novo, setNovo] = useState(false);
  function carregar() {
    setErro(null);
    API.equipList(undefined, undefined, verTudo)
      .then(r => setTodos(r.equipamentos || []))
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(carregar, [verTudo]);

  const types = ['todos', ...new Set((todos || []).map(e => e.tipo).filter(Boolean))];
  const filtered = (todos || []).filter(e =>
    (type === 'todos' || e.tipo === type) &&
    (q === '' || e.nome.toLowerCase().includes(q.toLowerCase()) ||
      (e.placa || '').toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
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

      {(() => {
        let perf = ''; try { perf = localStorage.getItem('maestro_perfil') || ''; } catch (_) {}
        if (!perf) return null;
        return (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, padding: '8px 16px 0', fontSize: 11.5, color: M.textMute, letterSpacing: 0.3,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="user" size={12} color={M.textMute}/>
              {verTudo
                ? <>Mostrando <b style={{ color: M.amber }}>todos os equipamentos</b></>
                : <>Filtro: perfil <b style={{ color: M.amber }}>{perf}</b></>}
            </span>
            <button onClick={() => setVerTudo(v => !v)} style={{
              background: 'transparent', border: 'none', color: M.amber,
              cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: 0,
            }}>{verTudo ? 'Filtrar' : 'Ver tudo'}</button>
          </div>
        );
      })()}

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

      {todos === null && !erro && (
        <div style={{ padding: '4px 12px' }}><SkeletonList rows={5} h={76}/></div>
      )}
      {erro && (
        <EmptyState icon="alert" title="Erro" body={erro}
          action="Tentar de novo" onAction={carregar}/>
      )}
      {todos && (
        <div style={{ padding: '4px 12px' }}>
          {filtered.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              margin: '4px 4px 10px', fontSize: 11, color: M.textDim,
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              <span>{filtered.length} {filtered.length === 1 ? 'equipamento' : 'equipamentos'}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: M.amber }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h13"/><path d="M3 12h9"/><path d="M3 18h6"/>
                  <path d="M17 4v16"/><path d="m13 16 4 4 4-4"/>
                </svg>
                A → Z
              </span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(e => (
              <EquipRow key={e.id} equip={e} onClick={() => nav.push('equip-detail', { id: e.id })}/>
            ))}
            {filtered.length === 0 && (
              <EmptyState icon="truck" title="Nenhum aqui ainda"
                body="Ajuste o filtro ou cadastre o primeiro equipamento da sua operação."
                action="Cadastrar equipamento" onAction={() => setNovo(true)}/>
            )}
          </div>
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
  const ex = exemplosPerfil();
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
    let perf = '';
    try { perf = localStorage.getItem('maestro_perfil') || ''; } catch (_) {}
    API.equipCreate({
      codigo: codigo.trim(), nome: nome.trim(), tipo: tipo.trim(),
      modelo: modelo.trim(), ano: ano ? parseInt(ano, 10) : null, placa: placa.trim(),
      perfil: perf || null,
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
            <input style={inputStyle} placeholder={`Código (ex.: ${ex.eqCod})`}
              value={codigo} onChange={e => setCodigo(e.target.value)}/>
            <input style={inputStyle} placeholder={`Nome (ex.: ${ex.eqNome})`}
              value={nome} onChange={e => setNome(e.target.value)}/>
            <input style={inputStyle} placeholder={`Tipo (ex.: ${ex.eqTipo})`}
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

  function excluirEquip() {
    if (!confirm(`Excluir o equipamento ${params.id}? As OS dele ficam sem equipamento. Não pode ser desfeito.`)) return;
    setSavingStatus(true);
    API.equipDelete(params.id)
      .then(() => nav.pop())
      .catch(e => { setErro(e.message || 'Falha ao excluir.'); setSavingStatus(false); });
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
        {window.API.role() === 'pai' && (
          <button onClick={excluirEquip} disabled={savingStatus} style={{
            background: 'transparent', border: `1px solid ${M.red}55`,
            color: '#FCA5A5', borderRadius: 10, padding: '12px 0',
            fontSize: 14, fontWeight: 700, cursor: savingStatus ? 'wait' : 'pointer',
          }}>Excluir equipamento</button>
        )}
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
    { label: 'OS abertas', dica: 'ordens de serviço ainda não concluídas', valor: osAb, cor: M.amber },
    { label: 'Em andamento', dica: 'OS com trabalho em execução', valor: osAnd, cor: M.text },
    { label: 'Equip. parados', dica: 'máquinas fora de operação', valor: eqParado.length, cor: eqParado.length ? M.red : M.green },
    { label: 'Equipamentos', dica: 'total cadastrado', valor: eq.length, cor: M.text },
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
              }}><CountUp to={k.valor}/></div>
              <div style={{ fontSize: 11, color: M.textMute, marginTop: 6, lineHeight: 1.3 }}>
                {k.dica}
              </div>
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
                  fontFamily: "'JetBrains Mono', monospace" }}><CountUp to={s.n}/></div>
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

// =========================================================================
// SCREEN 8 — INSPEÇÃO DO DIA (checklist pré-operacional)
// =========================================================================
const CHECKLIST = [
  'Nível de óleo / fluidos',
  'Vazamentos visíveis',
  'Pneus / esteiras / lagartas',
  'Freios',
  'Iluminação e sinalização',
  'Ruídos anormais',
];

function InspecaoScreen({ nav }) {
  const [equips, setEquips] = useState(null);
  const [feitas, setFeitas] = useState([]);
  const [erro, setErro] = useState(null);
  const [alvo, setAlvo] = useState(null); // equipamento sendo inspecionado
  const [flash, flashNode] = useFlash();

  function carregar() {
    setErro(null);
    Promise.all([API.equipList(), API.inspecoesHoje()])
      .then(([a, b]) => { setEquips(a.equipamentos || []); setFeitas(b.inspecoes || []); })
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(carregar, []);

  const feitasSet = new Set(feitas.map(i => i.equipId));

  return (
    <div data-screen-label="08 Inspeção" style={{ paddingBottom: 110 }}>
      <TopBar title="INSPEÇÃO DO DIA" onBack={() => nav.go('home')}/>

      {equips === null && !erro && <ScreenLoader label="Carregando…"/>}
      {erro && (
        <EmptyState icon="alert" title="Erro" body={erro}
          action="Tentar de novo" onAction={carregar}/>
      )}
      {equips && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: M.textDim, lineHeight: 1.5 }}>
            Marque a inspeção pré-operacional de cada equipamento. Pendentes primeiro.
          </div>

          {equips.length === 0 && (
            <EmptyState icon="truck" title="Nada para inspecionar ainda"
              body="A inspeção do dia roda em cima dos seus equipamentos. Cadastre o primeiro pra começar."
              action="Ir para Equipamentos" onAction={() => nav.go('equip')}/>
          )}

          {equips.slice().sort((a, b) =>
            (feitasSet.has(a.id) ? 1 : 0) - (feitasSet.has(b.id) ? 1 : 0)
          ).map(e => {
            const feita = feitas.find(i => i.equipId === e.id);
            return (
              <Card key={e.id} padding={14}
                accentColor={feita ? (feita.ok ? M.green : M.red) : M.amber}
                style={{ paddingLeft: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: M.text }}>{e.nome}</div>
                    <div style={{ fontSize: 12, color: M.textDim, marginTop: 3 }}>
                      {feita
                        ? `Inspecionado ${feita.hora} · ${feita.ok ? 'sem problema' : 'com problema'}`
                        : 'Pendente hoje'}
                    </div>
                  </div>
                  {feita ? (
                    <Icon name={feita.ok ? 'check' : 'alert'} size={20}
                      color={feita.ok ? M.green : M.red}/>
                  ) : (
                    <Btn variant="primary" size="sm" onClick={() => setAlvo(e)}>Inspecionar</Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {flashNode}

      {alvo && (
        <ChecklistSheet equip={alvo}
          onClose={() => setAlvo(null)}
          onSaved={(ok) => {
            setAlvo(null);
            flash(ok ? 'Inspeção OK registrada' : 'Inspeção com problema registrada');
            carregar();
          }}/>
      )}
    </div>
  );
}

function ChecklistSheet({ equip, onClose, onSaved }) {
  const [resp, setResp] = useState(CHECKLIST.map(item => ({ item, ok: true, obs: '' })));
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState(null);

  function set(i, patch) {
    setResp(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function salvar() {
    setBusy(true); setErro(null);
    API.inspecaoCreate({ equipId: equip.id, itens: resp, operador: 'Operador' })
      .then(r => onSaved(r.semProblema !== false))
      .catch(e => { setErro(e.message || 'Falha ao salvar.'); setBusy(false); });
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
        borderTop: `1px solid ${M.border}`, maxHeight: '90%', overflowY: 'auto',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: M.borderHi }}/>
        </div>
        <div style={{ padding: '8px 20px 28px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: M.text }}>{equip.nome}</div>
          <div style={{ fontSize: 12, color: M.textDim, margin: '4px 0 18px' }}>
            Inspeção pré-operacional
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {resp.map((x, i) => (
              <div key={i} style={{
                background: M.bg, border: `1px solid ${M.border}`,
                borderRadius: 12, padding: 12,
              }}>
                <div style={{ fontSize: 14, color: M.text, fontWeight: 600, marginBottom: 8 }}>{x.item}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => set(i, { ok: true })} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                    background: x.ok ? M.green : 'transparent',
                    color: x.ok ? '#0E1117' : M.textDim,
                    border: `1px solid ${x.ok ? M.green : M.border}`,
                    fontWeight: 700, fontSize: 13,
                  }}>OK</button>
                  <button onClick={() => set(i, { ok: false })} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                    background: !x.ok ? M.red : 'transparent',
                    color: !x.ok ? '#fff' : M.textDim,
                    border: `1px solid ${!x.ok ? M.red : M.border}`,
                    fontWeight: 700, fontSize: 13,
                  }}>Problema</button>
                </div>
                {!x.ok && (
                  <input value={x.obs} onChange={e => set(i, { obs: e.target.value })}
                    placeholder="O que está errado?"
                    style={{
                      width: '100%', marginTop: 8, background: M.surface,
                      border: `1px solid ${M.border}`, borderRadius: 8,
                      padding: '10px 12px', color: M.text, fontSize: 14,
                      fontFamily: 'Inter, sans-serif', outline: 'none',
                    }}/>
                )}
              </div>
            ))}
            {erro && <div style={{ fontSize: 13, color: M.red }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" full onClick={onClose}>Cancelar</Btn>
              <Btn variant="primary" full icon="check" disabled={busy} onClick={salvar}>
                {busy ? 'Salvando…' : 'Concluir inspeção'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =========================================================================
// SCREEN 9 — GESTÃO (somente o "pai"/admin): quem usou e o que fez
// =========================================================================
function GestaoScreen({ nav }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState(null);

  function carregar() {
    setErro(null);
    API.atividade()
      .then(r => setLista(r.atividade || []))
      .catch(e => setErro(e.message || 'Falha ao carregar.'));
  }
  useEffect(carregar, []);

  const atores = lista
    ? Array.from(new Set(lista.map(a => a.ator))).slice(0, 12)
    : [];

  return (
    <div data-screen-label="09 Gestão" style={{ paddingBottom: 110 }}>
      <TopBar title="GESTÃO" mono onBack={nav.pop}/>

      {lista === null && !erro && <ScreenLoader label="Carregando atividade…"/>}
      {erro && (
        <EmptyState icon="alert" title="Acesso restrito" body={erro}
          action="Voltar" onAction={nav.pop}/>
      )}
      {lista && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card padding={14}>
            <div style={{ fontSize: 12, color: M.textDim, letterSpacing: 0.4,
              textTransform: 'uppercase', marginBottom: 8 }}>Quem está usando</div>
            {atores.length === 0 ? (
              <div style={{ fontSize: 13, color: M.textDim }}>Sem atividade ainda.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {atores.map(a => (
                  <span key={a} style={{
                    background: M.surface2, border: `1px solid ${M.border}`,
                    borderRadius: 999, padding: '6px 12px', fontSize: 12.5,
                    color: M.text, fontWeight: 600,
                  }}>{a}</span>
                ))}
              </div>
            )}
          </Card>

          <div>
            <SectionHeader>Atividade recente</SectionHeader>
            {lista.length === 0 ? (
              <Card padding={16}>
                <div style={{ fontSize: 13, color: M.textDim }}>
                  Nada registrado ainda. As ações da equipe aparecem aqui.
                </div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1,
                background: M.border, borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${M.border}` }}>
                {lista.map((a, i) => (
                  <div key={i} style={{
                    background: M.surface, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: M.text, fontWeight: 600 }}>
                        {a.ator} <span style={{ color: M.textDim, fontWeight: 400 }}>{a.acao}</span> <span style={{ color: M.amber, fontFamily: "'JetBrains Mono', monospace" }}>{a.alvo}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: M.textDim, marginTop: 2 }}>
                        {a.quando} · {a.papel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  HomeScreen, PartsScreen, OsListScreen, OsDetailScreen,
  EquipListScreen, EquipDetailScreen, DashScreen, InspecaoScreen,
  GestaoScreen,
});
