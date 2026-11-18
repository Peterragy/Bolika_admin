import { api, img, uploadImage, loadCatalog } from "../api.js";
import { $, $$, esc, money, attempt, modal, field, stockCell } from "../ui.js";
import { t, ar } from "../i18n.js";

/* Products (admin and inventory): the catalogue with prices and stock; add / edit
   with a photo, and shades or sizes that each carry their own price and stock. */

export default async function products(main, _id, query) {
  const { cats, prods, vars } = await loadCatalog();
  const live = prods.filter((p) => p.discount_percent);
  const catById = new Map(cats.map((c) => [c.id, c]));
  const varsOf = vars.reduce((m, v) => m.set(v.product_id, [...(m.get(v.product_id) || []), v]), new Map());
  const sale = new Map(live.map((p) => [p.id, +p.discount_percent]));
  const cat = query.get("cat") || "";
  const q = (query.get("q") || "").toLowerCase();
  const lowOnly = query.get("stock") === "low";

  // how much is left: the product's own stock, or the sum and the lowest of its options
  const stockOf = (p) => {
    const vs = varsOf.get(p.id);
    if (!vs?.length) return { total: p.stock, low: p.stock != null && p.stock <= p.low_stock, out: p.stock === 0 ? 1 : 0 };
    const tracked = vs.filter((v) => v.stock != null);
    if (!tracked.length) return { total: null, low: false, out: 0 };
    return {
      total: tracked.reduce((n, v) => n + v.stock, 0),
      low: tracked.some((v) => v.stock <= p.low_stock),
      out: tracked.filter((v) => v.stock === 0).length,
    };
  };
  const nLow = prods.filter((p) => p.active && stockOf(p).low).length;

  const list = prods.filter((p) =>
    (!cat || p.category_id === cat) && (!lowOnly || stockOf(p).low) &&
    (!q || `${p.name} ${p.name_ar || ""} ${p.subtitle || ""} ${p.brand} ${p.sku || ""} ${(varsOf.get(p.id) || []).map((v) => v.label).join(" ")}`.toLowerCase().includes(q)));

  const params = (o) => { const u = new URLSearchParams(query); for (const [k, v] of Object.entries(o)) v ? u.set(k, v) : u.delete(k); return u.size ? `?${u}` : ""; };
  main.innerHTML = `
    <header class="head">
      <div><h1>${t("Products")}</h1><p class="sub">${t("{n} products · {h} hidden", { n: prods.length, h: prods.filter((p) => !p.active).length })}${nLow ? ` · <a class="lowlink" href="#/products?stock=low">${t("{n} low on stock", { n: nLow })}</a>` : ""}</p></div>
      <button class="btn btn--ink" data-new>${t("+ Add product")}</button>
    </header>
    <div class="toolbar">
      <div class="seg seg--wrap">${[["", t("All")], ...cats.map((c) => [c.id, ar(c.label, c.label_ar)])].map(([id, l]) => `<a href="#/products${params({ cat: id })}" aria-pressed="${id === cat}">${esc(l)}</a>`).join("")}
        <a href="#/products${params({ stock: lowOnly ? "" : "low" })}" aria-pressed="${lowOnly}" class="seg__low">${t("Low stock")}</a></div>
      <form class="search" data-search><input name="q" type="search" placeholder="${t("Search name, shade, SKU")}" value="${esc(query.get("q") || "")}" /></form>
    </div>
    <section class="card card--flush">
      <table class="table table--click table--cards t-products">
        <thead><tr><th></th><th>${t("Product")}</th><th>${t("Category")}</th><th class="num">${t("Price")}</th><th class="num">${t("Stock")}</th><th>${t("Shop")}</th></tr></thead>
        <tbody>${list.map((p) => {
          const st = stockOf(p), vs = varsOf.get(p.id) || [];
          return `
          <tr data-edit="${p.id}"${p.active ? "" : ' class="is-off"'}>
            <td class="thumb">${p.image ? `<img src="${esc(img(p.image))}" alt="" loading="lazy" />` : ""}</td>
            <td><b>${esc(ar(p.name, p.name_ar))}</b><small>${esc([p.brand !== "Bolika" ? p.brand : "", ar(p.subtitle, p.subtitle_ar), p.size].filter(Boolean).join(" · "))}</small>
              ${vs.length ? `<span class="swatches">${vs.slice(0, 12).map((v) => v.kind === "shade" ? `<i style="background:${esc(v.color || "#ccc")}" title="${esc(v.label)}${v.stock != null ? ` · ${v.stock}` : ""}"${v.stock === 0 ? ' class="is-out"' : ""}></i>` : `<em>${esc(v.label.split(" ·")[0])}</em>`).join("")}</span>` : ""}</td>
            <td>${esc(catById.get(p.category_id) ? ar(catById.get(p.category_id).label, catById.get(p.category_id).label_ar) : "—")}</td>
            <td class="num">${p.price == null ? "—" : money(Math.ceil(p.price))}${sale.has(p.id) ? `<small class="sale">${t("−{p}% now", { p: sale.get(p.id) })}</small>` : ""}</td>
            <td class="num">${stockCell(st.total, st.low ? Infinity : -1)}${st.out ? `<small class="sale">${t("{n} out", { n: st.out })}</small>` : st.low ? `<small class="warn">${t("running low")}</small>` : ""}</td>
            <td><label class="switch" data-stop><input type="checkbox" data-active="${p.id}"${p.active ? " checked" : ""} /><span></span></label></td>
          </tr>`;
        }).join("")}</tbody>
      </table>
      ${list.length ? "" : `<div class="empty"><b>${t("No products match")}</b></div>`}
    </section>`;

  $("[data-search]", main).onsubmit = (e) => { e.preventDefault(); location.hash = `#/products${params({ q: e.target.q.value.trim() })}`; };
  $("[data-new]", main).onclick = () => edit(null, [], { cats, reload });
  $$("[data-edit]", main).forEach((tr) => (tr.onclick = (e) => {
    if (e.target.closest("[data-stop]")) return;
    const p = prods.find((x) => x.id === tr.dataset.edit);
    edit(p, varsOf.get(p.id) || [], { cats, reload });
  }));
  $$("[data-active]", main).forEach((cb) => (cb.onchange = async () => {
    await attempt(() => api(`/admin/products/${cb.dataset.active}/active`, { method: "PATCH", body: { active: cb.checked } }), cb.checked ? t("Shown in the shop") : t("Hidden from the shop"));
    cb.closest("tr").classList.toggle("is-off", !cb.checked);
  }));
  function reload() { products(main, null, query); }
}

function edit(p, vars, { cats, reload }) {
  const catOpts = cats.map((c) => `<option value="${esc(c.id)}"${c.id === p?.category_id ? " selected" : ""}>${esc(ar(c.label, c.label_ar))}</option>`).join("");
  const dlg = modal(p ? t("Edit product") : t("Add product"), `
    <form class="form form--2" data-form>
      <div class="photo full">
        <div class="photo__img">${p?.image ? `<img src="${esc(img(p.image))}" alt="" />` : `<span>${t("No photo")}</span>`}</div>
        <div><label class="btn">${t("Upload photo")}<input type="file" accept="image/*" hidden data-file /></label>
        <p class="muted">${t("A square photo on a plain background looks best in the app.")}</p></div>
      </div>
      ${field(t("Name"), `<input name="name" required value="${esc(p?.name)}" dir="ltr" />`)}
      ${field(t("Name in Arabic"), `<input name="name_ar" value="${esc(p?.name_ar)}" dir="rtl" lang="ar" />`)}
      ${field(t("Short description"), `<input name="subtitle" value="${esc(p?.subtitle)}" placeholder="Satin lip colour" dir="ltr" />`)}
      ${field(t("Short description in Arabic"), `<input name="subtitle_ar" value="${esc(p?.subtitle_ar)}" dir="rtl" lang="ar" />`)}
      ${field(t("Category"), `<select name="category_id" required><option value="">${t("Choose…")}</option>${catOpts}</select>`)}
      ${field(t("Brand"), `<input name="brand" value="${esc(p?.brand ?? "Bolika")}" list="brands" dir="ltr" /><datalist id="brands"><option>Bolika</option><option>Maybelline New York</option><option>L'Oréal Paris</option></datalist>`)}
      ${field(t("Size"), `<input name="size" value="${esc(p?.size)}" placeholder="3.5 g" dir="ltr" />`)}
      ${field(t("SKU"), `<input name="sku" value="${esc(p?.sku)}" dir="ltr" />`)}
      ${field(t("Price (EGP)"), `<input name="price" type="number" min="0" step="0.01" value="${p?.price ?? ""}" placeholder="${t("Leave empty = coming soon")}" />`)}
      ${field(t("Stock"), `<input name="stock" type="number" min="0" step="1" value="${p?.stock ?? ""}" placeholder="${t("Empty = not tracked")}" />`)}
      ${field(t("Warn when stock is at or below"), `<input name="low_stock" type="number" min="0" step="1" value="${p?.low_stock ?? 5}" />`)}
      ${field(t("Shown in the shop"), `<select name="active"><option value="true"${p?.active !== false ? " selected" : ""}>${t("Yes")}</option><option value="false"${p?.active === false ? " selected" : ""}>${t("No — hidden")}</option></select>`)}
      <label class="check full"><input type="checkbox" name="bestseller"${p?.bestseller ? " checked" : ""} /> ${t("Bestseller — shown in “The coveted few” and badged in the app")}</label>
      ${field(t("Description"), `<textarea name="description" rows="3" dir="ltr">${esc(p?.description)}</textarea>`, "full")}
      ${field(t("Description in Arabic"), `<textarea name="description_ar" rows="3" dir="rtl" lang="ar">${esc(p?.description_ar)}</textarea>`, "full")}
      <div class="full">
        <div class="subhead"><b>${t("Shades and sizes")}</b>
          <span><button type="button" class="linkbtn" data-addvar="shade">${t("+ Shade")}</button> · <button type="button" class="linkbtn" data-addvar="size">${t("+ Size")}</button></span></div>
        <p class="muted">${t("Each option has its own stock. Leave an option's price empty to use the product price. When a product has options, its own stock above is not used.")}</p>
        <div class="vars" data-vars>
          <div class="var var--head" ${vars.length ? "" : "hidden"}><span></span><span>${t("Name")}</span><span>${t("Arabic name")}</span><span>${t("Swatch")}</span><span>${t("Price")}</span><span>${t("Stock")}</span><span></span></div>
        </div>
      </div>
      <footer class="modal__foot full">
        ${p ? `<button type="button" class="btn btn--danger" data-del>${t("Delete")}</button>` : "<span></span>"}
        <button class="btn btn--ink" type="submit">${p ? t("Save changes") : t("Add product")}</button>
      </footer>
    </form>`, { wide: true });

  let image = p?.image || null;
  const varBox = $("[data-vars]", dlg);
  const varRow = (v = {}) => `
    <div class="var" data-var="${v.id || ""}" data-kind="${v.kind || "shade"}">
      <span class="var__kind">${v.kind === "size" ? t("Size") : t("Shade")}</span>
      <input name="v_label" placeholder="${v.kind === "size" ? "Travel · 1.5 g" : "03 · Rosewood"}" value="${esc(v.label)}" required dir="ltr" />
      <input name="v_label_ar" placeholder="${t("Arabic name")}" value="${esc(v.label_ar)}" dir="rtl" lang="ar" />
      ${v.kind === "size" ? `<span></span>` : `<input name="v_color" type="color" value="${esc(v.color || "#834555")}" title="${t("Swatch colour")}" />`}
      <input name="v_price" type="number" min="0" step="0.01" placeholder="${t("Price")}" value="${v.price ?? ""}" />
      <input name="v_stock" type="number" min="0" step="1" placeholder="∞" value="${v.stock ?? ""}" title="${t("Stock")}" />
      <button type="button" class="iconbtn" data-rmvar aria-label="${t("Remove")}">×</button>
    </div>`;
  varBox.insertAdjacentHTML("beforeend", vars.map(varRow).join(""));
  const head = $(".var--head", varBox);
  $$("[data-addvar]", dlg).forEach((b) => (b.onclick = () => {
    varBox.insertAdjacentHTML("beforeend", varRow({ kind: b.dataset.addvar }));
    head.hidden = false;
    $(".var:last-child [name=v_label]", varBox).focus();
  }));
  varBox.addEventListener("click", (e) => {
    if (!e.target.closest("[data-rmvar]")) return;
    e.target.closest(".var").remove();
    head.hidden = !$$(".var:not(.var--head)", varBox).length;
  });

  $("[data-file]", dlg).onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const box = $(".photo__img", dlg);
    box.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="" />`;
    box.classList.add("is-busy");
    try {
      image = await attempt(() => uploadImage(file), t("Photo uploaded"));
    } finally {
      box.classList.remove("is-busy");
    }
  };

  $("[data-del]", dlg)?.addEventListener("click", async () => {
    if (!confirm(t("Delete “{name}”? Past orders keep their copy of it. To take it off the shop for now, hide it instead.", { name: p.name }))) return;
    await attempt(() => api(`/admin/products/${p.id}`, { method: "DELETE" }), t("Product deleted"));
    dlg.close();
    reload();
  });

  $("[data-form]", dlg).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const num = (v) => (v === "" || v == null ? null : +v);
    const str = (k) => f.get(k).trim() || null;
    const row = {
      name: f.get("name").trim(), name_ar: str("name_ar"), subtitle: str("subtitle"), subtitle_ar: str("subtitle_ar"),
      category_id: f.get("category_id"), brand: f.get("brand").trim() || "Bolika", size: f.get("size").trim(), sku: str("sku"),
      price: num(f.get("price")), stock: num(f.get("stock")), low_stock: num(f.get("low_stock")) ?? 5,
      active: f.get("active") === "true", bestseller: f.get("bestseller") === "on",
      description: str("description"), description_ar: str("description_ar"), image,
    };
    // shades and sizes: the server replaces the set with what's in the form
    const variants = $$(".var:not(.var--head)", varBox).map((r) => ({
      ...(r.dataset.var ? { id: r.dataset.var } : {}),
      kind: r.dataset.kind, label: $("[name=v_label]", r).value.trim(), labelAr: $("[name=v_label_ar]", r).value.trim() || null,
      color: $("[name=v_color]", r)?.value || null, price: num($("[name=v_price]", r).value), stock: num($("[name=v_stock]", r).value),
    }));
    const body = {
      name: row.name, nameAr: row.name_ar, subtitle: row.subtitle, subtitleAr: row.subtitle_ar, categoryId: row.category_id || null,
      brand: row.brand, size: row.size, sku: row.sku, price: row.price, stock: row.stock, lowStock: row.low_stock,
      active: row.active, bestseller: row.bestseller, description: row.description, descriptionAr: row.description_ar, image: row.image, variants,
    };
    await attempt(() => api(p ? `/admin/products/${p.id}` : "/admin/products", { method: p ? "PUT" : "POST", body }), p ? t("Saved") : t("Product added"));
    dlg.close();
    reload();
  };
}
