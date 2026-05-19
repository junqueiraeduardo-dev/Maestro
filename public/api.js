// api.js — cliente HTTP fininho para o backend real do Maestro.
// Carregado antes dos .jsx; exposto como window.API.
(function () {
  "use strict";

  var TOKEN_KEY = "maestro_token";
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } }
  function setToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (_) {} }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (_) {} }

  // Cabeçalhos com o token do portão de acesso (Authorization: Bearer)
  function authHeaders(json) {
    var h = {};
    if (json) h["Content-Type"] = "application/json";
    var tk = getToken();
    if (tk) h["Authorization"] = "Bearer " + tk;
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
    logout: function () { clearToken(); location.reload(); },
    login: function (senha) {
      return fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: senha }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.token) throw new Error(j && j.erro ? j.erro : "Falha no login.");
          setToken(j.token);
          return true;
        });
      });
    },
    osList: function (status) { return req("GET", "/api/os" + qs({ status: status })); },
    osGet: function (codigo) { return req("GET", "/api/os/" + encodeURIComponent(codigo)); },
    osCreate: function (payload) { return req("POST", "/api/os", payload); },
    osClose: function (codigo) { return req("POST", "/api/os/" + encodeURIComponent(codigo) + "/fechar"); },
    osComment: function (codigo, payload) { return req("POST", "/api/os/" + encodeURIComponent(codigo) + "/comentarios", payload); },
    osAddPeca: function (codigo, payload) { return req("POST", "/api/os/" + encodeURIComponent(codigo) + "/pecas", payload); },
    equipList: function (tipo, q) { return req("GET", "/api/equipamentos" + qs({ tipo: tipo, q: q })); },
    equipGet: function (codigo) { return req("GET", "/api/equipamentos/" + encodeURIComponent(codigo)); },
    equipCreate: function (payload) { return req("POST", "/api/equipamentos", payload); },
    equipUpdate: function (codigo, payload) { return req("PATCH", "/api/equipamentos/" + encodeURIComponent(codigo), payload); },
    pecaSearch: function (q) { return req("GET", "/api/pecas" + qs({ q: q })); },
    pecaCreate: function (payload) { return req("POST", "/api/pecas", payload); },
    pecaUpdate: function (sku, payload) { return req("PATCH", "/api/pecas/" + encodeURIComponent(sku), payload); },
  };
})();
