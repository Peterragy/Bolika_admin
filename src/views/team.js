import { sb, ok } from "../api.js";
import { $, $$, esc, date, attempt, field, ROLE_LABEL } from "../ui.js";
import { t } from "../i18n.js";

/* Team (admin): who can open the dashboard, and with which role. */

const ROLES = ["admin", "inventory", "sales"];
const CAN = {
  admin: () => t("Everything: overview, orders, products, gift sets, discounts, team and settings."),
  inventory: () => t("Products, prices and stock, gift sets, discounts and promo codes."),
  sales: () => t("Orders: see them and update their status and payment."),
};

export default async function team(main) {
  const me = (await sb.auth.getUser()).data.user?.id;
  const staff = ok(await sb.from("profiles").select("*").neq("role", "customer").order("created_at"));
  const reload = () => team(main);

  main.innerHTML = `
    <header class="head"><div><h1>${t("Team")}</h1><p class="sub">${t("{n} people can open the dashboard.", { n: staff.length })}</p></div></header>
    <div class="grid2 grid2--wide">
      <section class="card card--flush">
        <table class="table table--cards t-team">
          <thead><tr><th>${t("Name")}</th><th>${t("Role")}</th><th>${t("Since")}</th><th></th></tr></thead>
          <tbody>${staff.map((p) => `
            <tr><td><b>${esc(p.full_name || p.email)}</b><small dir="ltr">${esc(p.email)}</small></td>
              <td>${p.id === me ? `<span class="badge badge--role">${ROLE_LABEL[p.role]}</span> <small>${t("you")}</small>`
                : `<select data-role="${esc(p.email)}" class="rolesel">${ROLES.map((r) => `<option value="${r}"${r === p.role ? " selected" : ""}>${ROLE_LABEL[r]}</option>`).join("")}</select>`}</td>
              <td>${date(p.created_at, false)}</td>
              <td class="num">${p.id === me ? "" : `<button class="linkbtn" data-remove="${esc(p.email)}">${t("Remove access")}</button>`}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
      <div class="stack">
        <section class="card">
          <h2>${t("Give someone access")}</h2>
          <form class="form" data-add>
            ${field(t("Their email"), `<input name="email" type="email" required dir="ltr" placeholder="name@bolika.com" />`)}
            ${field(t("Role"), `<select name="role">${ROLES.map((r) => `<option value="${r}"${r === "sales" ? " selected" : ""}>${ROLE_LABEL[r]}</option>`).join("")}</select>`)}
            <p class="muted" data-can></p>
            <button class="btn btn--ink">${t("Give access")}</button>
          </form>
        </section>
        <section class="card">
          <h2>${t("New to Bolika?")}</h2>
          <p class="muted">${t("The person needs an account first: create it in Supabase → Authentication → Users → Add user (with “Auto confirm”), then give it a role here. They sign in to this dashboard with that email and password.")}</p>
        </section>
      </div>
    </div>`;

  const form = $("[data-add]", main);
  const can = () => ($("[data-can]", main).textContent = CAN[form.role.value]());
  form.role.onchange = can;
  can();
  form.onsubmit = async (e) => {
    e.preventDefault();
    await attempt(() => sb.rpc("set_staff_role", { p_email: form.email.value.trim(), p_role: form.role.value }).then(ok), t("Access given"));
    reload();
  };
  $$("[data-role]", main).forEach((sel) => (sel.onchange = async () => {
    await attempt(() => sb.rpc("set_staff_role", { p_email: sel.dataset.role, p_role: sel.value }).then(ok), t("Role changed"));
  }));
  $$("[data-remove]", main).forEach((b) => (b.onclick = async () => {
    if (!confirm(t("Remove {e}'s access to the dashboard? Their account stays; they just can't open the dashboard.", { e: b.dataset.remove }))) return;
    await attempt(() => sb.rpc("set_staff_role", { p_email: b.dataset.remove, p_role: "customer" }).then(ok), t("Access removed"));
    reload();
  }));
}
