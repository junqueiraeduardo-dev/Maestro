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

  // Cabeçalhos: token (Bearer) + autor da ação (X-Ator) p/ o log
  function authHeaders(json) {
    var h = {};
    if (json) h["Content-Type"] = "application/json";
    var tk = getToken();
    if (tk) h["Authorization"] = "Bearer " + tk;
    h["X-Ator"] = ator();
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
    role: function () {
      try { return localStorage.getItem("maestro_role") || "filho"; }
      catch (_) { return "filho"; }
    },
    logout: function () {
      clearToken();
      try { localStorage.removeItem("maestro_role"); } catch (_) {}
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
    startTrial: function (email) {
      return fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.token) {
            var e = new Error(j && j.erro ? j.erro : "Falha ao iniciar teste.");
            e.expirado = !!(j && j.expirado);
            throw e;
          }
          setToken(j.token);
          try { localStorage.setItem("maestro_role", "trial"); } catch (_) {}
          return j; // { plano, expMs, dias }
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
    equipList: function (tipo, q) { return req("GET", "/api/equipamentos" + qs({ tipo: tipo, q: q })); },
    equipGet: function (codigo) { return req("GET", "/api/equipamentos/" + encodeURIComponent(codigo)); },
    equipCreate: function (payload) { return req("POST", "/api/equipamentos", payload); },
    equipUpdate: function (codigo, payload) { return req("PATCH", "/api/equipamentos/" + encodeURIComponent(codigo), payload); },
    equipDelete: function (codigo) { return req("DELETE", "/api/equipamentos/" + encodeURIComponent(codigo)); },
    pecaSearch: function (q) { return req("GET", "/api/pecas" + qs({ q: q })); },
    pecaCreate: function (payload) { return req("POST", "/api/pecas", payload); },
    pecaUpdate: function (sku, payload) { return req("PATCH", "/api/pecas/" + encodeURIComponent(sku), payload); },
    pecaDelete: function (sku) { return req("DELETE", "/api/pecas/" + encodeURIComponent(sku)); },
    inspecoesHoje: function () { return req("GET", "/api/inspecoes"); },
    inspecaoCreate: function (payload) { return req("POST", "/api/inspecoes", payload); },
    atividade: function () { return req("GET", "/api/atividade"); },
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
