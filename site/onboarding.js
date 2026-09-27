// Forward Fitness onboarding flow.
// Collects goal / experience / days, then creates the account (username + password)
// and drops the visitor straight into the app, already signed in.
var APP_URL = "/train/";
var USERNAME_DOMAIN = "callbirdai.com";
function cleanUsername(u) { return (u || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, ""); }

(function () {
  var steps = Array.prototype.slice.call(document.querySelectorAll(".ob-step"));
  var bar = document.getElementById("bar");
  var backBtn = document.getElementById("back");
  var nextBtn = document.getElementById("next");
  var actions = document.getElementById("actions");
  var skip = document.getElementById("skip");

  var labels = {
    goal: { muscle: "Build muscle", strength: "Get stronger", consistency: "Stay consistent" },
    level: { new: "New to it", some: "Some experience", experienced: "Experienced" },
    days: { "3": "3 days", "4": "4 days", "5": "5 days", "6": "6 days" }
  };

  var answers = {};
  var idx = 0;
  var optionSteps = steps.filter(function (s) { return s.dataset.key !== "account"; });

  function saveAnswers() { try { localStorage.setItem("ff-onboarding", JSON.stringify(answers)); } catch (e) {} }

  function showStep(i) {
    idx = i;
    steps.forEach(function (s, k) { s.classList.toggle("active", k === i); });
    var key = steps[i].dataset.key;
    var isAccount = key === "account";
    bar.style.width = (isAccount ? 100 : Math.max(8, ((i + 1) / optionSteps.length) * 100)) + "%";
    actions.style.display = "flex";
    backBtn.style.display = i === 0 ? "none" : "";
    if (isAccount) {
      nextBtn.style.display = "none";
      fillSummary();
    } else {
      nextBtn.style.display = "";
      nextBtn.disabled = !answers[key];
      nextBtn.textContent = "Continue";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  steps.forEach(function (step) {
    var opts = step.querySelector("[data-opts]");
    if (!opts) return;
    var key = step.dataset.key;
    opts.addEventListener("click", function (e) {
      var btn = e.target.closest(".opt");
      if (!btn) return;
      Array.prototype.forEach.call(opts.querySelectorAll(".opt"), function (o) { o.classList.remove("sel"); });
      btn.classList.add("sel");
      answers[key] = btn.dataset.val;
      nextBtn.disabled = false;
    });
  });

  backBtn.addEventListener("click", function () { if (idx > 0) showStep(idx - 1); });
  nextBtn.addEventListener("click", function () {
    var key = steps[idx].dataset.key;
    if (!answers[key]) return;
    if (idx < steps.length - 1) showStep(idx + 1);
  });

  function fillSummary() {
    document.getElementById("s-goal").textContent = labels.goal[answers.goal] || "Not set";
    document.getElementById("s-level").textContent = labels.level[answers.level] || "Not set";
    document.getElementById("s-days").textContent = labels.days[answers.days] || "Not set";
    saveAnswers();
  }

  // ── Account creation ──
  var createBtn = document.getElementById("ob-create");
  var errEl = document.getElementById("ob-err");
  var uEl = document.getElementById("ob-username");
  var pEl = document.getElementById("ob-password");
  var signinLink = document.getElementById("ob-signin");
  var sbClient = null;
  function setErr(t) { errEl.textContent = t || ""; }

  async function getClient() {
    if (sbClient) return sbClient;
    if (!window.supabase || !window.supabase.createClient) throw new Error("nolib");
    var res = await fetch("/api/config");
    if (!res.ok) throw new Error("noconfig");
    var cfg = await res.json();
    if (!cfg.url || !cfg.anonKey) throw new Error("noconfig");
    sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return sbClient;
  }

  function goToApp() { saveAnswers(); window.location.href = APP_URL; }

  signinLink.addEventListener("click", function (e) { e.preventDefault(); goToApp(); });
  if (skip) skip.addEventListener("click", function (e) { e.preventDefault(); goToApp(); });

  createBtn.addEventListener("click", async function () {
    setErr("");
    var u = cleanUsername(uEl.value);
    var pw = pEl.value || "";
    if (u.length < 3) { setErr("Username must be at least 3 characters (letters, numbers, . _ -)."); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    createBtn.disabled = true;
    var original = createBtn.innerHTML;
    createBtn.textContent = "Creating your account...";
    try {
      var sb = await getClient();
      var email = u + "@" + USERNAME_DOMAIN;
      var out = await sb.auth.signUp({ email: email, password: pw, options: { data: { username: u } } });
      if (out.error) throw out.error;
      if (!out.data || !out.data.session) {
        setErr("Almost there. Turn off Confirm Email in your Supabase Auth settings to finish signup.");
        createBtn.disabled = false; createBtn.innerHTML = original; return;
      }
      goToApp();
    } catch (err) {
      var m = (err && err.message) || "";
      if (m === "nolib" || m === "noconfig") { goToApp(); return; } // fall back to signing up inside the app
      if (/already registered/i.test(m)) setErr("That username is taken. Try another, or sign in.");
      else setErr(m || "Something went wrong. Please try again.");
      createBtn.disabled = false; createBtn.innerHTML = original;
    }
  });

  pEl.addEventListener("keydown", function (e) { if (e.key === "Enter") createBtn.click(); });

  showStep(0);
})();