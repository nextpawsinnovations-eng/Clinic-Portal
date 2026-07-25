// Shared API client for Admin Dashboard.html and Clinic Portal.html.
// Talks to the ArkBio backend (see /backend). Set window.ARKBIO_API_BASE
// before this script loads to point at a non-default API origin; otherwise
// it defaults to http://localhost:4000.
(function () {
  const BASE = window.ARKBIO_API_BASE || "http://localhost:4000";

  function tokenKey(role) {
    return role === "admin" ? "arkbio_admin_token" : "arkbio_clinic_token";
  }
  function getToken(role) {
    return sessionStorage.getItem(tokenKey(role));
  }
  function setToken(role, token) {
    if (token) sessionStorage.setItem(tokenKey(role), token);
    else sessionStorage.removeItem(tokenKey(role));
  }

  async function request(role, method, path, body) {
    const headers = { };
    const token = getToken(role);
    if (token) headers["Authorization"] = "Bearer " + token;
    let fetchBody;
    if (body instanceof FormData) {
      fetchBody = body;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      fetchBody = JSON.stringify(body);
    }
    const res = await fetch(BASE + path, { method, headers, body: fetchBody });
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const Api = {
    /* ---- admin auth ---- */
    async adminLogin(email, password) {
      const data = await request("admin", "POST", "/api/auth/admin/login", { email, password });
      setToken("admin", data.token);
      return data;
    },
    adminSignOut() { setToken("admin", null); },
    isAdminSignedIn() { return !!getToken("admin"); },

    /* ---- admin state (whole-blob sync) ---- */
    getAdminState() { return request("admin", "GET", "/api/admin/state"); },
    saveAdminState(state) { return request("admin", "PUT", "/api/admin/state", state); },

    /* ---- admin orders ---- */
    getOrders() { return request("admin", "GET", "/api/admin/orders"); },
    updateOrderStatus(id, status) { return request("admin", "PATCH", `/api/admin/orders/${encodeURIComponent(id)}`, { status }); },
    saveOrderInvoice(id, details) { return request("admin", "PATCH", `/api/admin/orders/${encodeURIComponent(id)}/invoice`, details); },

    /* ---- admin activity log ---- */
    getActivity() { return request("admin", "GET", "/api/admin/activity"); },
    logActivity(msg, color) { return request("admin", "POST", "/api/admin/activity", { msg, color }); },
    clearActivity() { return request("admin", "DELETE", "/api/admin/activity"); },

    /* ---- admin file uploads (donor photos, attachments, ethics docs, experiment/freezer photos) ---- */
    async uploadFile(file) {
      const form = new FormData();
      form.append("file", file);
      const data = await request("admin", "POST", "/api/admin/uploads", form);
      return data.url;
    },
    async uploadBlob(blob, filename) {
      return this.uploadFile(new File([blob], filename, { type: blob.type || "image/jpeg" }));
    },

    /* ---- clinic auth ---- */
    async clinicLogin(email, password) {
      const data = await request("clinic", "POST", "/api/auth/clinic/login", { email, password });
      setToken("clinic", data.token);
      return data.clinic;
    },
    clinicSignOut() { setToken("clinic", null); },
    isClinicSignedIn() { return !!getToken("clinic"); },

    /* ---- clinic browse/orders ---- */
    getBlood() { return request("clinic", "GET", "/api/clinic/blood"); },
    getMyOrders() { return request("clinic", "GET", "/api/clinic/orders/mine"); },
    placeOrder(payload) { return request("clinic", "POST", "/api/clinic/orders", payload); },

    /* ---- clinic research/expired stock ---- */
    getResearchStock() { return request("clinic", "GET", "/api/clinic/research-stock"); },
    placeResearchStockOrder(payload) { return request("clinic", "POST", "/api/clinic/research-stock/order", payload); },
  };

  window.Api = Api;
})();
