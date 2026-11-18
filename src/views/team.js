import { api } from "../api.js";
import { $, $$, esc, date, attempt, field, modal, ROLE_LABEL } from "../ui.js";
import { t } from "../i18n.js";

/* Team (admin): who can open the dashboard, with which role. Admins create staff accounts here. */

const ROLES = ["admin", "inventory", "sales"];
const CAN = {
  admin: () => t("Everything: overview, orders, products, gift sets, discounts, team and settings."),
  inventory: () => t("Products, prices and stock, gift sets, discounts and promo codes."),
  sales: () => t("Orders: see them and update their status and payment."),
};

export default async function team(main) {
  const [me, staff] = await Promise.all([api("/admin/me"), api("/admin/team")]);
  const reload = () => team(main);

  main.innerHTML = `
    <header class="head"><div><h1>${t("Team")}</h1><p class="sub">${t("{n} people can open the dashboard.", { n: staff.length })}</p></div></header>
    <div class="grid2 grid2--wide">
      <section class="card card--flush">
        <table class="table table--cards t-team">
          <thead><tr><th>${t("Name")}</th><th>${t("Role")}</th><th>${t("Since")}</th><th></th></tr></thead>
          <tbody>${staff.map((p) => `
            <tr><td><b>${esc(p.fullName || p.email)}</b><small dir="ltr">${esc(p.email)}</small></td>
              <td>${p.id === me.id ? `<span class="badge badge--role">${ROLE_LABEL[p.role]}</span> <small>${t("you")}</small>`
                : `<select data-role="${p.id}" class="rolesel">${ROLES.map((r) => `<option value="${r}"${r === p.role ? " selected" : ""}>${ROLE_LABEL[r]}</option>`).join("")}</select>`}</td>
              <td>${date(p.createdAt, false)}</td>
              <td class="num"><button class="linkbtn" data-pw="${p.id}" data-name="${esc(p.fullName || p.email)}">${t("New password")}</button>
                ${p.id === me.id ? "" : ` · <button class="linkbtn" data-remove="${p.id}" data-name="${esc(p.fullName || p.email)}">${t("Remove access")}</button>`}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
      <div class="stack">
        <section class="card">
          <h2>${t("Add someone to the team")}</h2>
          <form class="form" data-add>
            ${field(t("Name"), `<input name="fullName" required minlength="2" />`)}
            ${field(t("Their email"), `<input name="email" type="email" required dir="ltr" placeholder="name@bolika.com" />`)}
            ${field(t("First password"), `<input name="password" type="text" required minlength="8" dir="ltr" autocomplete="new-password" placeholder="${t("At least 8 characters")}" />`)}
            ${field(t("Role"), `<select name="role">${ROLES.map((r) => `<option value="${r}"${r === "sales" ? " selected" : ""}>${ROLE_LABEL[r]}</option>`).join("")}</select>`)}
            <p class="muted" data-can></p>
            <button class="btn btn--ink">${t("Add to the team")}</button>
          </form>
        </section>
        <section class="card">
          <p class="muted">${t("Give them their email and first password; they sign in to this dashboard with them. You can set a new password for anyone from the list.")}</p>
        </section>
      </div>
    </div>`;

  const form = $("[data-add]", main);
  const can = () => ($("[data-can]", main).textContent = CAN[form.role.value]());
  form.role.onchange = can;
  can();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = { fullName: form.fullName.value.trim(), email: form.email.value.trim(), password: form.password.value, role: form.role.value };
    await attempt(() => api("/admin/team", { method: "POST", body }), t("Added to the team"));
    reload();
  };
  $$("[data-role]", main).forEach((sel) => (sel.onchange = () =>
    attempt(() => api(`/admin/team/${sel.dataset.role}`, { method: "PATCH", body: { role: sel.value } }), t("Role changed"))));
  $$("[data-remove]", main).forEach((b) => (b.onclick = async () => {
    if (!confirm(t("Remove {e}'s access to the dashboard? Their account stays; they just can't open the dashboard.", { e: b.dataset.name }))) return;
    await attempt(() => api(`/admin/team/${b.dataset.remove}`, { method: "DELETE" }), t("Access removed"));
    reload();
  }));
  $$("[data-pw]", main).forEach((b) => (b.onclick = () => {
    const dlg = modal(t("New password for {e}", { e: b.dataset.name }), `
      <form class="form" data-form>
        ${field(t("New password"), `<input name="password" type="text" required minlength="8" dir="ltr" autocomplete="new-password" />`)}
        <footer class="modal__foot"><span></span><button class="btn btn--ink">${t("Save password")}</button></footer>
      </form>`);
    $("[data-form]", dlg).onsubmit = async (e) => {
      e.preventDefault();
      await attempt(() => api(`/admin/team/${b.dataset.pw}`, { method: "PATCH", body: { password: e.target.password.value } }), t("Password changed"));
      dlg.close();
    };
  }));
}
