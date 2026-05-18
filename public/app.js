/* =====================================================================
 * VoiceParts AI - Frontend Custo Zero (100% client-side, sem libs)
 *
 *   Voz -> texto : Web Speech API nativa (SpeechRecognition)  -> $0
 *   texto -> API : POST /api/process-voice                    -> backend
 *   resposta -> voz : window.speechSynthesis (TTS nativo)     -> $0
 *
 * Push-to-talk (toque para ouvir uma frase): menos toques acidentais
 * com luvas e MENOS requisições = preserva o Free Tier do Gemini.
 * ===================================================================== */
(function () {
  "use strict";

  var API = "/api/process-voice";

  var micBtn = document.getElementById("mic");
  var micLabel = document.getElementById("micLabel");
  var statusEl = document.getElementById("status");

  // ---- Detecção de suporte (Chrome/Edge/Android; iOS Safari é instável) ----
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    micBtn.setAttribute("disabled", "true");
    setStatus(
      "Este navegador não suporta reconhecimento de voz. Use o Chrome no Android ou desktop.",
      true
    );
    return;
  }

  var recognition = new SR();
  recognition.lang = "pt-BR";
  recognition.continuous = false; // uma frase por toque
  recognition.interimResults = false; // só o resultado final (menos ruído/CPU)
  recognition.maxAlternatives = 1;

  var ouvindo = false;
  var processando = false;
  var capturou = false; // houve fala reconhecida nesta sessão?

  // -------------------------- UI helpers --------------------------
  function setStatus(msg, isErr) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("err", !!isErr);
  }
  function setState(state, label) {
    micBtn.dataset.state = state;
    micLabel.textContent = label;
  }

  // ----------------------- Síntese de voz (TTS) -------------------
  function falar(texto) {
    if (!("speechSynthesis" in window) || !texto) return;
    try {
      window.speechSynthesis.cancel(); // não acumula fila
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = "pt-BR";
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch (_) {
      /* TTS é "nice to have"; o texto já está na tela */
    }
  }

  // ------------------- Envio ao backend (robusto) -----------------
  function enviarTexto(texto) {
    processando = true;
    setState("thinking", "Processando");
    setStatus("“" + texto + "”");

    // timeout manual: free tier pode ter cold start; não trava a UI eternamente
    var ctrl = new AbortController();
    var t = setTimeout(function () {
      ctrl.abort();
    }, 15000);

    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: texto }),
      signal: ctrl.signal,
    })
      .then(function (r) {
        return r.json().catch(function () {
          return { fala: "Resposta inválida do servidor." };
        });
      })
      .then(function (data) {
        var fala = (data && data.fala) || "Não obtive resposta.";
        setStatus(fala);
        falar(fala);
      })
      .catch(function (err) {
        var msg =
          err && err.name === "AbortError"
            ? "O servidor demorou a responder. Tente de novo."
            : "Falha de conexão. Verifique a internet.";
        setStatus(msg, true);
        falar(msg);
      })
      .finally(function () {
        clearTimeout(t);
        processando = false;
        resetIdle();
      });
  }

  function resetIdle() {
    ouvindo = false;
    setState("idle", "Falar");
  }

  // ------------------- Eventos do reconhecimento ------------------
  recognition.onstart = function () {
    capturou = false;
    ouvindo = true;
    setState("listening", "Ouvindo…");
    setStatus("Pode falar.");
  };

  recognition.onresult = function (e) {
    capturou = true;
    var texto = (e.results[0][0].transcript || "").trim();
    if (texto) {
      enviarTexto(texto);
    } else {
      setStatus("Não entendi, repita.", true);
      falar("Não entendi, repita.");
      resetIdle();
    }
  };

  recognition.onerror = function (e) {
    if (processando) return; // erro tardio após já ter resultado
    var m = {
      "not-allowed": "Permissão de microfone negada. Libere nas configurações.",
      "service-not-allowed": "Microfone bloqueado pelo navegador.",
      "no-speech": "Não ouvi nada. Toque e fale novamente.",
      "audio-capture": "Microfone não encontrado.",
      network: "Sem internet para o reconhecimento de voz.",
    }[e.error] || "Erro ao ouvir. Tente novamente.";
    setStatus(m, true);
    falar(m);
    resetIdle();
  };

  recognition.onend = function () {
    // Terminou sem capturar nada e sem estar processando -> volta ao idle
    if (!capturou && !processando) resetIdle();
  };

  // --------------------------- Disparo ----------------------------
  function acionar() {
    if (ouvindo || processando) {
      // segundo toque enquanto ouve = cancelar
      try {
        recognition.stop();
      } catch (_) {}
      window.speechSynthesis && window.speechSynthesis.cancel();
      resetIdle();
      setStatus("Cancelado.");
      return;
    }
    try {
      recognition.start();
    } catch (_) {
      // start() chamado rápido demais após stop()
      resetIdle();
      setStatus("Aguarde um instante e tente de novo.", true);
    }
  }

  micBtn.addEventListener("click", acionar);
})();
