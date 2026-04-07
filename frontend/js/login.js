document.getElementById("pin-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkPin();
});

async function checkPin() {
  const entered = document.getElementById("pin-input").value;
  const btnSpan = document.querySelector(".login-btn span");
  const msg = document.getElementById("error-msg");
  const inp = document.getElementById("pin-input");

  if (!entered) return;

  btnSpan.innerHTML = "&#9670; VERIFYING...";

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: entered }),
    });

    if (res.ok) {
      const data = await res.json();
      sessionStorage.setItem("rsb_auth", data.token); // Secure token, not plaintext PIN
      btnSpan.innerHTML = "&#9670; GRANTED";
      setTimeout(() => (window.location.href = "/dashboard.html"), 400);
    } else {
      throw new Error("Invalid Credentials");
    }
  } catch (err) {
    btnSpan.innerHTML = "&#9670; AUTHENTICATE";
    msg.textContent = "[ ACCESS DENIED — INCORRECT PIN ]";
    msg.classList.add("visible");
    inp.style.borderColor = "#ff4444";
    inp.value = "";
    setTimeout(() => {
      msg.classList.remove("visible");
      inp.style.borderColor = "";
    }, 2000);
  }
}
