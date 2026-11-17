import { sb, ok } from "../api.js";
import { $, money, attempt, field } from "../ui.js";
import { t } from "../i18n.js";

/* Settings (admin): delivery and the Bolika Circle loyalty programme.
   Checkout (place_order in the database) charges with these, so the app and this page agree. */

export default async function settings(main) {
  const s = ok(await sb.from("settings").select("*").single());
  main.innerHTML = `
    <header class="head"><div><h1>${t("Settings")}</h1><p class="sub">${t("Used by checkout in the app and on the website.")}</p></div></header>
    <form class="grid2" data-form>
      <section class="card">
        <h2>${t("Delivery")}</h2>
        <div class="form">
          ${field(t("Delivery fee (EGP)"), `<input name="shipping_fee" type="number" min="0" step="1" required value="${+s.shipping_fee}" />`)}
          ${field(t("Free delivery for orders from (EGP)"), `<input name="free_shipping_over" type="number" min="0" step="1" value="${s.free_shipping_over ?? ""}" placeholder="${t("Empty = never free")}" />`)}
          <p class="muted" data-delivery></p>
        </div>
      </section>
      <section class="card">
        <h2>${t("Bolika Circle")}</h2>
        <div class="form form--2">
          ${field(t("Spend for 1 point (EGP)"), `<input name="egp_per_point" type="number" min="1" step="1" required value="${+s.egp_per_point}" />`)}
          ${field(t("Welcome points"), `<input name="welcome_points" type="number" min="0" step="10" required value="${s.welcome_points}" />`)}
          ${field(t("Points per redemption"), `<input name="redeem_points" type="number" min="10" step="10" required value="${s.redeem_points}" />`)}
          ${field(t("…worth (EGP)"), `<input name="redeem_value" type="number" min="1" step="1" required value="${+s.redeem_value}" />`)}
          <p class="muted full" data-loyalty></p>
        </div>
      </section>
      <div class="full"><button class="btn btn--ink">${t("Save settings")}</button></div>
    </form>`;

  const form = $("[data-form]", main);
  const explain = () => {
    const v = (n) => +form[n].value || 0;
    $("[data-delivery]", main).textContent = form.free_shipping_over.value === ""
      ? t("Every order pays {m} delivery.", { m: money(v("shipping_fee")) })
      : t("{m} delivery, free from {f}.", { m: money(v("shipping_fee")), f: money(v("free_shipping_over")) });
    const pts = Math.floor(1000 / Math.max(v("egp_per_point"), 1));
    $("[data-loyalty]", main).textContent = t("A EGP 1,000 order earns {p} points. {r} points take {m} off an order (up to 30% of it).",
      { p: pts, r: v("redeem_points"), m: money(v("redeem_value")) });
  };
  form.addEventListener("input", explain);
  explain();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const v = (n) => +form[n].value;
    const row = {
      shipping_fee: v("shipping_fee"), free_shipping_over: form.free_shipping_over.value === "" ? null : v("free_shipping_over"),
      egp_per_point: v("egp_per_point"), welcome_points: v("welcome_points"), redeem_points: v("redeem_points"), redeem_value: v("redeem_value"),
    };
    await attempt(() => sb.from("settings").update(row).eq("id", true).then(ok), t("Settings saved"));
  };
}
