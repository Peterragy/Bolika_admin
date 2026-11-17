import { sb, ok } from "../api.js";
import { $, esc, money, badge, STATUSES, CHANNEL_LABEL } from "../ui.js";
import { t, locale } from "../i18n.js";

/* Overview (admin): headline numbers, revenue per day, orders by status and channel,
   best sellers, and a nudge when stock is running low. */

const RANGES = [["7", t("7 days")], ["30", t("30 days")], ["90", t("90 days")], ["365", t("12 months")]];

export default async function overview(main) {
  const days = sessionStorage.getItem("bolika-range") || "30";
  main.innerHTML = `
    <header class="head">
      <div><h1>${t("Overview")}</h1><p class="sub">${t("Cancelled orders are left out of revenue.")}</p></div>
      <div class="seg" role="group" aria-label="${t("Period")}">${RANGES.map(([d, l]) => `<button data-days="${d}" aria-pressed="${d === days}">${l}</button>`).join("")}</div>
    </header>
    <div data-body><p class="loading">${t("Loading…")}</p></div>`;
  main.querySelectorAll("[data-days]").forEach((b) => (b.onclick = () => { sessionStorage.setItem("bolika-range", b.dataset.days); overview(main); }));

  const to = new Date();
  to.setDate(to.getDate() + 1);
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - +days);
  const s = ok(await sb.rpc("sales_summary", { p_from: from.toISOString(), p_to: to.toISOString() }));
  const recent = ok(await sb.from("orders").select("id, number, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(6));

  const tiles = [
    [t("Revenue"), money(s.revenue), t("{m} paid", { m: money(s.paid_revenue) })],
    [t("Orders"), s.orders, t("{n} cancelled", { n: s.cancelled })],
    [t("Average order"), money(s.avg_order), t("{n} items sold", { n: s.items })],
    [t("Customers"), s.customers, t("placed an order")],
  ];
  $("[data-body]", main).innerHTML = `
    ${s.low_stock ? `<a class="alert" href="#/products?stock=low"><b>${t(s.low_stock === 1 ? "{n} item is low on stock" : "{n} items are low on stock", { n: s.low_stock })}</b><span>${t("Check stock →")}</span></a>` : ""}
    <section class="tiles">${tiles.map(([l, v, n]) => `<div class="tile"><span>${l}</span><b>${v}</b><small>${esc(n)}</small></div>`).join("")}</section>
    <section class="card">
      <h2>${t("Revenue per day")}</h2>
      ${chart(s.by_day, from, +days)}
    </section>
    <div class="grid2">
      <section class="card">
        <h2>${t("Orders by status")}</h2>
        <ul class="statlist">${STATUSES.map((st) => `<li><a href="#/orders?status=${st}">${badge(st)}<b>${s.by_status[st] || 0}</b></a></li>`).join("")}</ul>
      </section>
      <section class="card">
        <h2>${t("Orders by channel")}</h2>
        <ul class="statlist">${["app", "website", "boutique"].filter((c) => c !== "boutique" || s.by_channel.boutique).map((c) => `<li><span>${CHANNEL_LABEL[c]}</span><b>${s.by_channel[c] || 0}</b></li>`).join("")}</ul>
      </section>
    </div>
    <div class="grid2 grid2--wide">
      <section class="card">
        <h2>${t("Best sellers")}</h2>
        ${s.top_products.length ? `<table class="table"><thead><tr><th>${t("Product")}</th><th class="num">${t("Sold")}</th><th class="num">${t("Revenue")}</th></tr></thead><tbody>
          ${s.top_products.map((p) => `<tr><td>${esc(p.name)} <small>${esc(p.size)}</small></td><td class="num">${p.qty}</td><td class="num">${money(p.revenue)}</td></tr>`).join("")}
        </tbody></table>` : `<p class="muted">${t("No sales in this period yet.")}</p>`}
      </section>
      <section class="card">
        <h2>${t("Latest orders")} <a class="more" href="#/orders">${t("All orders →")}</a></h2>
        ${recent.length ? `<table class="table table--click table--cards t-latest"><tbody>${recent.map((o) => `
          <tr data-go="#/orders/${o.id}"><td><b>#${o.number}</b></td><td>${esc(o.customer_name)}</td><td>${badge(o.status)}</td><td class="num">${money(o.total)}</td></tr>`).join("")}
        </tbody></table>` : `<p class="muted">${t("No orders yet.")}</p>`}
      </section>
    </div>`;
  main.querySelectorAll("[data-go]").forEach((tr) => (tr.onclick = () => (location.hash = tr.dataset.go)));
  bindChart(main);
}

/** Revenue per day as thin bars (weeks when the period is long), with a hover tooltip. */
function chart(byDay, from, days) {
  const weekly = days > 60;
  const buckets = [];
  // the server groups days in Cairo time; match them by the local calendar date
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const map = new Map(byDay.map((r) => [r.day, r]));
  for (let i = 0; i < days; i += weekly ? 7 : 1) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    let revenue = 0, orders = 0;
    for (let j = 0; j < (weekly ? 7 : 1) && i + j < days; j++) {
      const x = new Date(d);
      x.setDate(x.getDate() + j);
      const r = map.get(key(x));
      if (r) { revenue += +r.revenue; orders += r.orders; }
    }
    buckets.push({ d, revenue, orders });
  }
  const max = Math.max(...buckets.map((b) => b.revenue), 1);
  const nice = niceMax(max);
  // drawn at the card's real width so labels keep their size on phones
  const W = Math.round(Math.min(1000, Math.max(300, (document.querySelector("[data-main]")?.clientWidth || 1000) - 80)));
  const H = W < 600 ? 210 : 260, L = W < 600 ? 40 : 64, B = 28, T = 10;
  const bw = (W - L) / buckets.length;
  const bar = Math.max(2, Math.min(28, bw - 2));
  const y = (v) => T + (H - T - B) * (1 - v / nice);
  const fmt = (d) => d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const every = Math.ceil(buckets.length / (W < 600 ? 4 : 8));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * nice);
  return `
    <div class="chart" data-chart>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${weekly ? t("Revenue per week") : t("Revenue per day")}">
        ${ticks.map((v) => `<line class="chart__grid" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="chart__ytick" x="${L - 10}" y="${y(v) + 4}">${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}</text>`).join("")}
        ${buckets.map((b, i) => {
          const x = L + i * bw + (bw - bar) / 2, top = y(b.revenue), h = H - B - top;
          return `${b.revenue ? `<path class="chart__bar" d="M${x},${H - B} V${top + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, bar / 2)},-${Math.min(4, h)} H${x + bar - Math.min(4, bar / 2)} q${Math.min(4, bar / 2)},0 ${Math.min(4, bar / 2)},${Math.min(4, h)} V${H - B} Z"/>` : ""}
            <rect class="chart__hit" x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" data-i="${i}"
              data-tip="${esc(`${weekly ? t("Week of {d}", { d: fmt(b.d) }) : fmt(b.d)}|${money(b.revenue)}|${t(b.orders === 1 ? "{n} order" : "{n} orders", { n: b.orders })}`)}"/>
            ${i % every === 0 ? `<text class="chart__xtick" x="${L + i * bw + bw / 2}" y="${H - 8}">${fmt(b.d)}</text>` : ""}`;
        }).join("")}
        <line class="chart__base" x1="${L}" x2="${W}" y1="${H - B}" y2="${H - B}"/>
      </svg>
      <div class="chart__tip" hidden></div>
    </div>`;
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
}

function bindChart(root) {
  const box = $("[data-chart]", root);
  if (!box) return;
  const tip = $(".chart__tip", box);
  box.addEventListener("pointermove", (e) => {
    const hit = e.target.closest(".chart__hit");
    box.querySelectorAll(".chart__hit.is-on").forEach((h) => h !== hit && h.classList.remove("is-on"));
    if (!hit) return (tip.hidden = true);
    hit.classList.add("is-on");
    const [when, rev, n] = hit.dataset.tip.split("|");
    tip.innerHTML = `<small>${when}</small><b>${rev}</b><small>${n}</small>`;
    tip.hidden = false;
    const r = box.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 70), r.width - 70);
    tip.style.left = `${x}px`;
  });
  box.addEventListener("pointerleave", () => { tip.hidden = true; box.querySelectorAll(".is-on").forEach((h) => h.classList.remove("is-on")); });
}
