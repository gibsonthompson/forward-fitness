// Forward Fitness onboarding flow.
// Change APP_URL to wherever the actual app is served (e.g. "/app" or the app's domain).
var APP_URL = "/";

(function () {
  var steps = Array.prototype.slice.call(document.querySelectorAll(".ob-step"));
  var bar = document.getElementById("bar");
  var backBtn = document.getElementById("back");
  var nextBtn = document.getElementById("next");
  var actions = document.getElementById("actions");
  var openApp = document.getElementById("open-app");
  var skip = document.getElementById("skip");

  var labels = {
    goal: { muscle: "Build muscle", strength: "Get stronger", consistency: "Stay consistent" },
    level: { new: "New to it", some: "Some experience", experienced: "Experienced" },
    days: { "3": "3 days", "4": "4 days", "5": "5 days", "6": "6 days" }
  };

  var answers = {};
  var idx = 0;
  var inputSteps = steps.filter(function (s) { return s.dataset.key !== "done"; });

  function showStep(i) {
    idx = i;
    steps.forEach(function (s, k) { s.classList.toggle("active", k === i); });
    var isDone = steps[i].dataset.key === "done";
    bar.style.width = (isDone ? 100 : Math.max(8, ((i + 1) / inputSteps.length) * 100)) + "%";
    backBtn.style.display = i === 0 ? "none" : "";
    actions.style.display = isDone ? "none" : "flex";
    if (!isDone) {
      var key = steps[i].dataset.key;
      nextBtn.disabled = !answers[key];
      nextBtn.textContent = i === inputSteps.length - 1 ? "Finish" : "Continue";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Option selection
  steps.forEach(function (step) {
    var key = step.dataset.key;
    var opts = step.querySelector("[data-opts]");
    if (!opts) return;
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
    if (steps[idx].dataset.key === "done") finish();
  });

  function finish() {
    document.getElementById("s-goal").textContent = labels.goal[answers.goal] || "Not set";
    document.getElementById("s-level").textContent = labels.level[answers.level] || "Not set";
    document.getElementById("s-days").textContent = labels.days[answers.days] || "Not set";
    try { localStorage.setItem("ff-onboarding", JSON.stringify(answers)); } catch (e) {}
  }

  openApp.addEventListener("click", function (e) {
    e.preventDefault();
    try { localStorage.setItem("ff-onboarding", JSON.stringify(answers)); } catch (e2) {}
    window.location.href = APP_URL;
  });

  skip.addEventListener("click", function (e) { e.preventDefault(); window.location.href = APP_URL; });

  showStep(0);
})();