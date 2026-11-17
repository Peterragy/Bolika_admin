import { sb, ok, img } from "../api.js";
import { $, esc, money, date, badge, payBadge, STATUSES, STATUS_LABEL, PAY_LABEL, CHANNEL_LABEL, attempt } from "../ui.js";
import { t } from "../i18n.js";

/* Orders (admin and sales): a filterable list, and one order with its status and payment controls. */

const PAGE = 25;

export default async function orders(main, id, query) {
  if (id) return detail(main, id);
  const status = query.get("status") || "";
  const q = (query.get("q") || "").replace(/[,()%*\\]/g, " ").trim(); // characters that would break the filter
  const page = +(query.get("page") || 0);

  let req = sb.from("orders").select("id, number, customer_name, phone, city, total, status, payment_status, channel, created_at, order_items(qty)", { count: "exact" })
    .order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
  if (status) req = req.eq("status", status);
  if (q) req = /^\d+$/.test(q) ? req.or(`number.eq.${q},phone.ilike.%${q}%`) : req.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, count, error } = await req;
  if (error) throw error;

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
      ${data.length ? `<table class="table table--click table--cards t-orders">
        <thead><tr><th>${t("Order")}</th><th>${t("Customer")}</th><th>${t("City")}</th><th>${t("Items")}</th><th>${t("Status")}</th><th class="num">${t("Total")}</th><th>${t("Placed")}</th></tr></thead>
        <tbody>${data.map((o) => `
          <tr data-go="#/orders/${o.id}">
            <td><b>#${o.number}</b></td><td>${esc(o.customer_name)}<small dir="ltr">${esc(o.phone)}</small></td><td>${esc(o.city)}</td>
            <td>${o.order_items.reduce((n, i) => n + i.qty, 0)}<small>${esc(CHANNEL_LABEL[o.channel] || o.channel)}</small></td><td>${badge(o.status)}${o.payment_status === "paid" ? "" : `<small>${payBadge(o.payment_status)}</small>`}</td><td class="num">${money(o.total)}</td><td>${date(o.created_at)}</td>
          </tr>`).join("")}</tbody></table>`
        : `<div class="empty"><b>${t("No orders here")}</b><p>${q || status ? t("Try another filter.") : t("Orders from the app and the website show up here.")}</p></div>`}
    </section>
    ${count > PAGE ? `<nav class="pager">
      ${page > 0 ? `<a class="btn" href="${link({ page: page - 1 })}">${t("← Newer")}</a>` : "<span></span>"}
      <span>${t("Page {p} of {n}", { p: page + 1, n: Math.ceil(count / PAGE) })}</span>
      ${(page + 1) * PAGE < count ? `<a class="btn" href="${link({ page: page + 1 })}">${t("Older →")}</a>` : "<span></span>"}
    </nav>` : ""}`;
  main.querySelectorAll("[data-go]").forEach((tr) => (tr.onclick = () => (location.hash = tr.dataset.go)));
  $("[data-search]", main).onsubmit = (e) => { e.preventDefault(); location.hash = link({ q: e.target.q.value.trim(), page: 0 }); };
}

async function detail(main, id) {
  const o = ok(await sb.from("orders").select("*, order_items(*), order_events(status, note, created_at)").eq("id", id).single());
  o.order_events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  main.innerHTML = `
    <a class="back" href="#/orders">${t("← Orders")}</a>
    <header class="head"><div><h1>${t("Order #{n}", { n: o.number })}</h1><p class="sub">${t("Placed {d} · {c} · {m}", { d: date(o.created_at), c: CHANNEL_LABEL[o.channel] || o.channel, m: o.payment_method === "cod" ? t("Cash on delivery") : "Paymob" })}</p></div><div class="badges">${badge(o.status)}${payBadge(o.payment_status)}</div></header>
    <div class="grid2 grid2--wide">
      <section class="card">
        <h2>${t("Items")}</h2>
        <table class="table table--cards t-items"><tbody>${o.order_items.map((i) => `
          <tr><td class="thumb">${i.image ? `<img src="${esc(img(i.image))}" alt="" />` : ""}</td>
            <td><b>${esc(i.name)}</b><small>${i.bundle_id ? t("Gift set") : esc([i.variant_label, i.size].filter(Boolean).join(" · "))}</small></td>
            <td class="num">${money(i.unit_price)}${i.discount_percent ? `<small>${t("−{p}% (was {m})", { p: +i.discount_percent, m: money(i.original_price) })}</small>` : ""}</td>
            <td class="num">×${i.qty}</td><td class="num"><b>${money(i.line_total)}</b></td></tr>`).join("")}
        </tbody></table>
        <dl class="totals">
          <dt>${t("Subtotal")}</dt><dd>${money(o.subtotal)}</dd>
          ${+o.discount_total ? `<dt>${t("Discounts")}${o.promo_code ? ` <small class="muted">· ${esc(o.promo_code)}</small>` : ""}</dt><dd>−${money(o.discount_total)}</dd>` : ""}
          ${+o.points_discount ? `<dt>${t("Bolika Circle points")} <small class="muted">· ${t("{n} points", { n: o.points_used })}</small></dt><dd>−${money(o.points_discount)}</dd>` : ""}
          <dt>${t("Delivery")}</dt><dd>${+o.shipping ? money(o.shipping) : t("Free")}</dd>
          ${o.gift_wrap ? `<dt>${t("Gift wrapping")}</dt><dd>${t("Free")}</dd>` : ""}
          <dt class="is-total">${o.payment_method === "cod" ? t("Total to collect") : t("Total")}</dt><dd class="is-total">${money(o.total)}</dd>
        </dl>
      </section>
      <div class="stack">
        <section class="card">
          <h2>${t("Update status")}</h2>
          <form class="form" data-status>
            <label class="field"><span>${t("Status")}</span><select name="status">${STATUSES.map((s) => `<option value="${s}"${s === o.status ? " selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></label>
            <label class="field"><span>${t("Note for the customer (optional)")}</span><input name="note" placeholder="${t("e.g. Courier will call before arriving")}" /></label>
            <button class="btn btn--ink" type="submit">${t("Save status")}</button>
          </form>
        </section>
        <section class="card">
          <h2>${t("Payment")}</h2>
          <form class="form" data-pay>
            <label class="field"><span>${t("Payment status")}</span><select name="status">${Object.keys(PAY_LABEL).map((s) => `<option value="${s}"${s === o.payment_status ? " selected" : ""}>${PAY_LABEL[s]}</option>`).join("")}</select></label>
            <label class="field"><span>${t("Paymob transaction")}</span><input name="ref" value="${esc(o.payment_ref)}" dir="ltr" placeholder="—" /></label>
            <button class="btn" type="submit">${t("Save payment")}</button>
          </form>
        </section>
        <section class="card">
          <h2>${t("Customer")}</h2>
          <p class="kv"><b>${esc(o.customer_name)}</b><a href="tel:${esc(o.phone)}" dir="ltr">${esc(o.phone)}</a>${o.email ? `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : ""}</p>
          <p class="kv"><span>${esc(o.address)}</span><span>${esc(o.city)}</span></p>
          ${o.notes ? `<p class="note">“${esc(o.notes)}”</p>` : ""}
        </section>
        <section class="card">
          <h2>${t("History")}</h2>
          <ul class="history">${o.order_events.map((e) => `<li>${badge(e.status)}${e.note ? `<span>${esc(e.note)}</span>` : ""}<time>${date(e.created_at)}</time></li>`).join("")}</ul>
        </section>
      </div>
    </div>`;
  $("[data-pay]", main).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    await attempt(() => sb.rpc("set_payment_status", { p_order: o.id, p_status: f.status.value, p_ref: f.ref.value.trim() || null }).then(ok), t("Payment saved"));
    detail(main, id);
  };
  $("[data-status]", main).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.status.value === o.status && !f.note.value.trim()) return;
    await attempt(() => sb.rpc("set_order_status", { p_order: o.id, p_status: f.status.value, p_note: f.note.value.trim() || null }).then(ok), t("Status saved"));
    detail(main, id);
  };
}
