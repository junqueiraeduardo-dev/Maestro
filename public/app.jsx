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
              "{transcript}<span style={{ color: M.amber, marginLeft: 2 }}>|</span>"
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
function App({ onLogout }) {
  const [tab, setTab] = useS("home");
  const [stack, setStack] = useS([]);
  const [toast, setToast] = useS(null);
  // mic: { phase: 'idle'|'listening'|'thinking'|'result', transcript, resp }
  const [mic, setMic] = useS({ phase: "idle", transcript: "", resp: null });

  const recogRef = useR(null);
  const phaseRef = useR("idle");
  const finalRef = useR("");
  phaseRef.current = mic.phase;

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
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      background: M.bg, overflow: "hidden",
      paddingTop: "env(safe-area-inset-top)",
    }}>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: M.bg,
        WebkitOverflowScrolling: "touch" }}>
        {body}
      </div>

      <MicFAB state={mic.phase === "thinking" ? "thinking" : mic.phase}
        onPress={micPress}/>

      <BottomTabBar active={tab} onChange={(t) => nav.go(t)}/>

      <BottomSheet open={mic.phase !== "idle"} onClose={closeMic}>
        <VoiceSheet phase={mic.phase} transcript={mic.transcript}
          resp={mic.resp} onClose={closeMic}/>
      </BottomSheet>

      <Toast toast={toast}/>
    </div>
  );
}

// =========================================================================
// LOGIN — portão de acesso (senha compartilhada)
// =========================================================================
function Login({ onOk }) {
  const [senha, setSenha] = useS("");
  const [busy, setBusy] = useS(false);
  const [erro, setErro] = useS(null);

  function entrar(e) {
    if (e) e.preventDefault();
    if (!senha) return;
    setBusy(true); setErro(null);
    window.API.login(senha)
      .then(() => onOk())
      .catch((err) => { setErro(err.message || "Falha no login."); setBusy(false); });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: M.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 28,
      paddingTop: "env(safe-area-inset-top)",
    }}>
      <div style={{ marginBottom: 28 }}><Logo size={64} word/></div>
      <form onSubmit={entrar} style={{ width: "100%", maxWidth: 360 }}>
        <div style={{
          fontSize: 13, color: M.textDim, textAlign: "center", marginBottom: 18,
        }}>Acesso restrito. Informe a senha.</div>
        <input
          type="password" value={senha} autoFocus
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          style={{
            width: "100%", background: M.surface,
            border: `1px solid ${erro ? M.red : M.border}`,
            borderRadius: 12, padding: "14px 16px", color: M.text,
            fontSize: 16, fontFamily: "Inter, sans-serif", outline: "none",
            marginBottom: 14,
          }}/>
        {erro && (
          <div style={{ fontSize: 13, color: M.red, marginBottom: 14, textAlign: "center" }}>{erro}</div>
        )}
        <Btn variant="primary" full icon="check" disabled={busy}
          onClick={entrar}>{busy ? "Entrando…" : "Entrar"}</Btn>
      </form>
      <div style={{ marginTop: 26, fontSize: 11, color: M.textMute, letterSpacing: 1 }}>
        MAESTRO · CMMS POR VOZ
      </div>
    </div>
  );
}

function Root() {
  const [authed, setAuthed] = useS(window.API.isAuthed());
  if (!authed) return <Login onOk={() => setAuthed(true)}/>;
  return <App onLogout={() => window.API.logout()}/>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root/>);

// remove a tela de boot assim que o React monta
const boot = document.getElementById("boot");
if (boot) {
  boot.style.transition = "opacity .25s ease";
  boot.style.opacity = "0";
  setTimeout(() => boot.remove(), 300);
}
