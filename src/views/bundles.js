import { sb, ok, img, uploadImage } from "../api.js";
import { $, $$, esc, money, attempt, modal, field, stockCell } from "../ui.js";
import { t, ar } from "../i18n.js";

/* Gift sets (admin and inventory): several products sold together in a Bolika box
   at one price. Selling a set takes its own stock and the stock of each product in it. */

export default async function bundles(main) {
  const [sets, items, prods, vars, live] = await Promise.all([
    sb.from("bundles").select("*").order("sort").then(ok),
    sb.from("bundle_items").select("*").then(ok),
    sb.from("products").select("id, name, name_ar, size, image, price, active").order("sort").then(ok),
    sb.from("product_variants").select("id, product_id, label, kind, price, stock").order("sort").then(ok),
    sb.from("discounts").select("bundle_id, percent, starts_at, ends_at").not("bundle_id", "is", null).then(ok),
  ]);
  const prodById = new Map(prods.map((p) => [p.id, p]));
  const varById = new Map(vars.map((v) => [v.id, v]));
  const itemsOf = (id) => items.filter((i) => i.bundle_id === id);
  const now = Date.now();
  const saleOf = (id) => Math.max(0, ...live.filter((d) => d.bundle_id === id && now >= new Date(d.starts_at) && now < new Date(d.ends_at)).map((d) => +d.percent));
  // what the items cost bought one by one
  const worth = (id) => itemsOf(id).reduce((n, i) => n + i.qty * Math.ceil(varById.get(i.variant_id)?.price ?? prodById.get(i.product_id)?.price ?? 0), 0);
  const reload = () => bundles(main);

  main.innerHTML = `
    <header class="head">
      <div><h1>${t("Gift sets")}</h1><p class="sub">${t("{n} sets · {h} hidden", { n: sets.length, h: sets.filter((s) => !s.active).length })}</p></div>
      <button class="btn btn--ink" data-new>${t("+ Add gift set")}</button>
    </header>
    ${sets.length ? `<section class="sets">${sets.map((s) => {
      const w = worth(s.id), off = saleOf(s.id);
      return `
      <article class="setcard${s.active ? "" : " is-off"}" data-edit="${s.id}">
        <div class="setcard__img">${s.image ? `<img src="${esc(img(s.image))}" alt="" loading="lazy" />` : ""}</div>
        <div class="setcard__body">
          <div class="setcard__top"><h2>${esc(ar(s.name, s.name_ar))}</h2>
            <label class="switch" data-stop><input type="checkbox" data-active="${s.id}"${s.active ? " checked" : ""} /><span></span></label></div>
          <ul class="setcard__items">${itemsOf(s.id).map((i) => {
            const p = prodById.get(i.product_id), v = varById.get(i.variant_id);
            return `<li>${i.qty > 1 ? `${i.qty} × ` : ""}${esc(ar(p?.name, p?.name_ar) || "—")}${v ? ` <small>${esc(v.label)}</small>` : ""}</li>`;
          }).join("") || `<li class="muted">${t("No products yet")}</li>`}</ul>
          <div class="setcard__foot">
            <span><b>${money(s.price)}</b>${off ? ` <small class="sale">${t("−{p}% now", { p: off })}</small>` : ""}
              ${w > s.price ? `<small>${t("worth {m} · saves {s}", { m: money(w), s: money(w - s.price) })}</small>` : ""}</span>
            <span class="setcard__stock">${t("Stock")} ${stockCell(s.stock, 3)}</span>
          </div>
        </div>
      </article>`;
    }).join("")}</section>`
    : `<div class="card"><div class="empty"><b>${t("No gift sets yet")}</b><p>${t("Put a few products in a Bolika box at one price.")}</p></div></div>`}`;

  $("[data-new]", main).onclick = () => edit(null, [], { prods, vars, reload });
  $$("[data-edit]", main).forEach((c) => (c.onclick = (e) => {
    if (e.target.closest("[data-stop]")) return;
    edit(sets.find((s) => s.id === c.dataset.edit), itemsOf(c.dataset.edit), { prods, vars, reload });
  }));
  $$("[data-active]", main).forEach((cb) => (cb.onchange = async () => {
    await attempt(() => sb.from("bundles").update({ active: cb.checked }).eq("id", cb.dataset.active).then(ok), cb.checked ? t("Shown in the shop") : t("Hidden from the shop"));
    cb.closest(".setcard").classList.toggle("is-off", !cb.checked);
  }));
}

function edit(s, items, { prods, vars, reload }) {
  const prodOpts = (sel) => `<option value="">${t("Choose a product…")}</option>` +
    prods.map((p) => `<option value="${p.id}"${p.id === sel ? " selected" : ""}>${esc(ar(p.name, p.name_ar))}${p.active ? "" : ` (${t("hidden")})`}</option>`).join("");
  const varOpts = (pid, sel) => {
    const vs = vars.filter((v) => v.product_id === pid);
    return vs.length ? `<option value="">${t("Any option")}</option>` + vs.map((v) => `<option value="${v.id}"${v.id === sel ? " selected" : ""}>${esc(v.label)}${v.stock != null ? ` · ${v.stock}` : ""}</option>`).join("")
                     : `<option value="">—</option>`;
  };
  const itemRow = (i = {}) => `
    <div class="bitem">
      <select name="b_product" required>${prodOpts(i.product_id)}</select>
      <select name="b_variant">${varOpts(i.product_id, i.variant_id)}</select>
      <input name="b_qty" type="number" min="1" max="20" value="${i.qty || 1}" title="${t("Quantity")}" />
      <button type="button" class="iconbtn" data-rm aria-label="${t("Remove")}">×</button>
    </div>`;

  const dlg = modal(s ? t("Edit gift set") : t("Add gift set"), `
    <form class="form form--2" data-form>
      <div class="photo full">
        <div class="photo__img">${s?.image ? `<img src="${esc(img(s.image))}" alt="" />` : `<span>${t("No photo")}</span>`}</div>
        <div><label class="btn">${t("Upload photo")}<input type="file" accept="image/*" hidden data-file /></label>
        <p class="muted">${t("A portrait photo (4:5) of the set in its box.")}</p></div>
      </div>
      ${field(t("Name"), `<input name="name" required value="${esc(s?.name)}" placeholder="The Lash Edit" dir="ltr" />`)}
      ${field(t("Name in Arabic"), `<input name="name_ar" value="${esc(s?.name_ar)}" dir="rtl" lang="ar" />`)}
      ${field(t("Description"), `<textarea name="description" rows="2" dir="ltr">${esc(s?.description)}</textarea>`, "full")}
      ${field(t("Description in Arabic"), `<textarea name="description_ar" rows="2" dir="rtl" lang="ar">${esc(s?.description_ar)}</textarea>`, "full")}
      <div class="full">
        <div class="subhead"><b>${t("In the box")}</b><button type="button" class="linkbtn" data-add>${t("+ Add product")}</button></div>
        <div class="bitems" data-items>${(items.length ? items : [{}]).map(itemRow).join("")}</div>
        <p class="muted" data-worth></p>
      </div>
      ${field(t("Set price (EGP)"), `<input name="price" type="number" min="0" step="1" required value="${s?.price ?? ""}" />`)}
      ${field(t("Boxes in stock"), `<input name="stock" type="number" min="0" step="1" value="${s?.stock ?? ""}" placeholder="${t("Empty = as many as the products allow")}" />`)}
      ${field(t("Shown in the shop"), `<select name="active"><option value="true"${s?.active !== false ? " selected" : ""}>${t("Yes")}</option><option value="false"${s?.active === false ? " selected" : ""}>${t("No — hidden")}</option></select>`)}
      <footer class="modal__foot full">
        ${s ? `<button type="button" class="btn btn--danger" data-del>${t("Delete")}</button>` : "<span></span>"}
        <button class="btn btn--ink" type="submit">${s ? t("Save changes") : t("Add gift set")}</button>
      </footer>
    </form>`, { wide: true });

  const form = $("[data-form]", dlg), box = $("[data-items]", dlg);
  let image = s?.image || null;
  const worthNow = () => {
    let w = 0;
    $$(".bitem", box).forEach((r) => {
      const p = prods.find((x) => x.id === $("[name=b_product]", r).value);
      const v = vars.find((x) => x.id === $("[name=b_variant]", r).value);
      w += (+$("[name=b_qty]", r).value || 0) * Math.ceil(v?.price ?? p?.price ?? 0);
    });
    const price = +form.price.value || 0;
    $("[data-worth]", dlg).textContent = w ? (price && price < w ? t("Bought separately: {m} — the set saves {s}.", { m: money(w), s: money(w - price) }) : t("Bought separately: {m}.", { m: money(w) })) : "";
  };
  box.addEventListener("change", (e) => {
    if (e.target.name === "b_product") $("[name=b_variant]", e.target.closest(".bitem")).innerHTML = varOpts(e.target.value);
    worthNow();
  });
  box.addEventListener("input", worthNow);
  form.price.addEventListener("input", worthNow);
  box.addEventListener("click", (e) => { if (e.target.closest("[data-rm]") && $$(".bitem", box).length > 1) { e.target.closest(".bitem").remove(); worthNow(); } });
  $("[data-add]", dlg).onclick = () => box.insertAdjacentHTML("beforeend", itemRow());
  worthNow();

  $("[data-file]", dlg).onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const ph = $(".photo__img", dlg);
    ph.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="" />`;
    ph.classList.add("is-busy");
    try { image = await attempt(() => uploadImage(file), t("Photo uploaded")); } finally { ph.classList.remove("is-busy"); }
  };

  $("[data-del]", dlg)?.addEventListener("click", async () => {
    if (!confirm(t("Delete the gift set “{name}”? Past orders keep their copy of it.", { name: s.name }))) return;
    await attempt(() => sb.from("bundles").delete().eq("id", s.id).then(ok), t("Gift set deleted"));
    dlg.close();
    reload();
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const str = (k) => f.get(k).trim() || null;
    const row = {
      name: f.get("name").trim(), name_ar: str("name_ar"), description: str("description"), description_ar: str("description_ar"),
      price: +f.get("price"), stock: f.get("stock") === "" ? null : +f.get("stock"), active: f.get("active") === "true", image,
    };
    const lines = $$(".bitem", box).map((r) => ({
      product_id: $("[name=b_product]", r).value, variant_id: $("[name=b_variant]", r).value || null, qty: +$("[name=b_qty]", r).value || 1,
    })).filter((l) => l.product_id);
    if (!lines.length) return alert(t("Add at least one product to the set."));
    await attempt(async () => {
      const saved = s ? ok(await sb.from("bundles").update(row).eq("id", s.id).select().single())
                      : ok(await sb.from("bundles").insert(row).select().single());
      ok(await sb.from("bundle_items").delete().eq("bundle_id", saved.id));
      ok(await sb.from("bundle_items").insert(lines.map((l) => ({ ...l, bundle_id: saved.id }))));
    }, s ? t("Saved") : t("Gift set added"));
    dlg.close();
    reload();
  };
}
