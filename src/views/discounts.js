import { sb, ok, img } from "../api.js";
import { $, $$, esc, money, date, localInput, attempt, modal, field } from "../ui.js";
import { t, ar } from "../i18n.js";

/* Discounts (admin and inventory):
   - sales: a percentage off chosen products or gift sets between two dates; the shop shows
     the sale price and the old price struck through, and checkout charges it while it runs;
   - promo codes: a percentage off the whole order for anyone who types the code at checkout. */

const stateOf = (d, now = Date.now()) => (now < new Date(d.starts_at) ? "scheduled" : d.ends_at && now >= new Date(d.ends_at) ? "ended" : "running");
const LABEL = { running: t("Running"), scheduled: t("Scheduled"), ended: t("Ended") };

export default async function discounts(main) {
  const [list, prods, sets, codes] = await Promise.all([
    sb.from("discounts").select("*, products(*), bundles(*)").order("starts_at", { ascending: false }).then(ok),
    sb.from("products").select("*").order("sort").then(ok),
    sb.from("bundles").select("*").order("sort").then(ok),
    sb.from("promo_codes").select("*").order("created_at", { ascending: false }).then(ok),
  ]);
  const reload = () => discounts(main);
  const order = { running: 0, scheduled: 1, ended: 2 };
  list.sort((a, b) => order[stateOf(a)] - order[stateOf(b)]);
  const codeState = (c) => (!c.active ? "ended" : c.max_uses != null && c.uses >= c.max_uses ? "ended" : stateOf(c));

  main.innerHTML = `
    <header class="head">
      <div><h1>${t("Discounts")}</h1><p class="sub">${t("{r} running now · {s} scheduled", { r: list.filter((d) => stateOf(d) === "running").length, s: list.filter((d) => stateOf(d) === "scheduled").length })}</p></div>
      <button class="btn btn--ink" data-new>${t("+ Add discount")}</button>
    </header>
    <section class="card card--flush">
      ${list.length ? `<table class="table table--click table--cards t-discounts">
        <thead><tr><th></th><th>${t("Product")}</th><th class="num">${t("Off")}</th><th class="num">${t("Price")}</th><th>${t("From")}</th><th>${t("Until")}</th><th>${t("Status")}</th></tr></thead>
        <tbody>${list.map((d) => {
          const x = d.products || d.bundles, base = x?.price == null ? null : Math.ceil(x.price), st = stateOf(d);
          return `<tr data-edit="${d.id}"${st === "ended" ? ' class="is-off"' : ""}>
            <td class="thumb">${x?.image ? `<img src="${esc(img(x.image))}" alt="" loading="lazy" />` : ""}</td>
            <td><b>${esc(ar(x?.name, x?.name_ar))}</b><small>${d.bundles ? t("Gift set") : esc(x?.size)}</small></td>
            <td class="num"><b>${+d.percent}%</b></td>
            <td class="num">${base == null ? "—" : `${money(Math.ceil((base * (100 - d.percent)) / 100))}<small>${t("was {m}", { m: money(base) })}</small>`}</td>
            <td>${date(d.starts_at)}</td><td>${date(d.ends_at)}</td>
            <td><span class="badge badge--d-${st}">${LABEL[st]}</span></td></tr>`;
        }).join("")}</tbody></table>`
        : `<div class="empty"><b>${t("No discounts yet")}</b><p>${t("Add one to put products or gift sets on sale for a period.")}</p></div>`}
    </section>

    <header class="head head--sub">
      <div><h2>${t("Promo codes")}</h2><p class="sub">${t("Typed at checkout for a percentage off the whole order.")}</p></div>
      <button class="btn" data-newcode>${t("+ Add promo code")}</button>
    </header>
    <section class="card card--flush">
      ${codes.length ? `<table class="table table--click table--cards t-codes">
        <thead><tr><th>${t("Code")}</th><th class="num">${t("Off")}</th><th class="num">${t("Minimum order")}</th><th class="num">${t("Used")}</th><th>${t("Until")}</th><th>${t("Status")}</th></tr></thead>
        <tbody>${codes.map((c) => {
          const st = codeState(c);
          return `<tr data-code="${esc(c.code)}"${st === "ended" ? ' class="is-off"' : ""}>
            <td><b class="code">${esc(c.code)}</b></td><td class="num"><b>${+c.percent}%</b></td>
            <td class="num">${+c.min_order ? money(c.min_order) : "—"}</td>
            <td class="num">${c.uses}${c.max_uses ? ` / ${c.max_uses}` : ""}</td>
            <td>${c.ends_at ? date(c.ends_at) : t("No end")}</td>
            <td><span class="badge badge--d-${st}">${c.active ? LABEL[st] : t("Off")}</span></td></tr>`;
        }).join("")}</tbody></table>`
        : `<div class="empty"><b>${t("No promo codes yet")}</b><p>${t("Create one like BOLIKA10 for campaigns and influencers.")}</p></div>`}
    </section>`;

  $("[data-new]", main).onclick = () => edit(null, prods, sets, reload);
  $$("[data-edit]", main).forEach((tr) => (tr.onclick = () => edit(list.find((d) => d.id === tr.dataset.edit), prods, sets, reload)));
  $("[data-newcode]", main).onclick = () => editCode(null, reload);
  $$("[data-code]", main).forEach((tr) => (tr.onclick = () => editCode(codes.find((c) => c.code === tr.dataset.code), reload)));
}

function edit(d, prods, sets, reload) {
  const start = d ? new Date(d.starts_at) : new Date();
  const end = d ? new Date(d.ends_at) : new Date(Date.now() + 7 * 864e5);
  const x = d && (d.products || d.bundles);
  const pick = (kind, p, sub) => `
    <label class="pick" data-name="${esc(`${p.name} ${p.name_ar || ""} ${sub}`.toLowerCase())}"><input type="checkbox" value="${kind}:${p.id}" />
      <span class="thumb">${p.image ? `<img src="${esc(img(p.image))}" alt="" loading="lazy" />` : ""}</span>
      <span><b>${esc(ar(p.name, p.name_ar))}</b><small>${esc(sub)} · ${p.price == null ? t("no price") : money(Math.ceil(p.price))}${p.active ? "" : ` · ${t("hidden")}`}</small></span></label>`;
  const dlg = modal(d ? t("Edit discount") : t("Add discount"), `
    <form class="form form--2" data-form>
      ${d ? `<p class="full"><b>${esc(ar(x?.name, x?.name_ar))}</b> <span class="muted">${d.bundles ? t("Gift set") : esc(x?.size)}</span></p>` : `
        <div class="full">
          <div class="subhead"><b>${t("Products and gift sets")}</b><span class="muted" data-picked>${t("{n} chosen", { n: 0 })}</span>
            <label class="pickall"><input type="checkbox" data-all /> ${t("Select all")}</label></div>
          <input type="search" placeholder="${t("Search products…")}" data-find class="pickfind" />
          <div class="picker" data-picker>
            ${sets.map((s) => pick("bundle", s, t("Gift set"))).join("")}
            ${prods.map((p) => pick("product", p, [p.subtitle, p.size].filter(Boolean).join(" · "))).join("")}
          </div>
        </div>`}
      ${field(t("Discount (%)"), `<input name="percent" type="number" min="1" max="99" step="0.5" required value="${d ? +d.percent : 15}" />`)}
      <div></div>
      ${field(t("Starts"), `<input name="starts_at" type="datetime-local" required value="${localInput(start)}" />`)}
      ${field(t("Ends"), `<input name="ends_at" type="datetime-local" required value="${localInput(end)}" />`)}
      <p class="muted full">${t("Sale prices round up to whole pounds, as in the app.")}</p>
      <footer class="modal__foot full">${d ? `<button type="button" class="btn btn--danger" data-del>${t("Delete")}</button>` : "<span></span>"}<button class="btn btn--ink">${d ? t("Save") : t("Add discount")}</button></footer>
    </form>`, { wide: !d });

  const form = $("[data-form]", dlg);
  const find = $("[data-find]", dlg);
  if (find) {
    const all = $("[data-all]", dlg);
    const shown = () => $$(".pick", dlg).filter((l) => !l.hidden).map((l) => $("input", l));
    const count = () => {
      $("[data-picked]", dlg).textContent = t("{n} chosen", { n: $$(".pick input:checked", dlg).length });
      const v = shown();
      all.checked = v.length > 0 && v.every((c) => c.checked);
      all.indeterminate = !all.checked && v.some((c) => c.checked);
    };
    find.oninput = () => { $$(".pick", dlg).forEach((l) => (l.hidden = !l.dataset.name.includes(find.value.toLowerCase().trim()))); count(); };
    $("[data-picker]", dlg).onchange = count;
    all.onchange = () => { shown().forEach((c) => (c.checked = all.checked)); count(); };
  }
  $("[data-del]", dlg)?.addEventListener("click", async () => {
    if (!confirm(t("Delete this discount? It goes back to its normal price."))) return;
    await attempt(() => sb.from("discounts").delete().eq("id", d.id).then(ok), t("Discount deleted"));
    dlg.close();
    reload();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = { percent: +form.percent.value, starts_at: new Date(form.starts_at.value).toISOString(), ends_at: new Date(form.ends_at.value).toISOString() };
    if (new Date(row.ends_at) <= new Date(row.starts_at)) return alert(t("The end must be after the start."));
    if (d) {
      await attempt(() => sb.from("discounts").update(row).eq("id", d.id).then(ok), t("Saved"));
    } else {
      const ids = $$(".pick input:checked", dlg).map((c) => c.value.split(":"));
      if (!ids.length) return alert(t("Choose at least one product or gift set."));
      const rows = ids.map(([kind, id]) => ({ ...row, [kind === "bundle" ? "bundle_id" : "product_id"]: id }));
      await attempt(() => sb.from("discounts").insert(rows).then(ok), t(rows.length === 1 ? "Discount added to {n} item" : "Discount added to {n} items", { n: rows.length }));
    }
    dlg.close();
    reload();
  };
}

function editCode(c, reload) {
  const dlg = modal(c ? t("Edit promo code") : t("Add promo code"), `
    <form class="form form--2" data-form>
      ${field(t("Code"), `<input name="code" required pattern="[A-Za-z0-9_\\-]{3,24}" value="${esc(c?.code)}" ${c ? "readonly" : ""} placeholder="BOLIKA10" dir="ltr" class="code" />`)}
      ${field(t("Discount (%)"), `<input name="percent" type="number" min="1" max="99" step="0.5" required value="${c ? +c.percent : 10}" />`)}
      ${field(t("Minimum order (EGP)"), `<input name="min_order" type="number" min="0" step="1" value="${c ? +c.min_order : 0}" />`)}
      ${field(t("How many times it can be used"), `<input name="max_uses" type="number" min="1" step="1" value="${c?.max_uses ?? ""}" placeholder="${t("Empty = unlimited")}" />`)}
      ${field(t("Starts"), `<input name="starts_at" type="datetime-local" required value="${localInput(c ? c.starts_at : new Date())}" />`)}
      ${field(t("Ends"), `<input name="ends_at" type="datetime-local" value="${c?.ends_at ? localInput(c.ends_at) : ""}" />`)}
      <label class="check full"><input type="checkbox" name="active"${c?.active === false ? "" : " checked"} /> ${t("Active — accepted at checkout")}</label>
      ${c ? `<p class="muted full">${t("Used {n} times so far.", { n: c.uses })}</p>` : ""}
      <footer class="modal__foot full">${c ? `<button type="button" class="btn btn--danger" data-del>${t("Delete")}</button>` : "<span></span>"}<button class="btn btn--ink">${c ? t("Save") : t("Add promo code")}</button></footer>
    </form>`);
  const form = $("[data-form]", dlg);
  form.code.oninput = () => (form.code.value = form.code.value.toUpperCase().replace(/\s/g, ""));
  $("[data-del]", dlg)?.addEventListener("click", async () => {
    if (!confirm(t("Delete the code {c}? It stops working at checkout straight away.", { c: c.code }))) return;
    await attempt(() => sb.from("promo_codes").delete().eq("code", c.code).then(ok), t("Promo code deleted"));
    dlg.close();
    reload();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = {
      percent: +form.percent.value, min_order: +form.min_order.value || 0, max_uses: form.max_uses.value === "" ? null : +form.max_uses.value,
      starts_at: new Date(form.starts_at.value).toISOString(), ends_at: form.ends_at.value ? new Date(form.ends_at.value).toISOString() : null,
      active: form.active.checked,
    };
    if (row.ends_at && new Date(row.ends_at) <= new Date(row.starts_at)) return alert(t("The end must be after the start."));
    await attempt(() => (c ? sb.from("promo_codes").update(row).eq("code", c.code) : sb.from("promo_codes").insert({ ...row, code: form.code.value })).then(ok),
      c ? t("Saved") : t("Promo code added"));
    dlg.close();
    reload();
  };
}
