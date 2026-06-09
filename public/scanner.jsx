// scanner.jsx — Scanner de QR/Barcode + Modal pra mostrar QR de peça/equip
//
// Por que separado: html5-qrcode é uma biblioteca de ~120KB com lifecycle
// complicado (câmera, permissões, cleanup). Isolar evita acoplamento com
// screens.jsx (2900+ linhas).
//
// Reutilizável em: Almoxarifado (filtrar peça por SKU), OS detail (adicionar
// peça consumida), Equipamentos (selecionar pra abrir OS), futuramente
// qualquer lugar que precise "lê algo do mundo físico".
//
// UX otimizada pra mecânico de mão suja em fábrica barulhenta:
//  - Botão GRANDE de scan (não confunde com mic)
//  - Tela cheia preta com janela centrada (target óbvio)
//  - Vibração + fechamento automático na leitura (sem precisar tap extra)
//  - Botão X gigante pra cancelar (mira de polegar imprecisa)
//  - Fallback: campo de digitação se câmera negar

/* global Html5Qrcode, qrcode */
const { useState: useSc, useEffect: useScE, useRef: useScR } = React;

// =========================================================================
// SCANNER — câmera fullscreen, decodifica QR + barcodes 1D
// =========================================================================
function ScannerSheet({ titulo, onScan, onClose, modoTexto }) {
  const divRef = useScR(null);
  const qrRef = useScR(null);
  const [erro, setErro] = useSc(null);
  const [modoManual, setModoManual] = useSc(!!modoTexto);
  const [textoManual, setTextoManual] = useSc('');

  useScE(() => {
    if (modoManual) return; // se já tá em modo texto, não inicia câmera
    if (typeof Html5Qrcode === 'undefined') {
      setErro('Biblioteca do scanner não carregou. Recarrega a página.');
      return;
    }
    // Aguarda 1 tick pra o div existir no DOM
    const tid = setTimeout(() => {
      try {
        const id = 'maestro-qr-reader';
        const inst = new Html5Qrcode(id, /* verbose */ false);
        qrRef.current = inst;
        inst.start(
          { facingMode: 'environment' }, // câmera traseira
          {
            fps: 10,
            qrbox: function (w, h) {
              const min = Math.min(w, h);
              const size = Math.floor(min * 0.7);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            // SUCESSO — feedback tátil + fecha
            if (navigator.vibrate) { try { navigator.vibrate(80); } catch (_) {} }
            inst.stop().then(() => inst.clear()).catch(() => {});
            onScan(String(decodedText).trim());
          },
          (_msg) => { /* erros de frame são contínuos — ignora */ }
        ).catch((e) => {
          // Permissão negada, sem câmera, etc.
          const m = String(e && e.message || e || '');
          if (/permission|notallowed|denied/i.test(m)) {
            setErro('Permissão de câmera negada. Toque em "Digitar código" abaixo.');
          } else if (/notfound|nodevice/i.test(m)) {
            setErro('Sem câmera disponível. Use "Digitar código".');
          } else {
            setErro('Câmera indisponível. Use "Digitar código".');
          }
        });
      } catch (e) {
        setErro('Falha ao iniciar a câmera. Use "Digitar código".');
      }
    }, 30);
    return () => {
      clearTimeout(tid);
      if (qrRef.current) {
        try { qrRef.current.stop().then(() => qrRef.current.clear()).catch(() => {}); }
        catch (_) {}
      }
    };
  }, [modoManual]);

  function confirmarManual(e) {
    if (e) e.preventDefault();
    const t = textoManual.trim().toUpperCase();
    if (t.length < 2) return;
    onScan(t);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 11000,
      background: '#000', display: 'flex', flexDirection: 'column',
      animation: 'maestro-fade-in .2s ease both',
    }}>
      {/* Header com X gigante */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 16px',
        background: 'rgba(0,0,0,0.85)', color: M.text,
        paddingTop: 'max(14px, env(safe-area-inset-top))',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{titulo || 'Escanear código'}</div>
        <button onClick={onClose} aria-label="Fechar" style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(255,255,255,0.1)', border: 'none', color: M.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Icon name="x" size={22} strokeWidth={2.4}/>
        </button>
      </div>

      {/* Área da câmera ou modo manual */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {!modoManual && (
          <>
            <div id="maestro-qr-reader" ref={divRef} style={{
              width: '100%', height: '100%',
            }}/>
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'flex-end',
              padding: '0 16px 24px',
            }}>
              <div style={{
                background: 'rgba(0,0,0,0.7)', color: M.amber,
                padding: '10px 16px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, textAlign: 'center',
                maxWidth: 340,
              }}>
                {erro || 'Aponta a câmera pro QR/código de barras'}
              </div>
            </div>
          </>
        )}

        {modoManual && (
          <div style={{
            padding: '32px 24px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', height: '100%',
            color: M.text,
          }}>
            <div style={{
              fontSize: 13, color: M.textDim, marginBottom: 16, textAlign: 'center',
            }}>
              Digita o código SKU ou ID do equipamento:
            </div>
            <form onSubmit={confirmarManual} style={{ width: '100%', maxWidth: 360 }}>
              <input type="text" autoFocus value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
                placeholder="Ex.: FIL-A3F2 ou TRT-01"
                autoCapitalize="characters"
                style={{
                  width: '100%', padding: '14px 16px',
                  background: M.surface, border: `1px solid ${M.border}`,
                  borderRadius: 10, color: M.text,
                  fontSize: 18, fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: 1, textAlign: 'center',
                  textTransform: 'uppercase', outline: 'none',
                }}/>
              <button type="submit" disabled={textoManual.trim().length < 2}
                style={{
                  marginTop: 14, width: '100%', padding: '14px 20px',
                  background: M.amber, color: M.bgSolid, border: 'none',
                  borderRadius: 12, fontWeight: 800, fontSize: 15,
                  cursor: textoManual.trim().length < 2 ? 'not-allowed' : 'pointer',
                  opacity: textoManual.trim().length < 2 ? 0.5 : 1,
                }}>Confirmar</button>
            </form>
          </div>
        )}
      </div>

      {/* Footer: alterna entre câmera e digitar */}
      <div style={{
        flexShrink: 0, padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', justifyContent: 'center',
      }}>
        <button onClick={() => { setModoManual(!modoManual); setErro(null); }}
          style={{
            background: 'transparent', border: `1px solid ${M.amber}66`,
            color: M.amber, padding: '10px 20px', borderRadius: 10,
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
          {modoManual ? '↶ Voltar pra câmera' : '⌨ Digitar código'}
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// QR DISPLAY — modal mostra o QR de uma peça/equipamento pra imprimir
// e colar no item físico. Sem isso o scanner não tem o que ler.
// =========================================================================
function QrDisplaySheet({ codigo, titulo, subtitulo, onClose }) {
  const canvasRef = useScR(null);

  useScE(() => {
    if (!codigo || typeof qrcode === 'undefined') return;
    try {
      // typeNumber 0 = auto, errorCorrectionLevel 'M' = balance robusto/denso
      const qr = qrcode(0, 'M');
      qr.addData(String(codigo));
      qr.make();
      // Renderiza no canvas com cellSize alto pra impressão nítida
      const cellSize = 8;
      const margin = 4;
      const count = qr.getModuleCount();
      const size = (count + margin * 2) * cellSize;
      const cv = canvasRef.current;
      if (!cv) return;
      cv.width = size;
      cv.height = size;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#000';
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(
              (col + margin) * cellSize,
              (row + margin) * cellSize,
              cellSize, cellSize
            );
          }
        }
      }
    } catch (_) {}
  }, [codigo]);

  // Escapa HTML pra impedir XSS — `subtitulo` vem do nome da peça (input do
  // usuário) e `codigo` é sanitizado mas defesa em profundidade. Antes,
  // nome com `<script>` rodava no contexto da janela about:blank (mesma
  // origem do app → acessava `window.opener` e tokens do localStorage).
  function escHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function imprimir() {
    // 'noopener' aqui é parâmetro do window.open (na verdade ignorado por
    // alguns browsers via 3º arg) — repassamos w.opener=null por garantia
    // pra impedir que a janela impressa toque no app.
    const w = window.open('', '_blank', 'noopener');
    if (!w) return;
    try { w.opener = null; } catch (_) {}
    const dataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
    const cod = escHTML(codigo);
    const sub = escHTML(subtitulo);
    const img = escHTML(dataUrl);
    // dataUrl é data:image/png... — sem necessidade de escape adicional
    // porque escHTML já trata aspas; CSP da janela about:blank herda do app.
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"/>'
      + '<title>QR - ' + cod + '</title>'
      + '<style>'
      +   'body { font-family: sans-serif; text-align: center; padding: 40px; }'
      +   'img { width: 240px; height: 240px; }'
      +   '.codigo { font-family: monospace; font-size: 18px; font-weight: bold;'
      +             'letter-spacing: 2px; margin-top: 12px; }'
      +   '.nome { color: #555; font-size: 14px; margin-top: 4px; }'
      +   '@media print { body { padding: 0; } .no-print { display: none; } }'
      + '</style></head><body>'
      + '<img src="' + img + '" alt="QR ' + cod + '"/>'
      + '<div class="codigo">' + cod + '</div>'
      + (sub ? '<div class="nome">' + sub + '</div>' : '')
      + '<button class="no-print" onclick="window.print()" style="'
      +   'margin-top:24px;padding:10px 24px;font-size:14px;cursor:pointer;'
      +   'background:#06b6d4;color:#000;border:none;border-radius:8px;font-weight:bold;'
      + '">Imprimir</button>'
      + '<scr' + 'ipt>setTimeout(function(){window.print();},300);</scr' + 'ipt>'
      + '</body></html>'
    );
    w.document.close();
  }

  function baixar() {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = `qr-${codigo}.png`;
    a.click();
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10500,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'maestro-fade-in .2s ease both',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: M.surface, borderRadius: 16, padding: 24,
        maxWidth: 360, width: '100%', textAlign: 'center',
        border: `1px solid ${M.border}`,
      }}>
        <div style={{
          fontSize: 11, letterSpacing: 1.5, color: M.amber, fontWeight: 700,
          marginBottom: 4,
        }}>{titulo || 'QR CODE'}</div>
        {subtitulo && (
          <div style={{ fontSize: 16, fontWeight: 700, color: M.text, marginBottom: 16 }}>
            {subtitulo}
          </div>
        )}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 14, display: 'inline-block',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 240 }}/>
        </div>
        <div style={{
          marginTop: 12, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 18, fontWeight: 700, color: M.text, letterSpacing: 1,
          wordBreak: 'break-all',
        }}>{codigo}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={imprimir} style={{
            flex: 1, padding: '12px 14px', borderRadius: 10,
            background: M.amber, color: M.bgSolid, border: 'none',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>📄 Imprimir</button>
          <button onClick={baixar} style={{
            flex: 1, padding: '12px 14px', borderRadius: 10,
            background: M.surface2, color: M.text, border: `1px solid ${M.border}`,
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>📥 PNG</button>
        </div>
        <button onClick={onClose} style={{
          marginTop: 10, background: 'transparent', border: 'none',
          color: M.textDim, fontSize: 12.5, cursor: 'pointer', padding: 8,
        }}>Fechar</button>
      </div>
    </div>
  );
}

// Expõe pros outros .jsx (Babel-standalone executa tudo em global scope)
window.ScannerSheet = ScannerSheet;
window.QrDisplaySheet = QrDisplaySheet;
