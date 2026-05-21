// app.jsx — Maestro: shell de navegação + voz REAL (Web Speech API + backend)
//
// Diferente do protótipo (voz simulada), aqui:
//   fala  -> Web Speech API (SpeechRecognition, pt-BR)
//   texto -> POST /api/process-voice  ->  { fala, intencao, dados }
//   resposta -> speechSynthesis (TTS pt-BR) + card desenhado com `dados`
//
// Módulos OS / Equipamentos / Dashboard ainda usam data.js (mock) — sem
// backend próprio por enquanto. O fluxo de voz/almoxarifado é REAL.

const { useState: useS, useEffect: useE, useRef: useR } = React;

const API_URL = "/api/process-voice";
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const VOICE_OK = !!SR;

// ---------------------------------------------------------------------------
// TTS — fala a resposta. "nice to have": se falhar, o texto já está na tela.
// ---------------------------------------------------------------------------
function falar(texto) {
  if (!("speechSynthesis" in window) || !texto) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Conteúdo da bottom sheet de voz: 'listening' | 'thinking' | 'result'
// ---------------------------------------------------------------------------
function VoiceSheet({ phase, transcript, resp, onClose }) {
  if (phase === "listening") {
    return (
      <div style={{ padding: "8px 20px 32px" }}>
        <div style={{
          textAlign: "center", marginBottom: 16,
          fontSize: 11, color: M.amber, letterSpacing: 1.5, fontWeight: 700,
        }}>ESCUTANDO…</div>
        <div style={{
          background: M.surface2, border: `1px solid ${M.border}`,
          borderRadius: 12, padding: 18, marginBottom: 16,
          minHeight: 64, display: "flex", alignItems: "center",
          justifyContent: "center", textAlign: "center",
        }}>
          {transcript ? (
            <div style={{ fontSize: 17, color: M.text, lineHeight: 1.4, fontWeight: 500 }}>
              "{transcript}"
            </div>
          ) : (
            <div style={{ fontSize: 14, color: M.textDim, fontStyle: "italic" }}>
              Fale agora…
            </div>
          )}
        </div>
        <Waveform/>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: M.textDim }}>
          Toque no microfone para parar
        </div>
      </div>
    );
  }

  if (phase === "thinking") {
    return (
      <div style={{ padding: "32px 20px 40px", textAlign: "center" }}>
        {transcript && (
          <div style={{
            background: M.bg, border: `1px solid ${M.border}`,
            borderRadius: 10, padding: "10px 14px", marginBottom: 22,
            fontSize: 13, color: M.textDim, fontStyle: "italic",
          }}>"{transcript}"</div>
        )}
        <div style={{
          width: 34, height: 34, margin: "0 auto 16px", borderRadius: "50%",
          border: `3px solid ${M.border}`, borderTopColor: M.amber,
          animation: "maestro-spin .8s linear infinite",
        }}/>
        <div style={{ fontSize: 14, color: M.textDim }}>Processando comando…</div>
      </div>
    );
  }

  // ----- RESULT -----
  const { intencao, fala, dados } = resp || {};

  // BUSCAR com peça encontrada
  if (intencao === "buscar" && dados) {
    const baixo = Number(dados.quantidade) < 6;
    return (
      <div style={{ padding: "4px 20px 24px" }}>
        <ResultHeader transcript={transcript} icon="search" label="LOCALIZAÇÃO"/>
        <div style={{
          background: M.surface2, border: `1px solid ${M.borderHi}`,
          borderRadius: 16, padding: 20, marginTop: 12,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: M.amber,
            fontWeight: 700, marginBottom: 8, letterSpacing: 0.5,
          }}>{dados.sku}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: M.text, lineHeight: 1.3, marginBottom: 16 }}>
            {dados.nome}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
            padding: "14px 0 4px", borderTop: `1px dashed ${M.border}`,
          }}>
            <div>
              <div style={{ fontSize: 11, color: M.textDim, marginBottom: 6, textTransform: "uppercase" }}>Local</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="pin" size={18} color={M.amber}/>
                <span style={{ fontSize: 18, fontWeight: 700, color: M.text }}>
                  {dados.localizacao_fisica || "—"}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: M.textDim, marginBottom: 6, textTransform: "uppercase" }}>Estoque</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700,
                color: baixo ? M.red : M.green, lineHeight: 1,
              }}>{dados.quantidade}<span style={{ fontSize: 13, color: M.textDim, marginLeft: 6 }}>un.</span></div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn variant="primary" full icon="check" onClick={onClose}>Entendido</Btn>
        </div>
      </div>
    );
  }

  // BAIXA já efetuada pelo backend (dar_baixa_estoque decrementa na hora)
  if (intencao === "baixa" && dados && dados.baixados != null) {
    return (
      <div style={{ padding: "4px 20px 24px" }}>
        <ResultHeader transcript={transcript} icon="arrow-down-r" label="BAIXA REGISTRADA"/>
        <div style={{
          background: M.surface2, border: `1px solid ${M.borderHi}`,
          borderRadius: 16, padding: 20, marginTop: 12, textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", margin: "0 auto 14px",
            background: "#0E2B23", color: M.green,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="check" size={24} strokeWidth={2.4}/></div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 56, fontWeight: 700,
            color: M.amber, lineHeight: 1, marginBottom: 4,
          }}>−{dados.baixados}</div>
          <div style={{ fontSize: 14, color: M.textDim, marginBottom: 16 }}>unidade(s)</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: M.text, marginBottom: 6 }}>{dados.nome}</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            fontSize: 12, color: M.textDim, fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span>{dados.sku}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ color: M.green }}>{dados.restante} restantes</span>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn variant="primary" full icon="check" onClick={onClose}>Pronto</Btn>
        </div>
      </div>
    );
  }

  // KIT — lista de itens da categoria
  if (intencao === "kit" && Array.isArray(dados) && dados.length) {
    return (
      <div style={{ padding: "4px 20px 24px" }}>
        <ResultHeader transcript={transcript} icon="package" label="KIT SUGERIDO"/>
        <div style={{
          background: M.surface2, border: `1px solid ${M.borderHi}`,
          borderRadius: 16, padding: 4, marginTop: 12,
        }}>
          <div style={{ padding: "14px 16px 8px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: M.text }}>Kit sugerido</div>
            <div style={{ fontSize: 12, color: M.textDim, marginTop: 4 }}>
              {dados.length} item(ns) · separar e levar à baia
            </div>
          </div>
          {dados.map((p, i) => (
            <div key={p.sku || i} style={{
              padding: "12px 16px", borderTop: `1px solid ${M.border}`,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {p.sku && (
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    color: M.amber, fontWeight: 700, marginBottom: 2,
                  }}>{p.sku}</div>
                )}
                <div style={{ fontSize: 13.5, color: M.text, fontWeight: 500 }}>{p.nome}</div>
              </div>
              {p.quantidade != null && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 15,
                  fontWeight: 700, color: M.text,
                  background: M.bg, borderRadius: 8, padding: "4px 10px",
                }}>{p.quantidade} un.</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn variant="primary" full icon="check" onClick={onClose}>Separar kit</Btn>
        </div>
      </div>
    );
  }

  // Fallback: nada encontrado, IA degradada, erro ou "não entendi".
  // O backend SEMPRE manda uma frase falável em `fala`.
  const erro = intencao === "erro";
  return (
    <div style={{ padding: "4px 20px 28px" }}>
      <ResultHeader transcript={transcript}
        icon={erro ? "alert" : "search"}
        label={erro ? "ERRO" : "RESPOSTA"}/>
      <div style={{
        background: M.surface2, border: `1px solid ${erro ? M.red + "55" : M.borderHi}`,
        borderRadius: 16, padding: 20, marginTop: 12, textAlign: "center",
      }}>
        <div style={{ fontSize: 16, color: M.text, lineHeight: 1.5, fontWeight: 500 }}>
          {fala || "Não obtive resposta."}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Btn variant="ghost" full onClick={onClose}>Fechar</Btn>
      </div>
    </div>
  );
}

function ResultHeader({ transcript, icon, label }) {
  return (
    <>
      <div style={{
        textAlign: "center", fontSize: 11, color: M.amber, letterSpacing: 1.5,
        fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center",
        gap: 6, justifyContent: "center",
      }}>
        <Icon name={icon} size={14}/>
        {label}
      </div>
      {transcript && (
        <div style={{
          background: M.bg, border: `1px solid ${M.border}`,
          borderRadius: 10, padding: "10px 14px",
          fontSize: 13, color: M.textDim, textAlign: "center", fontStyle: "italic",
        }}>"{transcript}"</div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------------------------
function App({ onLogout, plano }) {
  const [tab, setTab] = useS("home");
  const [stack, setStack] = useS([]);
  const [toast, setToast] = useS(null);
  // mic: { phase: 'idle'|'listening'|'thinking'|'result', transcript, resp }
  const [mic, setMic] = useS({ phase: "idle", transcript: "", resp: null });
  // onboarding: 3 telas no primeiro login (trial). Premium pula sempre.
  const [showOnboarding, setShowOnboarding] = useS(
    () => plano && plano.plan === "trial" && !onboardingFeito()
  );

  const recogRef = useR(null);
  const phaseRef = useR("idle");
  const finalRef = useR("");
  phaseRef.current = mic.phase;

  // Carrega workspaces na primeira montagem. Se não há um ativo, escolhe o
  // primeiro (default "Principal"). Depois disso libera a UI.
  useE(() => {
    window.API.workspaceList()
      .then(r => {
        const list = r.workspaces || [];
        window.__workspaces = list;
        if (!window.API.workspaceActive() && list[0])
          window.API.workspaceSetActive(list[0].id);
      })
      .catch(() => { window.__workspaces = []; });
  }, []);

  const nav = {
    go: (t) => { setTab(t); setStack([]); },
    push: (screen, params) => setStack((s) => [...s, { screen, params }]),
    pop: () => setStack((s) => s.slice(0, -1)),
  };

  const showToast = (msg, tone = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3200);
  };

  // ---- envia a transcrição ao backend real ----
  function enviar(texto) {
    setMic({ phase: "thinking", transcript: texto, resp: null });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    fetch(API_URL, {
      method: "POST",
      headers: window.API.authHeaders(true),
      body: JSON.stringify({ texto }),
      signal: ctrl.signal,
    })
      .then((r) => {
        if (r.status === 401) { window.API.logout(); throw new Error("Sessão expirada."); }
        return r.json().catch(() => ({ fala: "Resposta inválida do servidor.", intencao: "erro", dados: null }));
      })
      .then((data) => {
        setMic({ phase: "result", transcript: texto, resp: data });
        falar(data && data.fala);
      })
      .catch((err) => {
        const msg = err && err.name === "AbortError"
          ? "O servidor demorou a responder. Tente de novo."
          : "Falha de conexão. Verifique a internet.";
        setMic({ phase: "result", transcript: texto, resp: { fala: msg, intencao: "erro", dados: null } });
        falar(msg);
      })
      .finally(() => clearTimeout(t));
  }

  // ---- inicia o reconhecimento de voz nativo ----
  function startListening() {
    if (!VOICE_OK) {
      showToast("Navegador sem reconhecimento de voz. Use o Chrome (Android/desktop).", "error");
      return;
    }
    // já ouvindo -> segundo toque cancela
    if (phaseRef.current === "listening") {
      try { recogRef.current && recogRef.current.stop(); } catch (_) {}
      return;
    }
    finalRef.current = "";
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recogRef.current = rec;

    rec.onresult = (e) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += txt;
        else interim += txt;
      }
      if (final) finalRef.current = final;
      setMic((m) => m.phase === "listening"
        ? { ...m, transcript: (finalRef.current || interim).trim() }
        : m);
    };
    rec.onerror = (ev) => {
      if (phaseRef.current === "thinking") return; // erro tardio, já enviou
      const map = {
        "not-allowed": "Permissão de microfone negada. Libere nas configurações.",
        "service-not-allowed": "Microfone bloqueado pelo navegador.",
        "no-speech": "Não ouvi nada. Toque e fale novamente.",
        "audio-capture": "Microfone não encontrado.",
        "network": "Sem internet para o reconhecimento de voz.",
      };
      showToast(map[ev.error] || "Erro ao ouvir. Tente novamente.", "error");
      setMic({ phase: "idle", transcript: "", resp: null });
    };
    rec.onend = () => {
      const txt = (finalRef.current || "").trim();
      if (phaseRef.current === "listening") {
        if (txt) enviar(txt);
        else setMic({ phase: "idle", transcript: "", resp: null });
      }
    };

    setMic({ phase: "listening", transcript: "", resp: null });
    try { rec.start(); }
    catch (_) {
      setMic({ phase: "idle", transcript: "", resp: null });
      showToast("Aguarde um instante e tente de novo.", "error");
    }
  }

  function closeMic() {
    try { recogRef.current && recogRef.current.abort(); } catch (_) {}
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setMic({ phase: "idle", transcript: "", resp: null });
  }

  // tap no FAB: ocioso -> ouvir; ouvindo -> parar; resultado/pensando -> fecha
  function micPress() {
    if (mic.phase === "idle") startListening();
    else if (mic.phase === "listening") {
      try { recogRef.current && recogRef.current.stop(); } catch (_) {}
    } else closeMic();
  }

  // tela atual
  const top = stack[stack.length - 1];
  let body;
  if (top) {
    if (top.screen === "os-detail") body = <OsDetailScreen nav={nav} params={top.params}/>;
    else if (top.screen === "equip-detail") body = <EquipDetailScreen nav={nav} params={top.params}/>;
    else if (top.screen === "inspecao") body = <InspecaoScreen nav={nav}/>;
    else if (top.screen === "gestao") body = <GestaoScreen nav={nav}/>;
  } else {
    switch (tab) {
      case "home":  body = <HomeScreen nav={nav} openMic={startListening} onLogout={onLogout}/>; break;
      case "parts": body = <PartsScreen nav={nav} openMic={startListening}/>; break;
      case "os":    body = <OsListScreen nav={nav}/>; break;
      case "equip": body = <EquipListScreen nav={nav}/>; break;
      case "dash":  body = <DashScreen nav={nav}/>; break;
      default:      body = <HomeScreen nav={nav} openMic={startListening} onLogout={onLogout}/>;
    }
  }

  return (
    <div style={{
      // Preenche a tela inteira (mesmo design no mobile e no PC).
      // O conteúdo das telas internas tem seu próprio maxWidth pra leitura
      // boa em monitor wide — só o "shell" externo ocupa tudo.
      position: "fixed", inset: 0,
      display: "flex", flexDirection: "column",
      background: M.bg, overflow: "hidden",
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {plano && plano.plan === "trial" && (
        <div style={{
          flexShrink: 0, background: "#3B2A0E", color: M.amber,
          borderBottom: `1px solid ${M.border}`,
          padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Icon name="clock" size={14}/>
          Teste grátis · {plano.dias} dia{plano.dias === 1 ? "" : "s"} restante{plano.dias === 1 ? "" : "s"}
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ color: M.text }}>Premium R$ 89/mês</span>
        </div>
      )}
      <InstallBanner/>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: M.bg,
        WebkitOverflowScrolling: "touch" }}>
        {/* Sem maxWidth: conteúdo ocupa a tela inteira em qualquer viewport.
            Mobile usa o espaço todo (igual antes); desktop também — cards
            do grid 1fr 1fr crescem proporcionalmente. */}
        <RouteFade keyId={`${tab}|${stack.length}|${(top && top.screen) || ''}|${(top && top.params && top.params.id) || ''}`}>
          {body}
        </RouteFade>
      </div>

      <MicFAB state={mic.phase === "thinking" ? "thinking" : mic.phase}
        onPress={micPress}/>

      <BottomTabBar active={tab} onChange={(t) => nav.go(t)}/>

      <BottomSheet open={mic.phase !== "idle"} onClose={closeMic}>
        <VoiceSheet phase={mic.phase} transcript={mic.transcript}
          resp={mic.resp} onClose={closeMic}/>
      </BottomSheet>

      <Toast toast={toast}/>
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)}/>}
    </div>
  );
}

// =========================================================================
// LOGIN — portão de acesso (senha compartilhada)
// =========================================================================
const PERFIS = [
  "Produtor rural",
  "Empresário",
  "Dono de loja / oficina",
  "Mecânico / Operador",
  "Gestor de manutenção",
  "Outro",
];

function Login({ onOk }) {
  const ls = (k, d) => { try { return localStorage.getItem(k) || d; } catch (_) { return d; } };
  const [nome, setNome] = useS(() => ls("maestro_nome", ""));
  const [email, setEmail] = useS(() => ls("maestro_email", ""));
  const perfilSalvo = ls("maestro_perfil", PERFIS[0]);
  const [perfil, setPerfil] = useS(() => (PERFIS.includes(perfilSalvo) ? perfilSalvo : "Outro"));
  const [profCustom, setProfCustom] = useS(() => (PERFIS.includes(perfilSalvo) ? "" : perfilSalvo));
  // 'entrar' | 'cadastrar' | 'premium'
  const [modo, setModo] = useS(() => (ls("maestro_email", "") ? "entrar" : "cadastrar"));
  const [senha, setSenha] = useS("");
  const [busy, setBusy] = useS(false);
  const [erro, setErro] = useS(null);

  function emailOk() { return /.+@.+\..+/.test(email.trim()); }
  function perfilFinal() {
    return perfil === "Outro" ? (profCustom.trim() || "Outro") : perfil;
  }
  function salvarPerfilCompleto() {
    try {
      localStorage.setItem("maestro_nome", nome.trim());
      localStorage.setItem("maestro_email", email.trim());
      localStorage.setItem("maestro_perfil", perfilFinal());
    } catch (_) {}
  }
  function salvarApenasEmail() {
    try { localStorage.setItem("maestro_email", email.trim()); } catch (_) {}
  }

  function entrar(e) {
    if (e) e.preventDefault();
    if (!emailOk()) { setErro("Informe um e-mail válido."); return; }
    if (!senha) { setErro("Informe sua senha."); return; }
    setBusy(true); setErro(null);
    window.API.entrar(email.trim(), senha)
      .then(() => { salvarApenasEmail(); onOk(); })
      .catch((err) => {
        if (err.semConta) { setModo("cadastrar"); setErro("Conta não encontrada. Cadastre-se com seus dados."); }
        else setErro(err.message || "E-mail ou senha incorretos.");
        setBusy(false);
      });
  }

  function cadastrar(e) {
    if (e) e.preventDefault();
    if (!nome.trim()) { setErro("Informe seu nome."); return; }
    if (!emailOk()) { setErro("Informe um e-mail válido."); return; }
    if (perfil === "Outro" && !profCustom.trim()) { setErro("Escreva sua profissão."); return; }
    if (!senha || senha.length < 6) { setErro("Crie uma senha de pelo menos 6 caracteres."); return; }
    setBusy(true); setErro(null);
    window.API.cadastrar(email.trim(), senha)
      .then(() => { salvarPerfilCompleto(); onOk(); })
      .catch((err) => {
        if (err.jaCadastrado) { setModo("entrar"); setErro("Já existe conta com esse e-mail. Use sua senha."); }
        else if (err.expirado) { setModo("premium"); setErro("Seu teste expirou. Use a chave Premium."); }
        else setErro(err.message || "Falha ao cadastrar.");
        setBusy(false);
      });
  }

  function entrarPremium(e) {
    if (e) e.preventDefault();
    if (!emailOk()) { setErro("Informe um e-mail válido."); return; }
    if (!senha) { setErro("Informe a chave do plano."); return; }
    setBusy(true); setErro(null);
    window.API.login(senha)
      .then(() => { salvarApenasEmail(); onOk(); })
      .catch((err) => { setErro(err.message || "Chave inválida."); setBusy(false); });
  }

  // "Esqueci minha chave" — busca pelo payment_id do MP (válido por 7 dias)
  const [recuperando, setRecuperando] = useS(false);
  const [pid, setPid] = useS("");
  const [recBusy, setRecBusy] = useS(false);
  function recuperarChave(e) {
    if (e) e.preventDefault();
    const id = pid.trim();
    if (!/^\d{6,20}$/.test(id)) { setErro("Informe o número do pagamento (só dígitos, vem do e-mail/recibo do Mercado Pago)."); return; }
    setRecBusy(true); setErro(null);
    window.API.payChave(id)
      .then(j => {
        setSenha(j.chave);
        if (j.email && !email) setEmail(j.email);
        setRecuperando(false); setRecBusy(false);
        // Login automático em seguida
        setBusy(true);
        return window.API.login(j.chave);
      })
      .then(ok => { if (ok) { salvarApenasEmail(); onOk(); } })
      .catch(err => {
        setRecBusy(false); setBusy(false);
        setErro(err.message || "Não achei essa chave. Verifique o número do pagamento.");
      });
  }

  const field = {
    width: "100%", background: M.surface, border: `1px solid ${M.border}`,
    borderRadius: 12, padding: "14px 16px", color: M.text,
    fontSize: 16, fontFamily: "Inter, sans-serif", outline: "none",
    marginBottom: 12,
  };
  const Tab = ({ id, children }) => (
    <button type="button" onClick={() => { setModo(id); setErro(null); }} style={{
      flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer",
      background: modo === id ? M.amber : "transparent",
      color: modo === id ? "#0E1117" : M.textDim,
      border: `1px solid ${modo === id ? M.amber : M.border}`,
      fontWeight: 700, fontSize: 13,
    }}>{children}</button>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: M.bg, overflowY: "auto",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 24px", paddingTop: "max(40px, env(safe-area-inset-top))",
    }}>
      <div style={{
        marginBottom: 22,
        animation: 'maestro-logo-in .7s cubic-bezier(.34,1.56,.64,1) both',
      }}><Logo size={56} word/></div>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", gap: 8, margin: "0 0 16px" }}>
          <Tab id="entrar">Entrar</Tab>
          <Tab id="cadastrar">Cadastrar</Tab>
          <Tab id="premium">Premium</Tab>
        </div>

        {modo === "entrar" && (
          <form onSubmit={entrar}>
            <input type="email" value={email} inputMode="email" autoFocus
              onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail"
              style={field}/>
            <input type="password" value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              style={{ ...field, borderColor: erro ? M.red : M.border }}/>
            {erro && <div style={{ fontSize: 13, color: M.red, margin: "2px 0 12px", textAlign: "center" }}>{erro}</div>}
            <Btn variant="primary" full icon="check" disabled={busy}
              onClick={entrar}>{busy ? "Entrando…" : "Entrar"}</Btn>
            <div style={{ fontSize: 11.5, color: M.textMute, textAlign: "center", marginTop: 12 }}>
              Não tem conta?{" "}
              <button type="button" onClick={() => { setModo("cadastrar"); setErro(null); }}
                style={{ background: "none", border: "none", color: M.amber, cursor: "pointer", padding: 0, fontWeight: 700 }}>
                Cadastre-se
              </button>
            </div>
          </form>
        )}

        {modo === "cadastrar" && (
          <form onSubmit={cadastrar}>
            <input type="text" value={nome}
              onChange={(e) => setNome(e.target.value)} placeholder="Seu nome"
              style={field}/>
            <input type="email" value={email} inputMode="email"
              onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail"
              style={field}/>
            <div style={{ fontSize: 12, color: M.textDim, margin: "2px 2px 6px" }}>Eu sou</div>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)}
              style={{ ...field, appearance: "none" }}>
              {PERFIS.map((p) => (
                <option key={p} value={p} style={{ background: M.surface }}>{p}</option>
              ))}
            </select>
            {perfil === "Outro" && (
              <input type="text" value={profCustom}
                onChange={(e) => setProfCustom(e.target.value)}
                placeholder="Escreva sua profissão"
                style={field}/>
            )}
            <input type="password" value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Crie sua senha (mín. 6 caracteres)"
              style={{ ...field, borderColor: erro ? M.red : M.border }}/>
            {erro && <div style={{ fontSize: 13, color: M.red, margin: "2px 0 12px", textAlign: "center" }}>{erro}</div>}
            <Btn variant="primary" full icon="check" disabled={busy}
              onClick={cadastrar}>{busy ? "Cadastrando…" : "Criar conta + 7 dias grátis"}</Btn>
            <div style={{ fontSize: 11.5, color: M.textMute, textAlign: "center", marginTop: 12 }}>
              Sem cartão. Sua senha fica criptografada no servidor.
            </div>
          </form>
        )}

        {modo === "premium" && !recuperando && (
          <form onSubmit={entrarPremium}>
            <input type="email" value={email} inputMode="email"
              onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail"
              style={field}/>
            <input type="password" value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Chave do plano Premium"
              style={{ ...field, borderColor: erro ? M.red : M.border }}/>
            {erro && <div style={{ fontSize: 13, color: M.red, margin: "2px 0 12px", textAlign: "center" }}>{erro}</div>}
            <Btn variant="primary" full icon="check" disabled={busy}
              onClick={entrarPremium}>{busy ? "Entrando…" : "Entrar"}</Btn>
            <div style={{ fontSize: 11.5, color: M.textMute, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
              Sua chave é mostrada na tela logo após o pagamento.<br/>
              <button type="button" onClick={() => { setRecuperando(true); setErro(null); }}
                style={{ background: "none", border: "none", color: M.amber, cursor: "pointer", padding: 0, fontWeight: 700 }}>
                Perdi minha chave →
              </button>
            </div>
          </form>
        )}

        {modo === "premium" && recuperando && (
          <form onSubmit={recuperarChave}>
            <div style={{
              padding: "12px 14px", background: "rgba(245,158,11,0.08)",
              border: `1px solid ${M.amber}44`, borderRadius: 10,
              fontSize: 12.5, color: M.amber, lineHeight: 1.5, marginBottom: 14,
            }}>
              Informe o <b>número do pagamento</b> que o Mercado Pago te enviou
              (e-mail "Pagamento confirmado", logo após pagar — fica no recibo).
              Válido por 7 dias após o pagamento.
            </div>
            <input type="text" value={pid} inputMode="numeric"
              onChange={(e) => setPid(e.target.value.replace(/\D/g, ""))}
              placeholder="Número do pagamento (só dígitos)"
              style={{ ...field, borderColor: erro ? M.red : M.border, letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}/>
            {erro && <div style={{ fontSize: 13, color: M.red, margin: "2px 0 12px", textAlign: "center" }}>{erro}</div>}
            <Btn variant="primary" full icon="check" disabled={recBusy || busy}
              onClick={recuperarChave}>
              {recBusy ? "Buscando…" : busy ? "Entrando…" : "Recuperar e entrar"}
            </Btn>
            <button type="button" onClick={() => { setRecuperando(false); setErro(null); setPid(""); }}
              style={{
                marginTop: 12, width: "100%", background: "transparent",
                border: "none", color: M.textDim, cursor: "pointer",
                fontSize: 12.5, padding: 8,
              }}>← Voltar</button>
          </form>
        )}

        {/* Planos */}
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 12 }}>
          <PlanoCard
            nome="Free · Teste grátis" preco="R$ 0" periodo="por 7 dias"
            cor={M.textDim}
            itens={["Acesso completo a tudo", "Sem cartão de crédito", "Bloqueia após 7 dias"]}/>
          <PlanoCard
            nome="Premium Mensal" preco="R$ 89" periodo="/mês"
            cor={M.amber} destaque
            itens={[
              "Tudo ilimitado: peças, equipamentos, OS, inspeções",
              "Assistente de voz com IA",
              "Até 25 usuários com a senha do plano",
              "Tutoriais em vídeo + suporte prioritário",
            ]}/>
          <PlanoCard
            nome="Premium Anual" preco="R$ 801" periodo="/ano · −25%"
            cor={M.green} destaque
            itens={[
              "Tudo do Premium Mensal",
              "Economia de 25% (≈ R$ 66,75/mês)",
              "3 meses grátis no ano",
            ]}/>
          <div style={{
            fontSize: 11.5, color: M.textMute, textAlign: "center",
            lineHeight: 1.6, padding: "2px 6px",
          }}>
            Equipe com até 25 usuários: <span style={{ color: M.amber }}>10% de
            desconto adicional</span> sobre o plano escolhido.
          </div>
        </div>
      </div>
      <div style={{ marginTop: 24, fontSize: 11, color: M.textMute, letterSpacing: 1 }}>
        MAESTRO · CMMS POR VOZ
      </div>
    </div>
  );
}

function PlanoCard({ nome, preco, periodo, itens, cor, destaque }) {
  return (
    <div style={{
      background: M.surface, borderRadius: 14,
      border: `1px solid ${destaque ? M.amber : M.border}`,
      padding: 16,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: cor }}>{nome}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: M.text }}>
          {preco}<span style={{ fontSize: 11, color: M.textDim, fontWeight: 500 }}> {periodo}</span>
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {itens.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: M.textDim }}>
            <Icon name="check" size={14} color={destaque ? M.amber : M.textDim}/>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// ONBOARDING — 3 telas mostradas no primeiro login (free tier).
// Premium não vê (já sabe usar). Skip a qualquer momento.
// =========================================================================
function onboardingFeito() {
  try { return localStorage.getItem("maestro_onboarded") === "1"; } catch (_) { return true; }
}
function marcarOnboarded() {
  try { localStorage.setItem("maestro_onboarded", "1"); } catch (_) {}
}

function Onboarding({ onClose }) {
  const [step, setStep] = useS(0);
  const slides = [
    {
      icon: "mic",
      cor: M.amber,
      titulo: "Comece falando",
      texto: "Toque no microfone amarelo no rodapé e diga \"onde está o rolamento 6205\" ou \"tira 2 correias\". O Maestro entende e responde por voz.",
      dica: "Funciona melhor no Chrome (Android/PC) e Safari (iOS 16+).",
    },
    {
      icon: "box",
      cor: M.green,
      titulo: "Cadastre uma peça",
      texto: "Em Almoxarifado, toque no + pra adicionar SKU, nome, quantidade e onde fica. Depois, é só usar a voz para buscar e dar baixa no estoque.",
      dica: "Você pode importar várias peças de uma vez no menu.",
    },
    {
      icon: "wrench",
      cor: "#60A5FA",
      titulo: "Abra uma OS",
      texto: "Em Ordens de Serviço, registre uma manutenção: equipamento, prioridade, descrição. Conforme consumir peças, baixe pela voz — fica tudo amarrado.",
      dica: "Convide até 25 usuários da equipe no plano Premium.",
    },
  ];
  const s = slides[step];
  const ultima = step === slides.length - 1;
  function avancar() {
    if (ultima) { marcarOnboarded(); onClose(); }
    else setStep(step + 1);
  }
  function pular() { marcarOnboarded(); onClose(); }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 8500,
      background: "rgba(15,17,23,0.96)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 28px", textAlign: "center",
      animation: "maestro-fade-in .3s ease both",
    }}>
      <button onClick={pular} style={{
        position: "absolute", top: 18, right: 18,
        background: "transparent", border: "none", color: M.textDim,
        fontSize: 13, cursor: "pointer", padding: 8,
      }}>Pular</button>

      <div style={{
        width: 88, height: 88, borderRadius: "50%",
        background: `${s.cor}22`, border: `2px solid ${s.cor}66`,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28,
      }}>
        <Icon name={s.icon} size={42} color={s.cor}/>
      </div>

      <div style={{ fontSize: 11, letterSpacing: 2, color: s.cor, fontWeight: 700, marginBottom: 8 }}>
        PASSO {step + 1} DE {slides.length}
      </div>

      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 26, fontWeight: 800, color: M.text,
        letterSpacing: -0.4, marginBottom: 14, maxWidth: 360,
      }}>{s.titulo}</div>

      <div style={{
        maxWidth: 380, fontSize: 14.5, color: M.textDim, lineHeight: 1.55, marginBottom: 16,
      }}>{s.texto}</div>

      <div style={{
        maxWidth: 360, padding: "10px 14px", borderRadius: 10,
        background: M.surface2, border: `1px solid ${M.border}`,
        fontSize: 12.5, color: M.textDim, fontStyle: "italic", marginBottom: 32,
      }}>💡 {s.dica}</div>

      {/* dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 8, height: 8, borderRadius: 4,
            background: i === step ? s.cor : M.border,
            transition: "all .25s ease",
          }}/>
        ))}
      </div>

      <button onClick={avancar} style={{
        padding: "14px 40px", borderRadius: 12,
        background: M.amber, color: "#0E1117", border: "none",
        fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: 0.3,
        boxShadow: "0 8px 24px rgba(245,158,11,0.3)",
      }}>{ultima ? "Começar a usar" : "Próximo"}</button>
    </div>
  );
}

// =========================================================================
// INSTALL BANNER — PWA: prompt nativo (Android/desktop) ou instruções (iOS)
// =========================================================================
function isIOS() {
  const ua = navigator.userAgent || "";
  // iPadOS 13+ se passa por Mac — detecta pelo toque
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOS;
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}
function bannerDismissedRecently() {
  try {
    const ts = parseInt(localStorage.getItem("maestro_install_dismiss") || "0", 10);
    return ts && (Date.now() - ts) < 7 * 86400_000;
  } catch (_) { return false; }
}

function InstallBanner() {
  const [show, setShow] = useS(false);
  const [iosSheet, setIosSheet] = useS(false);
  const [hasPrompt, setHasPrompt] = useS(!!window.__maestroDeferredInstall);

  useE(() => {
    if (isStandalone()) return; // já instalado
    if (bannerDismissedRecently()) return;

    if (window.__maestroDeferredInstall) setHasPrompt(true);
    const onAvail = () => { setHasPrompt(true); setShow(true); };
    const onInstalled = () => { setShow(false); setHasPrompt(false); };

    window.addEventListener("maestro:installavailable", onAvail);
    window.addEventListener("maestro:installed", onInstalled);

    // iOS: sem evento — mostra após 3s só se Safari (não Chrome iOS, que não instala)
    if (isIOS()) {
      const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
      if (safari) setTimeout(() => setShow(true), 3000);
    } else if (window.__maestroDeferredInstall) {
      setShow(true);
    }

    return () => {
      window.removeEventListener("maestro:installavailable", onAvail);
      window.removeEventListener("maestro:installed", onInstalled);
    };
  }, []);

  function dispensar() {
    try { localStorage.setItem("maestro_install_dismiss", String(Date.now())); } catch (_) {}
    setShow(false);
  }

  function instalar() {
    if (isIOS()) { setIosSheet(true); return; }
    const ev = window.__maestroDeferredInstall;
    if (!ev) return;
    ev.prompt();
    ev.userChoice.finally(() => { window.__maestroDeferredInstall = null; setShow(false); });
  }

  if (!show) return null;

  return (
    <>
      <div style={{
        flexShrink: 0, background: "#0E2233", color: M.text,
        borderBottom: `1px solid ${M.border}`,
        padding: "10px 14px", fontSize: 13,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: M.amber, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="check" size={16} color="#0E1117"/>
        </div>
        <div style={{ flex: 1, lineHeight: 1.3 }}>
          <div style={{ fontWeight: 700 }}>Instale o Maestro</div>
          <div style={{ fontSize: 11.5, color: M.textDim }}>
            Abre em tela cheia, funciona offline, sem App Store.
          </div>
        </div>
        {(hasPrompt || isIOS()) && (
          <button onClick={instalar} style={{
            background: M.amber, color: "#0E1117", border: "none",
            padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12.5,
            cursor: "pointer",
          }}>Instalar</button>
        )}
        <button onClick={dispensar} aria-label="dispensar" style={{
          background: "transparent", color: M.textDim, border: "none",
          padding: "4px 6px", cursor: "pointer", fontSize: 18, lineHeight: 1,
        }}>×</button>
      </div>

      <BottomSheet open={iosSheet} onClose={() => setIosSheet(false)}>
        <div style={{ padding: "8px 20px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 14, fontSize: 11, color: M.amber,
            letterSpacing: 1.5, fontWeight: 700 }}>INSTALAR NO IPHONE / IPAD</div>
          <ol style={{ margin: 0, padding: "0 0 0 18px", color: M.text, fontSize: 14, lineHeight: 1.7 }}>
            <li>Toque no botão <b>Compartilhar</b> (ícone de seta para cima na barra do Safari).</li>
            <li>Role e toque em <b>"Adicionar à Tela de Início"</b>.</li>
            <li>Toque em <b>Adicionar</b> no canto superior direito.</li>
          </ol>
          <div style={{ marginTop: 16, padding: 12, background: M.surface2, borderRadius: 10,
            fontSize: 12, color: M.textDim, lineHeight: 1.5 }}>
            Pronto — o Maestro aparece na tela inicial igual a um app nativo.
            Importante: precisa ser o <b>Safari</b> (Chrome/Firefox no iPhone não instalam apps).
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

// =========================================================================
// PREMIUM CELEBRATION — disparado quando o Mercado Pago redireciona com
// ?status=approved. Mostra overlay com confete + badge + CTA pro e-mail.
// =========================================================================
function lerStatusPagamento() {
  try {
    const params = new URLSearchParams(window.location.search);
    const s = (params.get("status") || params.get("collection_status") || "").toLowerCase();
    if (!s) return null;
    return s; // 'approved' | 'pending' | 'rejected' | 'failure' | ...
  } catch (_) { return null; }
}
function lerPaymentId() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("payment_id") || params.get("collection_id") || null;
  } catch (_) { return null; }
}
function limparStatusURL() {
  try {
    const url = new URL(window.location.href);
    ["status", "collection_status", "collection_id", "payment_id",
     "external_reference", "payment_type", "merchant_order_id",
     "preference_id", "site_id", "processing_mode", "merchant_account_id"]
      .forEach(k => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
  } catch (_) {}
}

function PremiumCelebration({ onClose }) {
  // estado: 'loading' | 'ready' (chave em mãos) | 'pending' | 'error'
  const [fase, setFase] = useS("loading");
  const [chave, setChave] = useS(null);
  const [info, setInfo] = useS(null);   // { planoNome, valido_ate, email }
  const [erro, setErro] = useS(null);
  const [copiado, setCopiado] = useS(false);
  const [entrando, setEntrando] = useS(false);
  const tentRef = useR(0);

  useE(() => {
    // confete em 3 ondas pra dar densidade sem travar
    if (typeof window.maestroConfetti === "function") {
      window.maestroConfetti({ duration: 2600, particles: 140, origin: { x: 0.5, y: 0.45 } });
      setTimeout(() => window.maestroConfetti({ duration: 2200, particles: 90, origin: { x: 0.2, y: 0.5 } }), 220);
      setTimeout(() => window.maestroConfetti({ duration: 2200, particles: 90, origin: { x: 0.8, y: 0.5 } }), 440);
    }
    // vibração tátil curta em celular
    if (navigator.vibrate) { try { navigator.vibrate([15, 40, 25]); } catch (_) {} }

    // Busca a chave. O webhook do MP pode demorar alguns segundos —
    // retentamos até 6x com backoff curto antes de cair em "pending".
    const pid = lerPaymentId();
    if (!pid) {
      setFase("error");
      setErro("Não recebemos o número do pagamento. Verifique seu e-mail ou use 'Recuperar minha chave' no login.");
      return;
    }
    function buscar() {
      window.API.payChave(pid)
        .then(j => {
          setChave(j.chave);
          setInfo({
            planoNome: j.planoNome,
            valido_ate: j.valido_ate,
            email: j.email,
          });
          setFase("ready");
        })
        .catch(err => {
          tentRef.current += 1;
          // 404 = "Pagamento ainda não confirmado" -> webhook atrasou, retry
          const pendente = err && /confirmado|pendente/i.test(err.message || "");
          if (pendente && tentRef.current < 6) {
            setTimeout(buscar, 1500 * tentRef.current);
            return;
          }
          if (pendente) {
            setFase("pending");
          } else {
            setFase("error");
            setErro(err && err.message ? err.message : "Falha ao buscar a chave.");
          }
        });
    }
    buscar();
  }, []);

  function copiar() {
    if (!chave) return;
    const fb = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = chave; ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      } catch (_) {}
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(chave).catch(fb);
      } else { fb(); }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      if (navigator.vibrate) { try { navigator.vibrate(20); } catch (_) {} }
    } catch (_) { fb(); }
  }

  function whatsapp() {
    if (!chave) return;
    const msg = `Minha chave Maestro Premium:\n\n${chave}\n\nUsar no login (botão "Já sou Premium") em ${window.location.origin}`;
    const url = "https://wa.me/?text=" + encodeURIComponent(msg);
    window.open(url, "_blank", "noopener");
  }

  // Web Share API — abre o seletor nativo (iOS/Android): SMS, Telegram, Mail,
  // AirDrop, qualquer app de mensagem instalado. Zero custo, zero dependência.
  // No desktop o suporte é parcial (Chrome/Edge têm, Firefox não), por isso o
  // botão só aparece quando navigator.share existe.
  function compartilhar() {
    if (!chave || !navigator.share) return;
    navigator.share({
      title: "Maestro Premium",
      text: `Minha chave Maestro Premium:\n\n${chave}\n\nLogin em ${window.location.origin}`,
    }).catch((err) => {
      // AbortError = usuário fechou o seletor sem escolher — silencioso, não é erro
      if (err && err.name !== "AbortError") {
        console.warn("[share]", err.message);
      }
    });
  }

  function entrarAgora() {
    if (!chave || entrando) return;
    setEntrando(true);
    window.API.loginComChave(chave)
      .then(j => {
        window.API.sessaoSalvar(j);
        // Limpa URL e recarrega — Root vê isAuthed() e cai no App.
        limparStatusURL();
        location.reload();
      })
      .catch(err => {
        setEntrando(false);
        setErro((err && err.message) || "Não consegui entrar agora. Copie a chave e use 'Já sou Premium'.");
      });
  }

  // ---------- conteúdo por fase ----------
  const conteudo = (() => {
    if (fase === "loading") {
      return (
        <div style={{ animation: "maestro-rise .5s ease .3s both", textAlign: "center" }}>
          <div style={{
            width: 28, height: 28, margin: "0 auto 14px", borderRadius: "50%",
            border: `3px solid ${M.amber}44`, borderTopColor: M.amber,
            animation: "maestro-spin .8s linear infinite",
          }}/>
          <div style={{ fontSize: 13.5, color: M.textDim }}>Liberando sua conta Premium…</div>
        </div>
      );
    }
    if (fase === "pending") {
      return (
        <div style={{ animation: "maestro-rise .5s ease .3s both", textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 14, color: M.textDim, lineHeight: 1.55 }}>
            O Mercado Pago ainda está confirmando seu pagamento (normal — pode levar até 1 min).
            <br/><br/>
            Sua chave aparece aqui assim que confirmar. Pode atualizar a página em alguns segundos.
          </div>
          <button onClick={() => location.reload()} style={{
            marginTop: 22, padding: "12px 28px", borderRadius: 10,
            background: M.amber, color: "#0E1117", border: "none",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Atualizar</button>
        </div>
      );
    }
    if (fase === "error") {
      return (
        <div style={{ animation: "maestro-rise .5s ease .3s both", textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 14, color: M.red, fontWeight: 600, marginBottom: 10 }}>{erro || "Erro inesperado."}</div>
          <div style={{ fontSize: 13, color: M.textDim, lineHeight: 1.5 }}>
            Se você pagou de fato, use <b>"Recuperar minha chave"</b> na tela de login
            informando seu e-mail e o número do pagamento que veio do Mercado Pago.
          </div>
          <button onClick={onClose} style={{
            marginTop: 22, padding: "12px 28px", borderRadius: 10,
            background: M.surface2, color: M.text, border: `1px solid ${M.border}`,
            fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Fechar</button>
        </div>
      );
    }
    // fase === "ready"
    return (
      <>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13, letterSpacing: 4, color: M.amber, fontWeight: 700,
          marginBottom: 6, animation: "maestro-rise .5s ease .3s both",
        }}>PAGAMENTO APROVADO</div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 26, fontWeight: 800, color: M.text, letterSpacing: -0.5,
          animation: "maestro-rise .5s ease .45s both", marginBottom: 4,
        }}>Bem-vindo ao Premium</div>

        {info && (
          <div style={{
            fontSize: 12.5, color: M.textDim, marginBottom: 16,
            animation: "maestro-rise .5s ease .55s both",
          }}>
            {info.planoNome} · válido até <b style={{ color: M.text }}>{new Date(info.valido_ate).toLocaleDateString("pt-BR")}</b>
          </div>
        )}

        {/* CHAVE — bloco grande, monospace, fácil de ler e copiar */}
        <div style={{
          width: "100%", maxWidth: 380, marginTop: 6, padding: "16px 18px",
          background: "rgba(245,158,11,0.10)",
          border: `2px solid ${M.amber}`, borderRadius: 12,
          animation: "maestro-rise .5s ease .65s both",
          boxShadow: "0 8px 24px rgba(245,158,11,0.2)",
        }}>
          <div style={{
            fontSize: 10.5, letterSpacing: 2, color: M.amber, fontWeight: 700,
            marginBottom: 8, textTransform: "uppercase",
          }}>Sua chave Premium</div>
          <div className="num" style={{
            fontSize: 18, fontWeight: 700, color: M.text, letterSpacing: 0.5,
            wordBreak: "break-all", lineHeight: 1.4,
            userSelect: "all",
          }}>{chave}</div>
        </div>

        <div style={{
          fontSize: 11.5, color: M.textMute, marginTop: 8, maxWidth: 380, lineHeight: 1.5,
          animation: "maestro-rise .5s ease .7s both",
        }}>
          ⚠️ <b>Salve a chave agora</b> (esta tela some quando você fechar).
          Disponível pra recuperar por 7 dias com seu número de pagamento.
        </div>

        {/* AÇÕES */}
        <div style={{
          display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap",
          justifyContent: "center", width: "100%", maxWidth: 380,
          animation: "maestro-rise .5s ease .75s both",
        }}>
          <button onClick={copiar} style={{
            flex: "1 1 100px", padding: "12px 14px", borderRadius: 10,
            background: copiado ? M.green : M.surface2,
            color: copiado ? "#0E1117" : M.text,
            border: `1px solid ${copiado ? M.green : M.border}`,
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all .2s ease",
          }}>
            <Icon name="check" size={14}/>
            {copiado ? "Copiado!" : "Copiar chave"}
          </button>
          <button onClick={whatsapp} style={{
            flex: "1 1 100px", padding: "12px 14px", borderRadius: 10,
            background: M.surface2, color: M.text,
            border: `1px solid ${M.border}`,
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Icon name="check" size={14}/>
            WhatsApp
          </button>
          {typeof navigator !== "undefined" && navigator.share && (
            <button onClick={compartilhar} style={{
              flex: "1 1 100px", padding: "12px 14px", borderRadius: 10,
              background: M.surface2, color: M.text,
              border: `1px solid ${M.border}`,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Icon name="arrow-up-r" size={14}/>
              Compartilhar
            </button>
          )}
        </div>

        <button onClick={entrarAgora} disabled={entrando} style={{
          marginTop: 12, width: "100%", maxWidth: 380,
          padding: "14px 24px", borderRadius: 12,
          background: M.amber, color: "#0E1117", border: "none",
          fontWeight: 800, fontSize: 15, cursor: entrando ? "wait" : "pointer",
          letterSpacing: 0.3, boxShadow: "0 8px 24px rgba(245,158,11,0.35)",
          animation: "maestro-rise .5s ease .85s both",
          opacity: entrando ? 0.7 : 1,
        }}>
          {entrando ? "Entrando…" : "Entrar como Premium agora →"}
        </button>

        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 10,
          background: "rgba(245,158,11,0.08)", border: `1px solid ${M.amber}44`,
          fontSize: 12, color: M.amber, fontWeight: 600,
          animation: "maestro-rise .5s ease .9s both",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Icon name="check" size={14}/>
          Assistente de voz turbinado com Gemini 2.5
        </div>
      </>
    );
  })();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "radial-gradient(ellipse at center, rgba(245,158,11,0.18), rgba(15,17,23,0.92) 60%)",
      animation: "maestro-fade-in .35s ease both",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "32px 20px", textAlign: "center",
      overflowY: "auto",
    }}>
      {/* Halo + Badge — sempre presentes, dão a vibe de "celebração" */}
      <div style={{ position: "relative", width: 110, height: 110, marginBottom: 18, flexShrink: 0 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,191,36,0.6), transparent 65%)",
          animation: "maestro-halo 1.6s ease-out infinite",
        }}/>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 55%, #B45309 100%)",
          boxShadow: "0 12px 40px rgba(245,158,11,0.45), inset 0 2px 8px rgba(255,255,255,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "maestro-badge-pop .9s cubic-bezier(.34,1.56,.64,1) both",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0, width: "40%",
            background: "linear-gradient(120deg, transparent, rgba(255,255,255,0.55), transparent)",
            animation: "maestro-sheen 2.2s ease-in-out infinite",
            animationDelay: ".8s",
          }}/>
          <Icon name="check" size={50} color="#0E1117"/>
        </div>
      </div>

      {conteudo}
    </div>
  );
}

function PagamentoPendenteOuFalha({ status, onClose }) {
  const aprovado = status === "approved";
  if (aprovado) return null;
  const titulo = status === "pending" ? "Pagamento em análise" : "Pagamento não concluído";
  const msg = status === "pending"
    ? "O Mercado Pago ainda está confirmando seu pagamento. Você recebe um e-mail com a chave Premium assim que aprovado."
    : "Tudo bem — você pode tentar novamente quando quiser. Nenhuma cobrança foi feita.";
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(15,17,23,0.92)", animation: "maestro-fade-in .3s ease both",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "32px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: status === "pending" ? "#3B2A0E" : "#3A1212",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
      }}>
        <Icon name="clock" size={40} color={status === "pending" ? M.amber : M.red}/>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: M.text, marginBottom: 10 }}>{titulo}</div>
      <div style={{ maxWidth: 360, fontSize: 14, color: M.textDim, lineHeight: 1.5 }}>{msg}</div>
      <button onClick={onClose} style={{
        marginTop: 28, padding: "12px 28px", borderRadius: 10,
        background: M.surface2, color: M.text, border: `1px solid ${M.border}`,
        fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}>Fechar</button>
    </div>
  );
}

function Root() {
  const [authed, setAuthed] = useS(window.API.isAuthed());
  const [payStatus, setPayStatus] = useS(() => lerStatusPagamento());
  function fecharPay() { limparStatusURL(); setPayStatus(null); }

  return (
    <>
      {authed
        ? <App onLogout={() => window.API.logout()} plano={window.API.plan()}/>
        : <Login onOk={() => setAuthed(true)}/>}
      {payStatus === "approved" && <PremiumCelebration onClose={fecharPay}/>}
      {payStatus && payStatus !== "approved" && (
        <PagamentoPendenteOuFalha status={payStatus} onClose={fecharPay}/>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root/>);

// remove a tela de boot assim que o React monta
const boot = document.getElementById("boot");
if (boot) {
  boot.style.transition = "opacity .25s ease";
  boot.style.opacity = "0";
  setTimeout(() => boot.remove(), 300);
}
