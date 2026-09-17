const API_URL = "https://mental-health-score-predictor-y3mt.onrender.com";

// ---------- Segmented controls ----------
// Each .segmented div holds buttons with data-value; we track the
// selected value per group in this object, keyed by data-name.
const segmentValues = {};

document.querySelectorAll(".segmented").forEach((group) => {
  const name = group.dataset.name;
  const buttons = group.querySelectorAll("button");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      segmentValues[name] = btn.dataset.value;
      clearHint();
    });
  });

  // Pre-select the first option so every group always has a value.
  buttons[0].classList.add("active");
  segmentValues[name] = buttons[0].dataset.value;
});

// ---------- Sliders with live readouts ----------
const sliders = [
  { id: "usage", readoutId: "usage-readout" },
  { id: "sleep", readoutId: "sleep-readout" },
  { id: "study", readoutId: "study-readout" },
  { id: "activity", readoutId: "activity-readout" },
];

sliders.forEach(({ id, readoutId }) => {
  const input = document.getElementById(id);
  const readout = document.getElementById(readoutId);

  const update = () => {
    const val = parseFloat(input.value).toFixed(1);
    readout.textContent = `${val} hrs`;
    const pct = (input.value / input.max) * 100;
    input.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--line) ${pct}%)`;
  };

  input.addEventListener("input", update);
  update();
});

// ---------- Country "Other" reveal ----------
const countrySelect = document.getElementById("country");
const countryOtherField = document.getElementById("country-other-field");
const countryOtherInput = document.getElementById("country-other");

countrySelect.addEventListener("change", () => {
  const isOther = countrySelect.value === "Other";
  countryOtherField.hidden = !isOther;
  if (!isOther) countryOtherInput.value = "";
});

// ---------- Form submit ----------
const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const hint = document.getElementById("form-hint");
const resultSection = document.getElementById("result");
const resultValue = document.getElementById("result-value");
const resultLabel = document.getElementById("result-label");
const meterFill = document.getElementById("meter-fill");
const statusOrb = document.getElementById("status-orb");

function animateNumber(el, to, duration = 650) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (to * eased).toFixed(1);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function setHint(message, isError) {
  hint.textContent = message;
  hint.classList.toggle("error", Boolean(isError));
}

function clearHint() {
  hint.textContent = "";
  hint.classList.remove("error");
}

function resolveCountry() {
  if (countrySelect.value === "Other") {
    const typed = countryOtherInput.value.trim();
    return typed.length ? typed : "Other";
  }
  return countrySelect.value;
}

function interpretScore(score) {
  if (score < 3.5) {
    return "On the lower end for this dataset — habits like sleep and stress weigh heavily here.";
  }
  if (score < 7) {
    return "In the moderate range — comparable to a typical respondent in this dataset.";
  }
  return "On the higher end for this dataset, suggesting a healthier balance overall.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearHint();

  const payload = {
    age: parseInt(document.getElementById("age").value, 10),
    gender: segmentValues.gender,
    country: resolveCountry(),
    academic_level: segmentValues.academic_level,
    most_used_platform: document.getElementById("platform").value,
    purpose_of_use: segmentValues.purpose_of_use,
    avg_daily_usage_hours: parseFloat(document.getElementById("usage").value),
    daily_unlocks: parseInt(document.getElementById("unlocks").value, 10),
    study_hours: parseFloat(document.getElementById("study").value),
    physical_activity_hours: parseFloat(document.getElementById("activity").value),
    sleep_hours_per_night: parseFloat(document.getElementById("sleep").value),
    stress_level: segmentValues.stress_level,
  };

  if (Number.isNaN(payload.age) || Number.isNaN(payload.daily_unlocks)) {
    setHint("Fill in age and daily unlocks with numbers.", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Calculating…";
  statusOrb.classList.add("is-loading");

  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Server responded with ${response.status}`);
    }

    const data = await response.json();
    const score = data.predicted_mental_health_score;

    resultValue.parentElement.classList.remove("pop");
    void resultValue.parentElement.offsetWidth; // restart animation on repeat submits
    resultValue.parentElement.classList.add("pop");
    animateNumber(resultValue, score);
    resultLabel.textContent = interpretScore(score);
    statusOrb.classList.remove("is-loading");
    statusOrb.classList.add("is-success");
    setTimeout(() => statusOrb.classList.remove("is-success"), 800);
    const pct = Math.max(0, Math.min(100, (score / 10) * 100));
    meterFill.style.width = "0%";
    resultSection.hidden = false;
    requestAnimationFrame(() => {
      meterFill.style.width = `${pct}%`;
    });
    resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    setHint(
      "Couldn't reach the prediction server. Check that it's running on 127.0.0.1:8000.",
      true
    );
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Get my score";
    statusOrb.classList.remove("is-loading");
  }
});