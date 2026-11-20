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

        console.log("Questionnaire completed!");

        /*
        Hier kunnen we later de logica zetten
        die bepaalt welke smartphone het beste is.
        */

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