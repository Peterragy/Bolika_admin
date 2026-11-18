import { api, img } from "../api.js";
import { $, esc, money, date, badge, payBadge, STATUSES, STATUS_LABEL, PAY_LABEL, CHANNEL_LABEL, attempt } from "../ui.js";
import { t } from "../i18n.js";

/* Orders (admin and sales): a filterable list, and one order with its status and payment controls. */

export default async function orders(main, id, query) {
  if (id) return detail(main, id);
  const status = query.get("status") || "";
  const q = (query.get("q") || "").trim();
  const page = +(query.get("page") || 0);
  const { count, pageSize, orders: list } = await api(`/admin/orders?${new URLSearchParams({ status, q, page })}`);

  const link = (p) => {
    const u = new URLSearchParams({ ...(status && { status }), ...(q && { q }), ...p });
    for (const [k, v] of [...u]) if (v === "" || v === "0") u.delete(k);
    return `#/orders${u.size ? `?${u}` : ""}`;
  };
  main.innerHTML = `
    <header class="head"><div><h1>${t("Orders")}</h1><p class="sub">${t(count === 1 ? "{n} order" : "{n} orders", { n: count })}${status ? ` · ${STATUS_LABEL[status]}` : ""}</p></div></header>
    <div class="toolbar">
      <div class="seg seg--wrap">${["", ...STATUSES].map((s) => `<a href="${link({ status: s, page: 0 })}" aria-pressed="${s === status}">${s ? STATUS_LABEL[s] : t("All")}</a>`).join("")}</div>
      <form data-search class="search"><input name="q" value="${esc(q)}" placeholder="${t("Order #, name or phone")}" type="search" /></form>
    </div>
    <section class="card card--flush">
      ${list.length ? `<table class="table table--click table--cards t-orders">
        <thead><tr><th>${t("Order")}</th><th>${t("Customer")}</th><th>${t("City")}</th><th>${t("Items")}</th><th>${t("Status")}</th><th class="num">${t("Total")}</th><th>${t("Placed")}</th></tr></thead>
        <tbody>${list.map((o) => `
          <tr data-go="#/orders/${o.id}">
            <td><b>#${o.number}</b></td><td>${esc(o.customerName)}<small dir="ltr">${esc(o.phone)}</small></td><td>${esc(o.city)}</td>
            <td>${o.itemCount}<small>${esc(CHANNEL_LABEL[o.channel] || o.channel)}</small></td>
            <td>${badge(o.status)}${o.paymentStatus === "paid" ? "" : `<small>${payBadge(o.paymentStatus)}</small>`}</td>
            <td class="num">${money(o.total)}</td><td>${date(o.createdAt)}</td>
          </tr>`).join("")}</tbody></table>`
        : `<div class="empty"><b>${t("No orders here")}</b><p>${q || status ? t("Try another filter.") : t("Orders from the app and the website show up here.")}</p></div>`}
    </section>
    ${count > pageSize ? `<nav class="pager">
      ${page > 0 ? `<a class="btn" href="${link({ page: page - 1 })}">${t("← Newer")}</a>` : "<span></span>"}
      <span>${t("Page {p} of {n}", { p: page + 1, n: Math.ceil(count / pageSize) })}</span>
      ${(page + 1) * pageSize < count ? `<a class="btn" href="${link({ page: page + 1 })}">${t("Older →")}</a>` : "<span></span>"}
    </nav>` : ""}`;
  main.querySelectorAll("[data-go]").forEach((tr) => (tr.onclick = () => (location.hash = tr.dataset.go)));
  $("[data-search]", main).onsubmit = (e) => { e.preventDefault(); location.hash = link({ q: e.target.q.value.trim(), page: 0 }); };
}

async function detail(main, id) {
  const o = await api(`/admin/orders/${id}`);
  const cancelled = o.status === "cancelled";
  main.innerHTML = `
    <a class="back" href="#/orders">${t("← Orders")}</a>
    <header class="head"><div><h1>${t("Order #{n}", { n: o.number })}</h1><p class="sub">${t("Placed {d} · {c} · {m}", { d: date(o.createdAt), c: CHANNEL_LABEL[o.channel] || o.channel, m: o.paymentMethod === "cod" ? t("Cash on delivery") : "Paymob" })}</p></div><div class="badges">${badge(o.status)}${payBadge(o.paymentStatus)}</div></header>
    <div class="grid2 grid2--wide">
      <section class="card">
        <h2>${t("Items")}</h2>
        <table class="table table--cards t-items"><tbody>${o.items.map((i) => `
          <tr><td class="thumb">${i.image ? `<img src="${esc(img(i.image))}" alt="" />` : ""}</td>
            <td><b>${esc(i.name)}</b><small>${i.bundleId ? t("Gift set") : esc([i.variantLabel, i.size].filter(Boolean).join(" · "))}</small></td>
            <td class="num">${money(i.unitPrice)}${i.discountPercent ? `<small>${t("−{p}% (was {m})", { p: +i.discountPercent, m: money(i.originalPrice) })}</small>` : ""}</td>
            <td class="num">×${i.qty}</td><td class="num"><b>${money(i.lineTotal)}</b></td></tr>`).join("")}
        </tbody></table>
        <dl class="totals">
          <dt>${t("Subtotal")}</dt><dd>${money(o.subtotal)}</dd>
          ${+o.discountTotal ? `<dt>${t("Discounts")}${o.promoCode ? ` <small class="muted">· ${esc(o.promoCode)}</small>` : ""}</dt><dd>−${money(o.discountTotal)}</dd>` : ""}
          ${+o.pointsDiscount ? `<dt>${t("Bolika Circle points")} <small class="muted">· ${t("{n} points", { n: o.pointsUsed })}</small></dt><dd>−${money(o.pointsDiscount)}</dd>` : ""}
          <dt>${t("Delivery")}</dt><dd>${+o.shipping ? money(o.shipping) : t("Free")}</dd>
          ${o.giftWrap ? `<dt>${t("Gift wrapping")}</dt><dd>${t("Free")}</dd>` : ""}
          <dt class="is-total">${o.paymentMethod === "cod" ? t("Total to collect") : t("Total")}</dt><dd class="is-total">${money(o.total)}</dd>
        </dl>
        ${o.pointsEarned ? `<p class="muted" style="margin-top:10px">${t("Earns {n} Bolika Circle points once paid.", { n: o.pointsEarned })}</p>` : ""}
      </section>
      <div class="stack">
        <section class="card">
          <h2>${t("Update status")}</h2>
          ${cancelled ? `<p class="muted">${t("This order is cancelled: its items went back into stock and its points were returned.")}</p>` : `
          <form class="form" data-status>
            <label class="field"><span>${t("Status")}</span><select name="status">${STATUSES.map((s) => `<option value="${s}"${s === o.status ? " selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></label>
            <label class="field"><span>${t("Note for the customer (optional)")}</span><input name="note" placeholder="${t("e.g. Courier will call before arriving")}" /></label>
            <button class="btn btn--ink" type="submit">${t("Save status")}</button>
          </form>`}
        </section>
        <section class="card">
          <h2>${t("Payment")}</h2>
          <form class="form" data-pay>
            <label class="field"><span>${t("Payment status")}</span><select name="status">${Object.keys(PAY_LABEL).map((s) => `<option value="${s}"${s === o.paymentStatus ? " selected" : ""}>${PAY_LABEL[s]}</option>`).join("")}</select></label>
            <label class="field"><span>${t("Paymob transaction")}</span><input name="ref" value="${esc(o.paymentRef)}" dir="ltr" placeholder="—" /></label>
            <button class="btn" type="submit">${t("Save payment")}</button>
          </form>
        </section>
        <section class="card">
          <h2>${t("Customer")}</h2>
          <p class="kv"><b>${esc(o.customerName)}</b><a href="tel:${esc(o.phone)}" dir="ltr">${esc(o.phone)}</a>${o.email ? `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : ""}</p>
          <p class="kv"><span>${esc(o.address)}</span><span>${esc(o.city)}</span></p>
          ${o.notes ? `<p class="note">“${esc(o.notes)}”</p>` : ""}
        </section>
        <section class="card">
          <h2>${t("History")}</h2>
          <ul class="history">${o.events.map((e) => `<li>${badge(e.status)}${e.note ? `<span>${esc(e.note)}</span>` : ""}<time>${date(e.at)}${e.by ? ` · ${esc(e.by)}` : ""}</time></li>`).join("")}</ul>
        </section>
      </div>
    </div>`;
  $("[data-status]", main)?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.status.value === o.status && !f.note.value.trim()) return;
    if (f.status.value === "cancelled" && !confirm(t("Cancel order #{n}? Its items go back into stock and its points are returned. A cancelled order can't be reopened.", { n: o.number }))) return;
    await attempt(() => api(`/admin/orders/${o.id}/status`, { method: "PATCH", body: { status: f.status.value, note: f.note.value.trim() || null } }), t("Status saved"));
    detail(main, id);
  });
  $("[data-pay]", main).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    await attempt(() => api(`/admin/orders/${o.id}/payment`, { method: "PATCH", body: { status: f.status.value, ref: f.ref.value.trim() || null } }), t("Payment saved"));
    detail(main, id);
  };
}
