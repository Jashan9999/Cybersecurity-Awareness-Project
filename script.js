
let emails = [];
let score = 0;
let attempted = 0;

document.addEventListener('DOMContentLoaded', () => {
  // load data
  fetch('phishing-data.json').then(r => r.json()).then(data => {
    emails = data;
    showTips();
  });

  // buttons
  document.getElementById('btn-tips').addEventListener('click', showTips);
  document.getElementById('btn-sim').addEventListener('click', showSimulation);
  document.getElementById('btn-quiz').addEventListener('click', showQuiz);
  document.getElementById('closeModal').addEventListener('click', () => closeModal());
});

// Basic tips module
function showTips(){
  const c = document.getElementById('content');
  c.innerHTML = `
    <div class="card">
      <h2>Safe Browsing Tips</h2>
      <ul style="text-align:left; margin-top:10px;">
        <li>Use unique passwords + a password manager.</li>
        <li>Check sender address carefully (not just display name).</li>
        <li>Hover links to reveal the real URL — watch for mismatches.</li>
        <li>Attachments from unknown senders: don't open them.</li>
        <li>Enable 2FA wherever possible.</li>
      </ul>
    </div>
  `;
}

// Phishing simulation: list of emails
function showSimulation(){
  const c = document.getElementById('content');
  c.innerHTML = `<div class="card"><h2>Phishing Simulation</h2>
    <p>Click any email to open it and decide: <strong>Phishing</strong> or <strong>Safe</strong>.</p>
    <div class="email-list" id="emailsContainer"></div>
    <div style="margin-top:12px;">Score: <span id="score">0</span> / <span id="attempted">0</span></div>
  </div>`;

  const container = document.getElementById('emailsContainer');
  container.innerHTML = '';
  emails.forEach(email => {
    const row = document.createElement('div');
    row.className = 'email-row';
    row.innerHTML = `
      <img src="${email.logo}" alt="logo" style="width:48px;height:48px;border-radius:8px;">
      <div style="flex:1;">
        <div><span class="sender">${email.senderName}</span> <span style="color:#999"> &lt;${email.senderEmail}&gt;</span></div>
        <div class="subject">${email.subject}</div>
      </div>
      <div><button class="btn" data-id="${email.id}">Open</button></div>
    `;
    container.appendChild(row);
    row.querySelector('button').addEventListener('click', () => openEmail(email.id));
  });
}

// Open email modal
function openEmail(id){
  const email = emails.find(e => e.id === id);
  if(!email) return;
  const header = document.getElementById('emailHeader');
  const body = document.getElementById('emailBody');
  const footer = document.getElementById('emailFooter');
  header.innerHTML = `
    <img src="${email.logo}" alt="logo"/>
    <div class="email-meta">
      <div style="font-weight:700">${email.senderName} <span style="font-weight:400;color:#666">&lt;${email.senderEmail}&gt;</span></div>
      <div style="color:#888">${email.subject} • ${email.date}</div>
    </div>
  `;
  body.innerHTML = email.bodyHtml;

  // attachments
  if(email.attachments && email.attachments.length){
    let attachHtml = '<div><strong>Attachments:</strong></div>';
    email.attachments.forEach(a => {
      attachHtml += `<div class="attachment"><img src="${a.previewImage}" alt="preview"/><div><div>${a.name}</div><div style="margin-top:6px;"><button class="btn btn-yes" data-file="${a.name}">Preview</button></div></div></div>`;
    });
    body.innerHTML += attachHtml;
  }

  footer.innerHTML = `
    <div style="margin-top:12px;">
      <button class="btn btn-no" id="markPhishing">Mark as Phishing</button>
      <button class="btn btn-yes" id="markSafe">Mark as Safe</button>
    </div>
    <p style="color:#666;margin-top:8px;font-size:13px">Tip: Hover links to see the real address. Suspicious links or mismatching domains are red flags.</p>
  `;

  // add listeners for attachments
  body.querySelectorAll('.btn-yes[data-file]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const fname = ev.currentTarget.getAttribute('data-file');
      alert(`Simulated preview of ${fname}. (Do not open unknown attachments in real life.)`);
    });
  });

  // wire up link hover tooltip & click prevention
  enableLinkPreview(body, email.links || []);

  document.getElementById('markPhishing').onclick = () => evaluateAnswer(email, 'phishing');
  document.getElementById('markSafe').onclick = () => evaluateAnswer(email, 'legit');

  // show modal
  const modal = document.getElementById('emailModal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

// Close modal
function closeModal(){
  document.getElementById('emailModal').classList.add('hidden');
  document.getElementById('emailModal').setAttribute('aria-hidden', 'true');
  hideTooltip();
}

// Evaluate user choice
function evaluateAnswer(email, userChoice){
  attempted++;
  document.getElementById('attempted').innerText = attempted;
  const correct = email.type === userChoice;
  if(correct) score++;
  document.getElementById('score').innerText = score;
  alert(correct ? "Correct — good eye!" : `Incorrect. This email was ${email.type === 'phishing' ? 'a phishing attempt' : 'legitimate'}.`);
  closeModal();
}

// Enable tooltip hover over links to show actual href
function enableLinkPreview(container, linksMeta){
  // attach listeners to .sim-link anchors
  const tooltip = document.getElementById('tooltip');

  container.querySelectorAll('a.sim-link').forEach(a => {
    a.addEventListener('mouseenter', (ev) => {
      const el = ev.currentTarget;
      // try to find metadata that matches link text
      const text = el.textContent.trim();
      const meta = linksMeta.find(l => l.text === text) || linksMeta[0];
      const realHref = meta ? meta.href : el.dataset.href || el.href;
      const display = meta ? meta.display : el.textContent;
      // position tooltip near mouse
      const rect = el.getBoundingClientRect();
      tooltip.style.left = (rect.left + window.scrollX) + 'px';
      tooltip.style.top = (rect.bottom + window.scrollY + 8) + 'px';
      tooltip.innerHTML = `<div style="font-size:12px">Display: <strong>${display}</strong></div><div style="font-size:12px; margin-top:4px">Actual: <strong>${realHref}</strong></div>`;
      tooltip.classList.remove('hidden');
      // color to indicate suspicion (simple heuristic)
      if(!realHref.startsWith(display.split('/')[0]) && !realHref.includes(display.split('//').pop().split('/')[0])) {
        tooltip.style.background = '#7b1f1f'; // suspicious -> dark red
      } else {
        tooltip.style.background = '#111';
      }
    });
    a.addEventListener('mouseleave', () => hideTooltip());
    // prevent navigation — this is a simulation
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      alert('Navigation blocked in simulation. Hover to inspect real URL before clicking in real life.');
    });
  });
}

function hideTooltip(){
  const t = document.getElementById('tooltip');
  t.classList.add('hidden');
}
