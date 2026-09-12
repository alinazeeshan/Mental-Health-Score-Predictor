(() => {
  "use strict";

  // =========================================================
  // API
  // =========================================================
  const API_BASE = "http://127.0.0.1:8000";

  // =========================================================
  // DOM ELEMENTS
  // =========================================================
  const form = document.getElementById("predict-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const errorRetryBtn = document.getElementById("error-retry-btn");

  const stateIdle = document.getElementById("state-idle");
  const stateLoading = document.getElementById("state-loading");
  const stateResult = document.getElementById("state-result");
  const stateError = document.getElementById("state-error");

  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreContextEl = document.getElementById("score-context");

  const gaugeFill = document.getElementById("gauge-fill");

  const errorLabelEl = document.getElementById("error-label");
  const errorCopyEl = document.getElementById("error-copy");

  const segGroup = document.getElementById("stress_level_group");
  const stressHiddenInput = document.getElementById("stress_level");

  const GAUGE_ARC_LENGTH = 314;

  // =========================================================
  // CHECK REQUIRED ELEMENTS
  // =========================================================
  console.log("Mental Health Signal JS loaded.");

  if (!form) {
    console.error("ERROR: #predict-form not found.");
    return;
  }

  if (!resetBtn) {
    console.error("ERROR: #reset-btn not found.");
  }

  if (!scoreContextEl) {
    console.error("ERROR: #score-context not found.");
  }

  // =========================================================
  // DRAW GAUGE TICKS
  // =========================================================
  function drawTicks() {
    document.querySelectorAll(".gauge-ticks").forEach((g) => {
      g.innerHTML = "";

      const cx = 120;
      const cy = 140;
      const rOuter = 100;
      const rInner = 90;

      for (let i = 0; i <= 10; i += 2) {
        const angle = Math.PI - (i / 10) * Math.PI;

        const x1 = cx + rOuter * Math.cos(angle);
        const y1 = cy - rOuter * Math.sin(angle);

        const x2 = cx + rInner * Math.cos(angle);
        const y2 = cy - rInner * Math.sin(angle);

        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );

        line.setAttribute("x1", x1.toFixed(1));
        line.setAttribute("y1", y1.toFixed(1));
        line.setAttribute("x2", x2.toFixed(1));
        line.setAttribute("y2", y2.toFixed(1));

        g.appendChild(line);
      }
    });
  }

  drawTicks();

  // =========================================================
  // STRESS LEVEL BUTTONS
  // =========================================================
  if (segGroup && stressHiddenInput) {
    segGroup.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        segGroup.querySelectorAll(".seg-btn").forEach((b) => {
          b.classList.remove("active");
        });

        btn.classList.add("active");

        stressHiddenInput.value = btn.dataset.value;

        clearFieldError(stressHiddenInput);
      });
    });
  }

  // =========================================================
  // FIELD ERROR HELPERS
  // =========================================================
  function fieldWrapper(input) {
    return input ? input.closest(".field") : null;
  }

  function setFieldError(input, message) {
    const wrap = fieldWrapper(input);

    if (!wrap) return;

    wrap.classList.add("field-error");

    const msgEl = wrap.querySelector(".error-msg");

    if (msgEl) {
      msgEl.textContent = message;
    }
  }

  function clearFieldError(input) {
    const wrap = fieldWrapper(input);

    if (!wrap) return;

    wrap.classList.remove("field-error");

    const msgEl = wrap.querySelector(".error-msg");

    if (msgEl) {
      msgEl.textContent = "";
    }
  }

  function clearAllErrors() {
    form.querySelectorAll(".field").forEach((field) => {
      field.classList.remove("field-error");
    });

    form.querySelectorAll(".error-msg").forEach((msg) => {
      msg.textContent = "";
    });
  }

  // =========================================================
  // VALIDATION
  // =========================================================
  function validate(payload) {
    const errors = [];

    const numericChecks = [
      ["age", 10, 100],
      ["avg_daily_usage_hours", 0, 24],
      ["daily_unlocks", 0, Infinity],
      ["study_hours", 0, 24],
      ["physical_activity_hours", 0, 24],
      ["sleep_hours_per_night", 0, 24]
    ];

    numericChecks.forEach(([key, min, max]) => {
      const input = document.getElementById(key);
      const val = payload[key];

      if (Number.isNaN(val) || val === "" || val === null) {
        errors.push([input, "This field is required."]);
      } else if (val < min || val > max) {
        errors.push([
          input,
          `Must be between ${min} and ${
            max === Infinity ? "0+" : max
          }.`
        ]);
      }
    });

    const textFields = [
      "gender",
      "country",
      "academic_level",
      "most_used_platform",
      "purpose_of_use"
    ];

    textFields.forEach((key) => {
      const input = document.getElementById(key);

      if (
        !payload[key] ||
        String(payload[key]).trim() === ""
      ) {
        errors.push([input, "This field is required."]);
      }
    });

    if (!payload.stress_level) {
      errors.push([
        stressHiddenInput,
        "Pick a stress level."
      ]);
    }

    return errors;
  }

  // =========================================================
  // COLLECT FORM DATA
  // =========================================================
  function collectPayload() {
    const fd = new FormData(form);

    return {
      age:
        fd.get("age") === ""
          ? NaN
          : parseInt(fd.get("age"), 10),

      gender: fd.get("gender") || "",

      country:
        (fd.get("country") || "").trim(),

      academic_level:
        fd.get("academic_level") || "",

      most_used_platform:
        fd.get("most_used_platform") || "",

      purpose_of_use:
        fd.get("purpose_of_use") || "",

      avg_daily_usage_hours:
        fd.get("avg_daily_usage_hours") === ""
          ? NaN
          : parseFloat(
              fd.get("avg_daily_usage_hours")
            ),

      daily_unlocks:
        fd.get("daily_unlocks") === ""
          ? NaN
          : parseInt(
              fd.get("daily_unlocks"),
              10
            ),

      study_hours:
        fd.get("study_hours") === ""
          ? NaN
          : parseFloat(
              fd.get("study_hours")
            ),

      physical_activity_hours:
        fd.get("physical_activity_hours") === ""
          ? NaN
          : parseFloat(
              fd.get("physical_activity_hours")
            ),

      sleep_hours_per_night:
        fd.get("sleep_hours_per_night") === ""
          ? NaN
          : parseFloat(
              fd.get("sleep_hours_per_night")
            ),

      stress_level:
        fd.get("stress_level") || ""
    };
  }

  // =========================================================
  // UI STATE
  // =========================================================
  function showState(name) {
    const states = {
      idle: stateIdle,
      loading: stateLoading,
      result: stateResult,
      error: stateError
    };

    Object.values(states).forEach((state) => {
      if (state) {
        state.hidden = true;
      }
    });

    if (states[name]) {
      states[name].hidden = false;
    }
  }

  // =========================================================
  // SUBMIT BUTTON
  // =========================================================
  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.classList.toggle(
      "loading",
      isSubmitting
    );
  }

  // =========================================================
  // SCORE BAND + CONTEXT
  // =========================================================
  function bandFor(score) {
    score = Number(score);

    if (score < 4) {
      return {
        label: "Signal: strained",
        context:
          "Your responses suggest elevated strain right now. Small shifts in sleep or screen time can go a long way."
      };
    }

    if (score < 7) {
      return {
        label: "Signal: balanced",
        context:
          "Your rhythm looks fairly steady, with some room to recover and reset."
      };
    }

    return {
      label: "Signal: strong",
      context:
        "Your habits point to a well-supported, resilient baseline. Keep it up."
    };
  }

  // =========================================================
  // RENDER RESULT
  // =========================================================
  function renderResult(score) {
    score = Number(score);

    if (!Number.isFinite(score)) {
      renderError(
        "Invalid score",
        "The server returned an invalid mental health score."
      );
      return;
    }

    const clamped = Math.max(
      0,
      Math.min(10, score)
    );

    const result = bandFor(clamped);

    console.log("Score:", clamped);
    console.log("Band:", result.label);
    console.log("Context:", result.context);

    // SCORE
    scoreNumberEl.textContent =
      clamped.toFixed(2);

    // BAND
    scoreBandEl.textContent =
      result.label;

    // CONTEXT
    scoreContextEl.textContent =
      result.context;

    // GAUGE
    if (gaugeFill) {
      gaugeFill.style.transition = "none";
      gaugeFill.style.strokeDashoffset =
        String(GAUGE_ARC_LENGTH);

      requestAnimationFrame(() => {
        gaugeFill.style.transition = "";

        const offset =
          GAUGE_ARC_LENGTH *
          (1 - clamped / 10);

        gaugeFill.style.strokeDashoffset =
          String(offset);
      });
    }

    showState("result");
  }

  // =========================================================
  // RENDER ERROR
  // =========================================================
  function renderError(label, copy) {
    console.error(label, copy);

    if (errorLabelEl) {
      errorLabelEl.textContent = label;
    }

    if (errorCopyEl) {
      errorCopyEl.textContent = copy;
    }

    showState("error");
  }

  // =========================================================
  // SERVER VALIDATION ERRORS
  // =========================================================
  function applyServerValidationErrors(detail) {
    if (!Array.isArray(detail)) {
      return false;
    }

    let matched = false;

    detail.forEach((err) => {
      const field =
        Array.isArray(err.loc)
          ? err.loc[err.loc.length - 1]
          : null;

      const input =
        field
          ? document.getElementById(field)
          : null;

      const target =
        field === "stress_level"
          ? stressHiddenInput
          : input;

      if (target) {
        setFieldError(
          target,
          err.msg || "Invalid value."
        );

        matched = true;
      }
    });

    return matched;
  }

  // =========================================================
  // FORM SUBMISSION
  // =========================================================
  form.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();

      clearAllErrors();

      const payload =
        collectPayload();

      console.log(
        "Sending payload:",
        payload
      );

      const clientErrors =
        validate(payload);

      // CLIENT VALIDATION
      if (clientErrors.length > 0) {
        clientErrors.forEach(
          ([input, message]) => {
            if (input) {
              setFieldError(
                input,
                message
              );
            }
          }
        );

        if (
          clientErrors[0] &&
          clientErrors[0][0]
        ) {
          clientErrors[0][0].focus();
        }

        return;
      }

      setSubmitting(true);
      showState("loading");

      try {
        const res = await fetch(
          `${API_BASE}/predict`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(
              payload
            )
          }
        );

        // =====================================================
        // 422 VALIDATION ERROR
        // =====================================================
        if (res.status === 422) {
          const body =
            await res.json()
              .catch(() => null);

          const matched =
            body &&
            applyServerValidationErrors(
              body.detail
            );

          renderError(
            "Check your inputs",
            matched
              ? "The API rejected a few fields — details are marked on the form."
              : "The API rejected this submission. Please review your inputs and try again."
          );

          return;
        }

        // =====================================================
        // OTHER HTTP ERROR
        // =====================================================
        if (!res.ok) {
          let detailMsg =
            `The API responded with status ${res.status}.`;

          const body =
            await res.json()
              .catch(() => null);

          if (
            body &&
            typeof body.detail ===
              "string"
          ) {
            detailMsg =
              body.detail;
          }

          renderError(
            "Prediction failed",
            detailMsg
          );

          return;
        }

        // =====================================================
        // SUCCESS
        // =====================================================
        const data =
          await res.json();

        console.log(
          "API RESPONSE:",
          data
        );

        const score =
          data.predicted_mental_health_score;

        if (
          typeof score !==
            "number" ||
          !Number.isFinite(score)
        ) {
          renderError(
            "Unexpected response",
            "The API responded, but the score was missing or malformed."
          );

          return;
        }

        renderResult(score);

      } catch (err) {
        console.error(
          "FETCH ERROR:",
          err
        );

        renderError(
          "Can't reach the server",
          "The prediction server could not be reached. Make sure your FastAPI server is running and try again."
        );

      } finally {
        setSubmitting(false);
      }
    }
  );

  // =========================================================
  // LIVE CLEAR ERRORS
  // =========================================================
  form
    .querySelectorAll(
      "input, select"
    )
    .forEach((el) => {
      el.addEventListener(
        "input",
        () => clearFieldError(el)
      );

      el.addEventListener(
        "change",
        () => clearFieldError(el)
      );
    });

  // =========================================================
  // RESET RESULT
  // =========================================================
  if (resetBtn) {
    resetBtn.addEventListener(
      "click",
      () => {
        console.log(
          "Run another read clicked"
        );

        // Reset form
        form.reset();

        // Reset stress buttons
        if (segGroup) {
          segGroup
            .querySelectorAll(
              ".seg-btn"
            )
            .forEach((btn) => {
              btn.classList.remove(
                "active"
              );
            });
        }

        // Reset hidden stress value
        if (stressHiddenInput) {
          stressHiddenInput.value = "";
        }

        // Clear errors
        clearAllErrors();

        // Reset result
        scoreNumberEl.textContent =
          "0.0";

        scoreBandEl.textContent =
          "—";

        scoreContextEl.textContent =
          "";

        // Reset gauge
        if (gaugeFill) {
          gaugeFill.style.transition =
            "none";

          gaugeFill.style.strokeDashoffset =
            String(
              GAUGE_ARC_LENGTH
            );
        }

        // Show initial screen
        showState("idle");
      }
    );
  }

  // =========================================================
  // ERROR RETRY
  // =========================================================
  if (errorRetryBtn) {
    errorRetryBtn.addEventListener(
      "click",
      () => {
        clearAllErrors();

        showState("idle");
      }
    );
  }

})();
