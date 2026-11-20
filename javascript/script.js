const steps = document.querySelectorAll(".step");
const nextButtons = document.querySelectorAll(".next-btn");
const backButtons = document.querySelectorAll(".back-btn");

let currentStep = 0;


/* =========================
   SAVE / RESTORE PROGRESS
   (so a page reload, e.g. after changing
   adblocker settings, doesn't lose answers)
========================= */

const STORAGE_KEY = "phoneFinderProgress";
const ALL_INPUTS = 'input[type="radio"], input[type="checkbox"]';

function saveProgress() {

    try {

        const answers = {};

        document.querySelectorAll(ALL_INPUTS).forEach(input => {

            if (input.checked) {

                if (!answers[input.name]) {
                    answers[input.name] = [];
                }

                answers[input.name].push(input.value);

            }

        });

        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ step: currentStep, answers: answers })
        );

    } catch (error) {
        /* storage not available: ignore */
    }

}

function restoreProgress() {

    try {

        const saved =
            JSON.parse(sessionStorage.getItem(STORAGE_KEY));

        if (!saved) return;

        document.querySelectorAll(ALL_INPUTS).forEach(input => {

            const values = saved.answers[input.name] || [];

            input.checked = values.includes(input.value);

        });

        if (saved.step >= 0 && saved.step < steps.length) {
            currentStep = saved.step;
        }

    } catch (error) {
        /* nothing saved or unreadable: start fresh */
    }

}


/* =========================
   SHOW STEP
========================= */

function showStep(index) {

    steps.forEach((step, stepIndex) => {

        step.classList.toggle(
            "active",
            stepIndex === index
        );

    });


    updateProgress();

    saveProgress();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================
   PROGRESS BAR
========================= */

function updateProgress() {

    const questionSteps = 11;

    const progressBars =
        document.querySelectorAll(".progress-fill");


    progressBars.forEach((bar, index) => {

        const percentage =
            ((index + 1) / questionSteps) * 100;

        bar.style.width = percentage + "%";

    });

}


/* =========================
   CHECK ANSWER
========================= */

function hasAnswer(step) {

    const inputs =
        step.querySelectorAll(
            'input[type="radio"], input[type="checkbox"]'
        );


    if (inputs.length === 0) {
        return true;
    }


    return [...inputs].some(input => input.checked);

}


/* =========================
   ERROR MESSAGE
========================= */

function showError(step) {

    let error =
        step.querySelector(".error-message");


    if (!error) {

        error = document.createElement("p");

        error.className = "error-message";

        error.textContent =
            "Please select an answer before continuing.";


        const questionCard =
            step.querySelector(".question-card");


        questionCard.appendChild(error);

    }

}


function removeError(step) {

    const error =
        step.querySelector(".error-message");


    if (error) {
        error.remove();
    }

}


/* =========================
   NEXT BUTTONS
========================= */

nextButtons.forEach(button => {

    button.addEventListener("click", () => {

        const current =
            steps[currentStep];


        if (!hasAnswer(current)) {

            showError(current);

            return;

        }


        removeError(current);


        /* Go to the next step (only after the adblock check passes) */

        const goNext = () => {

            if (currentStep < steps.length - 1) {

                currentStep++;

                showStep(currentStep);

            }

        };


        if (typeof window.adblockGate === "function") {

            window.adblockGate(goNext);

        } else {

            goNext();   // adblock.js not loaded: behave as before

        }

    });

});


/* =========================
   BACK BUTTONS
========================= */

backButtons.forEach(button => {

    button.addEventListener("click", () => {

        if (currentStep > 0) {

            currentStep--;

            showStep(currentStep);

        }

    });

});


/* =========================
   REMOVE ERROR AFTER ANSWER
========================= */

document.querySelectorAll(
    'input[type="radio"], input[type="checkbox"]'
).forEach(input => {

    input.addEventListener("change", () => {

        removeError(
            input.closest(".step")
        );

        saveProgress();

    });

});


/* =========================
   FORM SUBMIT
========================= */

document
    .getElementById("phoneForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();

        showPhoneRecommendations();

    });


/* Start */

restoreProgress();

showStep(currentStep);


/* After the adblock "check again" reload: check again and continue if OK */

try {

    if (sessionStorage.getItem("adblockResume") === "1") {

        sessionStorage.removeItem("adblockResume");

        if (typeof window.adblockGate === "function") {

            window.adblockGate(() => {

                if (currentStep < steps.length - 1) {

                    currentStep++;

                    showStep(currentStep);

                }

            });

        }

    }

} catch (error) {
    /* storage not available: ignore */
}

/* =========================
   PHONE RECOMMENDATIONS
   ========================= */
const phoneResults = document.getElementById("phone-results");
const resultsList = document.getElementById("results-list");
const resultsSummary = document.getElementById("results-summary");
const questionnaire = document.getElementById("phoneForm");

function selectedValue(name) {
    return document.querySelector('input[name="' + name + '"]:checked')?.value || "";
}

function selectedValues(name) {
    return [...document.querySelectorAll('input[name="' + name + '"]:checked')].map(input => input.value);
}

function phoneMatch(phone, answers) {
    const tags = new Set(phone.tags);
    let score = 0;
    const reasons = [];
    const reward = (condition, points, reason) => {
        if (condition) { score += points; if (reason) reasons.push(reason); }
    };

    reward(answers.performance === "basic" && (tags.has("basic") || tags.has("balanced")), 4, "Suitable for everyday tasks");
    reward(answers.performance === "fast" && (tags.has("fast") || tags.has("balanced")), 5, "Responsive everyday performance");
    reward(answers.performance === "maximum" && (tags.has("fast") || tags.has("gaming")), 8, "Performance-oriented option");

    reward(answers.usage.includes("gaming") && tags.has("gaming"), 9, "Good fit for gaming");
    reward(answers.usage.includes("gaming") && tags.has("fast"), 3);
    reward(answers.usage.includes("work") && (tags.has("large") || tags.has("fast") || tags.has("storage")), 4, "Useful for multitasking");
    reward(answers.usage.includes("social") && (tags.has("camera") || tags.has("video") || tags.has("balanced")), 3, "Suited to social media");

    reward(answers.camera === "photography" && tags.has("camera"), 9, "Camera-focused choice");
    reward(answers.camera === "social" && (tags.has("camera") || tags.has("video")), 5, "Good for photos and videos");
    reward(answers.zoom === "important" && tags.has("zoom"), 8, "Zoom-focused option");
    reward(answers.zoom === "maybe" && tags.has("zoom"), 2);

    reward(answers.battery === "multi-day" && tags.has("battery"), 9, "Battery-focused choice");
    reward(answers.battery === "full-day" && tags.has("battery"), 4, "Battery emphasis");
    reward(answers.durability === "outdoors" && tags.has("rugged"), 12, "Rugged design");
    reward(answers.durability === "drops" && (tags.has("rugged") || tags.has("repair")), 4, "Durability or repairability emphasis");
    reward(answers.phone_lifetime === "5+" && (tags.has("longlife") || tags.has("repair")), 8, "Long-term use emphasis");
    reward(answers.phone_lifetime === "3-4" && tags.has("longlife"), 3);

    reward(answers.size === "compact" && tags.has("compact"), 8, "Compact design");
    reward(answers.size === "large" && (tags.has("large") || tags.has("fold")), 7, "Large-screen option");
    reward(answers.size === "standard" && !tags.has("large") && !tags.has("fold"), 2);

    // Break close ties in favor of a lower indicative starting price.
    score += Math.max(0, 2 - phone.min / 1000);
    return { ...phone, score, reasons: [...new Set(reasons)].slice(0, 3) };
}

function showPhoneRecommendations() {
    const answers = {
        budget: selectedValue("budget"),
        phone_lifetime: selectedValue("phone_lifetime"),
        usage: selectedValues("usage"),
        performance: selectedValue("performance"),
        camera: selectedValue("camera"),
        zoom: selectedValue("zoom"),
        battery: selectedValue("battery"),
        durability: selectedValue("durability"),
        size: selectedValue("size"),
        current_os: selectedValue("current_os"),
        switch_os: selectedValue("switch_os")
    };
    const maxBudget = { under250: 250, "250-450": 450, "450-750": 750, premium: Infinity }[answers.budget] ?? Infinity;
    const catalog = Array.isArray(window.PHONE_CATALOG) ? window.PHONE_CATALOG : [];
    const eligible = catalog.filter(phone => {
        if (phone.min > maxBudget) return false;
        if (answers.switch_os === "no" && ["ios", "android"].includes(answers.current_os)) {
            return phone.os === answers.current_os;
        }
        return true;
    });
    const matches = eligible.map(phone => phoneMatch(phone, answers))
        .sort((a, b) => b.score - a.score || a.min - b.min);
    const top = matches.slice(0, 12);

    resultsList.replaceChildren();
    if (top.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No phones match your budget and operating-system requirements. Try changing one of those answers.";
        resultsList.appendChild(empty);
    }
    top.forEach((phone, index) => {
        const card = document.createElement("article");
        card.className = "result-card";
        const title = document.createElement("h3");
        title.textContent = phone.name;
        const price = document.createElement("p");
        price.className = "result-price";
        price.textContent = phone.min === phone.max ? "Around €" + phone.min : "€" + phone.min + "–€" + phone.max;
        const rank = document.createElement("span");
        rank.className = "result-rank";
        rank.textContent = index === 0 ? "Best match" : "Match #" + (index + 1);
        const details = document.createElement("p");
        details.textContent = phone.reasons.length ? phone.reasons.join(" · ") : "Matches your budget and OS preferences";
        card.append(rank, title, price, details);
        resultsList.appendChild(card);
    });
    resultsSummary.textContent = "Showing " + top.length + " of " + eligible.length + " eligible phones from " + catalog.length + " catalog entries, ranked for your answers.";
    questionnaire.hidden = true;
    phoneResults.hidden = false;
    phoneResults.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("edit-answers").addEventListener("click", () => {
    phoneResults.hidden = true;
    questionnaire.hidden = false;
    currentStep = 0;
    showStep(currentStep);
});
