import { t, langButton } from "./i18n.js"; // first: sets the language and direction
import "./admin.css";
import { api, configured, login as signIn, logout, signedIn, whenSignedOut } from "./api.js";
import { $, $$, esc, ROLE_LABEL } from "./ui.js";
import overview from "./views/overview.js";
import orders from "./views/orders.js";
import products from "./views/products.js";
import bundles from "./views/bundles.js";
import discounts from "./views/discounts.js";
import team from "./views/team.js";
import settings from "./views/settings.js";

/* Bolika dashboard. Staff sign in with email + password; their role decides which
   pages they get (the Bolika server enforces the same rules on every request):
     admin      — everything
     inventory  — products, gift sets, discounts
     sales      — orders                                                     */

const VIEWS = [
  ["overview", t("Overview"), overview, "M4 19V9M10 19V5M16 19v-7M22 19H2", ["admin"]],
  ["orders", t("Orders"), orders, "M6 3h12l1 18H5L6 3ZM9 7a3 3 0 0 0 6 0", ["admin", "sales"]],
  ["products", t("Products"), products, "M9 3h6v4H9zM8 7h8l1 4v9a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-9l1-4Z", ["admin", "inventory"]],
  ["bundles", t("Gift sets"), bundles, "M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8c-2-4-6-4-6-1.5S9 8 12 8Zm0 0c2-4 6-4 6-1.5S15 8 12 8Z", ["admin", "inventory"]],
  ["discounts", t("Discounts"), discounts, "M19 5 5 19M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z", ["admin", "inventory"]],
  ["team", t("Team"), team, "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6", ["admin"]],
  ["settings", t("Settings"), settings, "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", ["admin"]],
];
let views = VIEWS; // what the signed-in account may open
const app = $("#app");

let shown = null;
whenSignedOut(() => { shown = null; login(); });
if (configured) gate();

async function gate() {
  if (!signedIn()) { shown = null; return login(); }
  let me;
  try {
    me = await api("/admin/me");
  } catch (e) {
    return login(e.message);
  }
  views = VIEWS.filter((v) => v[4].includes(me.role));
  if (!views.length) {
    logout();
    return login(t("This account can't open the dashboard."));
  }
  document.documentElement.dataset.role = me.role;
  shown = me.id;
  layout(me.fullName || me.email, me.role);
  route();
}

function login(error = "") {
  app.innerHTML = `
    <div class="gate"><form class="gate__card" data-form>
      <img src="/brand/oval-noir.svg" alt="" class="gate__logo" />
      <img src="/brand/wordmark-noir.svg" alt="Bolika" class="gate__word" />
      <h1>${t("Dashboard")}</h1>
      <p>${t("Sign in with your Bolika staff account.")}</p>
      <label class="field"><span>${t("Email")}</span><input name="email" type="email" autocomplete="username" required dir="ltr" /></label>
      <label class="field"><span>${t("Password")}</span><input name="password" type="password" autocomplete="current-password" required dir="ltr" /></label>
      <p class="msg is-error"${error ? "" : " hidden"} data-msg>${esc(error)}</p>
      <button class="btn btn--ink" type="submit">${t("Sign in")}</button>
      <p class="gate__lang">${langButton()}</p>
    </form>
    <p class="gate__sign tp3-sign"><span class="tp3-sign__mark" aria-hidden="true"></span><span>Designed &amp; developed by <b>TP3</b> · Third Party Solutions</span></p></div>`;
  const form = $("[data-form]");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await signIn(form.email.value.trim(), form.password.value);
      gate();
    } catch (error) {
      const m = $("[data-msg]");
      m.hidden = false;
      m.textContent = t(error.message);
    } finally {
      button.disabled = false;
    }
  };
}

function layout(name, role) {
  app.innerHTML = `
    <div class="shell">
      <aside class="side">
        <a class="side__brand" href="#/${views[0][0]}"><img src="/brand/wordmark-ivory.svg" alt="Bolika" /><img src="/brand/monogram-ivory.svg" alt="" class="side__mono" /></a>
        <nav class="side__nav">${views.map(([id, label, , icon]) => `
          <a href="#/${id}" data-nav="${id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg>${label}</a>`).join("")}
        </nav>
        <div class="side__foot"><span class="side__who">${esc(name)}<small>${esc(ROLE_LABEL[role] || role)}</small></span>${langButton()}<button class="linkbtn" data-out>${t("Sign out")}</button></div>
      </aside>
      <main class="main" data-main></main>
    </div>`;
  $("[data-out]").onclick = () => logout();
}

async function route() {
  if (!shown) return;
  const [path, query] = location.hash.replace(/^#\/?/, "").split("?");
  const [id = views[0][0], ...rest] = path.split("/");
  const view = views.find((v) => v[0] === id) || views[0];
  $$("[data-nav]").forEach((a) => a.classList.toggle("is-on", a.dataset.nav === view[0]));
  const main = $("[data-main]");
  main.innerHTML = `<p class="loading">${t("Loading…")}</p>`;
  try {
    await view[2](main, rest[0], new URLSearchParams(query));
  } catch (e) {
    main.innerHTML = `<div class="empty"><b>${t("Couldn't load this page")}</b><p>${esc(e.message)}</p></div>`;
  }
  main.scrollTop = 0;
}
addEventListener("hashchange", route);

/* A dashboard tab left open keeps running the version it was opened with.
   When someone comes back to it or changes page, look for a newer version
   and reload into it (only between pages, never in the middle of a form). */
const BUILD = [...document.scripts].map((s) => s.src).find((s) => s.includes("/assets/")) || "";
let lastCheck = 0;
async function freshen() {
  if (!BUILD || Date.now() - lastCheck < 60_000 || document.querySelector("dialog[open]")) return;
  lastCheck = Date.now();
  try {
    const html = await (await fetch("/", { cache: "no-store" })).text();
    const now = html.match(/\/assets\/[^"']+\.js/)?.[0];
    if (now && !BUILD.endsWith(now)) location.reload();
  } catch { /* offline: try again later */ }
}
addEventListener("hashchange", freshen);
addEventListener("focus", freshen);
document.addEventListener("visibilitychange", () => { if (!document.hidden) freshen(); });
