/* Small helpers shared by the dashboard's views. */

import { t, locale, AR } from "./i18n.js";

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const money = (n) => {
  const v = Math.round(+n || 0).toLocaleString("en-EG");
  return AR ? `${v} ج.م` : `EGP ${v}`;
};
export const date = (d, time = true) =>
  d ? new Date(d).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—";
/** "2026-11-04T10:30" for <input type="datetime-local"> */
export const localInput = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

export const STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];
export const STATUS_LABEL = { pending: t("Pending"), confirmed: t("Confirmed"), preparing: t("Preparing"), shipped: t("Shipped"), delivered: t("Delivered"), cancelled: t("Cancelled") };
export const badge = (s) => `<span class="badge badge--${s}">${esc(STATUS_LABEL[s] || s)}</span>`;

export function toast(msg, kind = "ok") {
  let el = $(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
  el.textContent = msg;
  el.className = `toast is-on toast--${kind}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("is-on"), 3200);
}

/** Run an async action, showing its error as a toast. */
export async function attempt(fn, done) {
  try {
    const r = await fn();
    if (done) toast(done);
    return r;
  } catch (e) {
    toast(e.message || String(e), "error");
    throw e;
  }
}

/** A modal form. render(body) fills it; resolve with onSave's result or null when closed. */
export function modal(title, html, { wide = false } = {}) {
  const dlg = document.createElement("dialog");
  dlg.className = `modal${wide ? " modal--wide" : ""}`;
  dlg.innerHTML = `<header class="modal__head"><h2>${esc(title)}</h2><button class="iconbtn" data-x aria-label="${t("Close")}">×</button></header><div class="modal__body">${html}</div>`;
  document.body.append(dlg);
  dlg.addEventListener("close", () => dlg.remove());
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-x]")) dlg.close(); });
  dlg.showModal();
  return dlg;
}

export const field = (label, input, cls = "") => `<label class="field ${cls}"><span>${esc(label)}</span>${input}</label>`;

export const ROLE_LABEL = { admin: t("Admin"), inventory: t("Inventory manager"), sales: t("Sales manager"), customer: t("No access") };
export const PAY_LABEL = { pending: t("Awaiting payment"), paid: t("Paid"), failed: t("Payment failed"), refunded: t("Refunded") };
export const payBadge = (s) => `<span class="badge badge--pay-${s}">${esc(PAY_LABEL[s] || s)}</span>`;
export const CHANNEL_LABEL = { app: t("App"), website: t("Website"), boutique: t("Boutique") };
/** Stock as staff read it: ∞ when not tracked, a warning colour when low or out. */
export const stockCell = (n, low = 5) =>
  n == null ? `<span class="muted">∞</span>` : n <= 0 ? `<span class="stock stock--out">${t("Out")}</span>` : n <= low ? `<span class="stock stock--low">${n}</span>` : `${n}`;
