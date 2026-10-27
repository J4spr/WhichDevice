const steps = document.querySelectorAll(".step");
const nextButtons = document.querySelectorAll(".next-btn");
const backButtons = document.querySelectorAll(".back-btn");

let currentStep = 0;


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


        if (currentStep < steps.length - 1) {

            currentStep++;

            showStep(currentStep);

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

showStep(currentStep);