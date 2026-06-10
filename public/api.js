// api.js — cliente HTTP fininho para o backend real do Maestro.
// Carregado antes dos .jsx; exposto como window.API.
(function () {
  "use strict";

  var TOKEN_KEY = "maestro_token";
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } }
  function setToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (_) {} }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (_) {} }

  function ator() {
    try {
      return (localStorage.getItem("maestro_nome") ||
        localStorage.getItem("maestro_email") || "—").slice(0, 120);
    } catch (_) { return "—"; }
  }
  function getWorkspace() {
    try { return localStorage.getItem("maestro_workspace_id") || ""; } catch (_) { return ""; }
  }
  function setWorkspace(id) {
    try { localStorage.setItem("maestro_workspace_id", id); } catch (_) {}
  }

  // Cabeçalhos: token + autor + workspace ativo (X-Workspace-Id)
  function authHeaders(json) {
    var h = {};
    if (json) h["Content-Type"] = "application/json";
    var tk = getToken();
    if (tk) h["Authorization"] = "Bearer " + tk;
    h["X-Ator"] = ator();
    var ws = getWorkspace();
    if (ws) h["X-Workspace-Id"] = ws;
    return h;
  }

  function req(method, url, body) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch(url, {
      method: method,
      headers: authHeaders(!!body),
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401) {
            // token inválido/expirado -> derruba a sessão e volta ao login
            clearToken();
            location.reload();
            throw new Error("Sessão expirada.");
          }
          if (!r.ok) throw new Error(j && j.erro ? j.erro : "Erro " + r.status);
          return j;
        });
      })
      .finally(function () { clearTimeout(t); });
  }

  function qs(params) {
    var p = Object.keys(params || {})
      .filter(function (k) { return params[k] != null && params[k] !== ""; })
      .map(function (k) { return k + "=" + encodeURIComponent(params[k]); });
    return p.length ? "?" + p.join("&") : "";
  }

  window.API = {
    // ---- portão de acesso ----
    isAuthed: function () { return !!getToken(); },
    authHeaders: authHeaders,
    // Default 'pai': sem ACCESS_PASSWORD_ADMIN configurado no servidor,
    // quem entra é dono (acesso total). Filho só quando o backend define
    // explicitamente (login com senha não-admin em ambiente que separa).
    role: function () {
      try { return localStorage.getItem("maestro_role") || "pai"; }
      catch (_) { return "pai"; }
    },
    logout: function () {
      clearToken();
      try {
        localStorage.removeItem("maestro_role");
        localStorage.removeItem("maestro_workspace_id");
      } catch (_) {}
      location.reload();
    },
    login: function (senha) {
      return fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: senha }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.token) throw new Error(j && j.erro ? j.erro : "Falha no login.");
          setToken(j.token);
          try { localStorage.setItem("maestro_role", j.role || "filho"); } catch (_) {}
          return true;
        });
      });
    },
    // Cadastrar: cria conta com SENHA própria e inicia teste grátis.
    cadastrar: function (email, senha, nome) {
      return fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, senha: senha, nome: nome }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.token) {
            var e = new Error(j && j.erro ? j.erro : "Falha ao cadastrar.");
            e.expirado = !!(j && j.expirado);
            e.jaCadastrado = !!(j && j.jaCadastrado);
            throw e;
          }
          setToken(j.token);
          try {
            localStorage.setItem("maestro_role", "trial");
            if (j.nome) localStorage.setItem("maestro_nome", j.nome);
          } catch (_) {}
          return j;
        });
      });
    },
    // Entrar: login por e-mail + senha pessoal.
    entrar: function (email, senha) {
      return fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, senha: senha }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.token) {
            var e = new Error(j && j.erro ? j.erro : "Falha ao entrar.");
            e.expirado = !!(j && j.expirado);
            e.semConta = !!(j && j.semConta);
            throw e;
          }
          setToken(j.token);
          try {
            localStorage.setItem("maestro_role", "trial");
            if (j.nome) localStorage.setItem("maestro_nome", j.nome);
          } catch (_) {}
          return j;
        });
      });
    },
    // Esqueci minha senha: pede o link mágico por e-mail.
    // Resposta SEMPRE genérica (o servidor não revela se o e-mail existe).
    esqueciSenha: function (email) {
      return fetch("/api/senha/esqueci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j && j.erro ? j.erro : "Falha ao pedir o link.");
          return j;
        });
      });
    },
    // Redefinir a senha usando o token do link mágico (?reset=...).
    redefinirSenha: function (token, senha) {
      return fetch("/api/senha/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, senha: senha }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j && j.erro ? j.erro : "Falha ao redefinir a senha.");
          return j;
        });
      });
    },
    // Lê o plano a partir do token (sem ida ao servidor)
    plan: function () {
      var t = getToken();
      if (!t) return null;
      if (t.indexOf("t.") !== 0) return { plan: "premium" };
      try {
        var b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        while (b.length % 4) b += "=";
        var p = JSON.parse(atob(b));
        var dias = Math.max(0, Math.ceil((p.exp - Date.now()) / 86400000));
        return { plan: "trial", exp: p.exp, dias: dias, expirado: p.exp <= Date.now() };
      } catch (_) { return { plan: "trial", dias: 0, expirado: true }; }
    },
    osList: function (status) { return req("GET", "/api/os" + qs({ status: status })); },
    osGet: function (codigo) { return req("GET", "/api/os/" + encodeURIComponent(codigo)); },
    osCreate: function (payload) { return req("POST", "/api/os", payload); },
    osClose: function (codigo) { return req("POST", "/api/os/" + encodeURIComponent(codigo) + "/fechar"); },
    osComment: function (codigo, payload) { return req("POST", "/api/os/" + encodeURIComponent(codigo) + "/comentarios", payload); },
    osAddPeca: function (codigo, payload) { return req("POST", "/api/os/" + encodeURIComponent(codigo) + "/pecas", payload); },
    osDelete: function (codigo) { return req("DELETE", "/api/os/" + encodeURIComponent(codigo)); },
    equipList: function (tipo, q, verTudo) {
      var perf = "";
      if (!verTudo) {
        try { perf = localStorage.getItem("maestro_perfil") || ""; } catch (_) {}
      }
      return req("GET", "/api/equipamentos" + qs({ tipo: tipo, q: q, perfil: perf }));
    },
    equipGet: function (codigo) { return req("GET", "/api/equipamentos/" + encodeURIComponent(codigo)); },
    equipCreate: function (payload) { return req("POST", "/api/equipamentos", payload); },
    equipUpdate: function (codigo, payload) { return req("PATCH", "/api/equipamentos/" + encodeURIComponent(codigo), payload); },
    equipDelete: function (codigo) { return req("DELETE", "/api/equipamentos/" + encodeURIComponent(codigo)); },
    pecaSearch: function (q, verTudo) {
      var perf = "";
      if (!verTudo) {
        try { perf = localStorage.getItem("maestro_perfil") || ""; } catch (_) {}
      }
      return req("GET", "/api/pecas" + qs({ q: q, perfil: perf }));
    },
    pecaCreate: function (payload) { return req("POST", "/api/pecas", payload); },
    pecaUpdate: function (sku, payload) { return req("PATCH", "/api/pecas/" + encodeURIComponent(sku), payload); },
    pecaDelete: function (sku) { return req("DELETE", "/api/pecas/" + encodeURIComponent(sku)); },
    inspecoesHoje: function () { return req("GET", "/api/inspecoes"); },
    inspecaoCreate: function (payload) { return req("POST", "/api/inspecoes", payload); },
    // ---- Export CSV (download direto, com auth via header) ----
    // `tipo` = "pecas" | "equipamentos" | "os" | "movimentos"
    // Faz fetch autenticado, recebe blob, dispara download. Não abre nova aba
    // (browser não enviaria o Authorization). Aceita filtros opcionais (status/desde).
    exportCSV: function (tipo, filtros) {
      var url = "/api/export/" + encodeURIComponent(tipo) + ".csv" + qs(filtros || {});
      return fetch(url, { method: "GET", headers: authHeaders(false) })
        .then(function (r) {
          if (r.status === 401) { clearToken(); location.reload(); throw new Error("Sessão expirada."); }
          if (!r.ok) throw new Error("Erro " + r.status);
          // nome do arquivo vem no Content-Disposition; fallback pra "tipo-data.csv"
          var dispo = r.headers.get("Content-Disposition") || "";
          var m = /filename="?([^";]+)"?/.exec(dispo);
          var nome = m ? m[1] : "maestro-" + tipo + ".csv";
          return r.blob().then(function (b) {
            var href = URL.createObjectURL(b);
            var a = document.createElement("a");
            a.href = href; a.download = nome;
            document.body.appendChild(a); a.click();
            setTimeout(function () { URL.revokeObjectURL(href); a.remove(); }, 0);
          });
        });
    },
    // ---- Importação em lote (array JSON; o CSV é parseado no browser) ----
    importPecas: function (itens) { return req("POST", "/api/import/pecas", { itens: itens }); },
    importEquipamentos: function (itens) { return req("POST", "/api/import/equipamentos", { itens: itens }); },
    atividade: function () { return req("GET", "/api/atividade"); },
    // Marketplace: busca pelo nome da peça no Mercado Livre (link externo).
    // Nenhum dado nosso é compartilhado — só uma URL de busca pública.
    // Workspaces
    workspaceList: function () { return req("GET", "/api/workspaces"); },
    workspaceCreate: function (payload) { return req("POST", "/api/workspaces", payload); },
    workspaceActive: function () { return getWorkspace(); },
    workspaceSetActive: function (id) { setWorkspace(id); },
    // Constrói a URL com CONTEXTO para não cair em produtos não relacionados.
    // Prioridade: categoria da peça > domínio do perfil > "peça automotiva".
    mlBusca: function (nome, categoria) {
      var DOMINIO = {
        'Produtor rural': 'agrícola',
        'Empresário': 'industrial',
        'Dono de loja / oficina': 'automotivo',
        'Mecânico / Operador': 'automotivo',
        'Gestor de manutenção': 'industrial',
      };
      var perfil = "";
      try { perfil = localStorage.getItem("maestro_perfil") || ""; } catch (_) {}
      var ctx = (categoria && String(categoria).trim()) ||
                DOMINIO[perfil] || "peça automotiva";
      var q = ((nome || "") + " " + ctx)
        .toString()
        .slice(0, 100)
        .replace(/[^\wÀ-ÿ\s\-/]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return "https://lista.mercadolivre.com.br/" + encodeURIComponent(q);
    },
    // LGPD: usuário apaga próprio cadastro (e-mail + senha hashada + assinaturas)
    contaExcluir: function () { return req("DELETE", "/api/conta"); },
    // Premium cancela assinatura: marca cancelada, mantém acesso até valido_ate
    contaCancelar: function () { return req("POST", "/api/conta/cancelar"); },
    // Equipe — chefe gera convite + lista membros
    equipeListar: function () { return req("GET", "/api/equipe"); },
    conviteCriar: function (dias, maxUsos) {
      return req("POST", "/api/equipe/convite",
        { dias: dias || 7, maxUsos: maxUsos || 25 });
    },
    conviteRevogar: function (codigo) {
      return req("POST", "/api/equipe/convite/" + encodeURIComponent(codigo) + "/revogar");
    },
    // Valida convite ANTES do cadastro (público, sem token)
    conviteValidar: function (codigo) {
      return fetch("/api/equipe/convite/" + encodeURIComponent(codigo))
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok) throw new Error(j && j.erro ? j.erro : "Convite inválido.");
            return j;
          });
        });
    },
    // Cadastrar trial COM convite (usa o mesmo endpoint /api/trial)
    cadastrarComConvite: function (email, senha, codigo, nome) {
      return fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, senha: senha, convite: codigo, nome: nome }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.token) {
            var e = new Error(j && j.erro ? j.erro : "Falha ao cadastrar.");
            e.expirado = !!(j && j.expirado);
            e.jaCadastrado = !!(j && j.jaCadastrado);
            throw e;
          }
          setToken(j.token);
          try {
            localStorage.setItem("maestro_role", "trial");
            if (j.nome) localStorage.setItem("maestro_nome", j.nome);
          } catch (_) {}
          return j;
        });
      });
    },
    // Busca a chave Premium emitida pra um payment_id (TTL 7d após pagamento).
    payChave: function (paymentId) {
      return fetch("/api/pay/chave?payment_id=" + encodeURIComponent(paymentId))
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok) throw new Error(j && j.erro ? j.erro : "Falha ao buscar a chave.");
            return j;
          });
        });
    },
    // Faz login direto com a chave Premium (mesmo fluxo do botão "Já sou Premium")
    loginComChave: function (chave) {
      return fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: chave }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j && j.erro ? j.erro : "Falha ao entrar.");
          return j;
        });
      });
    },
    // Persiste sessão (token + role) — usado pelo auto-login após pagamento
    sessaoSalvar: function (j) {
      if (j && j.token) setToken(j.token);
      try {
        if (j && j.role) localStorage.setItem("maestro_role", j.role);
      } catch (_) {}
    },
    // pagamento (público — não exige token)
    payCheckout: function (plano, email) {
      return fetch("/api/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: plano, email: email }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.url) throw new Error(j && j.erro ? j.erro : "Falha ao iniciar pagamento.");
          return j.url;
        });
      });
    },
  };
})();
