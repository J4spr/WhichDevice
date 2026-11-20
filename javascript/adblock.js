/* =========================================================
   ADBLOCK GATE
   Usage:  adblockGate(() => { ...what should happen next... });
   - No adblocker detected -> callback runs immediately.
   - Adblocker detected    -> overlay appears; the visitor can
     continue after WAIT_SECONDS, or disable the blocker and
     press "check again". The callback runs either way once
     they get through.
   Everything (styles + overlay HTML) is created by this file,
   so no changes to index.html or style.css are needed.
========================================================= */

(function () {

    const WAIT_SECONDS = 3;

    let wall = null;
    let continueBtn = null;
    let timer = null;
    let pendingCallback = null;
    let busy = false;
    let lastResults = [];


    /* ---------- styles + overlay (injected once) ---------- */

    function buildWall() {

        if (wall) return;

        const style = document.createElement("style");

        style.textContent = `
            #adblock-wall {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                background: rgba(15, 23, 42, 0.95);
                color: white;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 24px;
            }
            #adblock-wall.active { display: flex; }
            #adblock-wall .abw-box { max-width: 460px; }
            #adblock-wall h2 { font-size: 26px; margin-bottom: 12px; }
            #adblock-wall p { color: #cbd5e1; margin-bottom: 8px; }
            #adblock-wall button {
                margin: 14px 6px 0;
                padding: 14px 25px;
                border: none;
                border-radius: 11px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                background: white;
                color: #111827;
            }
            #adblock-wall #abw-continue {
                background: transparent;
                color: white;
                border: 1px solid #475569;
            }
            #adblock-wall #abw-continue:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            body.adblock-locked { overflow: hidden; }
        `;

        document.head.appendChild(style);

        wall = document.createElement("div");
        wall.id = "adblock-wall";
        wall.setAttribute("role", "dialog");
        wall.setAttribute("aria-modal", "true");

        wall.innerHTML = `
            <div class="abw-box">
                <h2>Please turn off your ad blocker</h2>
                <p>This site is free thanks to advertising.
                   Disable your ad blocker for this site to continue
                   without interruptions.</p>
                <button type="button" id="abw-recheck">
                    I've disabled it, check again
                </button>
                <button type="button" id="abw-continue" disabled>
                    Continue anyway (${WAIT_SECONDS})
                </button>
            </div>
        `;

        document.body.appendChild(wall);

        continueBtn = wall.querySelector("#abw-continue");

        wall.querySelector("#abw-recheck")
            .addEventListener("click", recheck);

        continueBtn.addEventListener("click", () => {
            if (continueBtn.disabled) return;
            hideWall();
            runCallback();
        });
    }


    /* ---------- detection ---------- */

    // Method 1: bait elements. Filter lists hide elements with common ad names.
    function baitBlocked() {

        return new Promise(resolve => {

            const baits = [];

            const byClass = document.createElement("div");
            byClass.className = "ad-placement ad-slot advert advertisement banner-ads";
            baits.push(byClass);

            const byId = document.createElement("div");
            byId.id = "google_ads_iframe_1";
            baits.push(byId);

            baits.forEach(bait => {
                bait.style.cssText =
                    "position:absolute;left:-9999px;top:-9999px;width:10px;height:10px;";
                bait.innerHTML = "&nbsp;";
                document.body.appendChild(bait);
            });

            setTimeout(() => {

                const blocked = baits.some(bait => {

                    const cs = window.getComputedStyle(bait);

                    return !bait.offsetParent ||
                        bait.offsetHeight === 0 ||
                        cs.display === "none" ||
                        cs.visibility === "hidden";

                });

                baits.forEach(bait => bait.remove());

                resolve(blocked);

            }, 200);

        });

    }

    // Method 2: bait requests. Some blockers cancel these outright.
    // We try several URLs because blockers treat them differently.
    const BAIT_URLS = [
        "https://partner.googleadservices.com/gampad/cookie.js",
        "https://adservice.google.com/adsid/integrator.js",
        "https://ads.pubmatic.com/AdServer/js/showad.js",
        "https://connect.facebook.net/en_US/fbevents.js",
        "https://cdn.taboola.com/libtrc/impl.js",
        "https://widgets.outbrain.com/outbrain.js"
    ];

    function requestBlocked() {

        return Promise.all(BAIT_URLS.map(url =>
            fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" })
                .then(() => false, () => true)
        )).then(results => results.filter(Boolean).length >= 2);   // 2+ failures, so one flaky URL can't trigger it

    }

    function detect() {

        return Promise
            .all([baitBlocked(), requestBlocked()])
            .then(results => {

                // open the browser console (F12) to see which method fired
                console.log("[adblock] bait element, bait requests:", results);

                lastResults = results;

                return results.some(Boolean);

            });

    }


    /* ---------- wall behaviour ---------- */

    function showWall() {

        buildWall();
        wall.classList.add("active");
        document.body.classList.add("adblock-locked");

        let left = WAIT_SECONDS;

        continueBtn.disabled = true;
        continueBtn.textContent = "Continue anyway (" + left + ")";

        clearInterval(timer);

        timer = setInterval(() => {

            left--;

            if (left > 0) {
                continueBtn.textContent = "Continue anyway (" + left + ")";
            } else {
                clearInterval(timer);
                continueBtn.disabled = false;
                continueBtn.textContent = "Continue anyway";
            }

        }, 1000);

    }

    function hideWall() {

        clearInterval(timer);

        if (wall) {
            wall.classList.remove("active");
        }

        document.body.classList.remove("adblock-locked");

    }

    function runCallback() {

        const callback = pendingCallback;

        pendingCallback = null;

        if (callback) callback();

    }

    function recheck() {

        detect().then(blocked => {

            if (blocked) {
                // Blockers often keep their effect on an already-open page
                // (e.g. hidden elements) until it is reloaded. Reload once so
                // the new setting applies; progress is restored from
                // sessionStorage and the check runs again automatically.
                try {
                    sessionStorage.setItem("adblockResume", "1");
                    location.reload();
                    return;
                } catch (error) {
                    showWall();      // reload/storage not possible: restart the wait
                }
            } else {
                hideWall();
                runCallback();       // blocker is off: carry on
            }

        });

    }


    /* ---------- public function ---------- */

    window.adblockGate = function (onContinue) {

        if (busy) return;            // ignore double clicks while checking

        busy = true;
        pendingCallback = onContinue;

        detect()
            .catch(() => false)      // if detection itself fails, don't block
            .then(blocked => {

                busy = false;

                if (blocked) {
                    showWall();
                } else {
                    runCallback();
                }

            });

    };

})();
