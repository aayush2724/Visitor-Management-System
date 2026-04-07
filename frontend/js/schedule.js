// Set min date to today
document.getElementById('scheduled_date').min = new Date().toISOString().split('T')[0];

document.getElementById('schedule-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = '⧗ SCHEDULING...';

  const dateVal = document.getElementById('scheduled_date').value;
  const timeVal = document.getElementById('scheduled_time').value;
  const scheduled_date = timeVal ? `${dateVal}T${timeVal}` : dateVal;

  const data = {
    full_name: document.getElementById('full_name').value.trim(),
    contact_number: document.getElementById('contact_number').value.trim(),
    department_visiting: document.getElementById('department_visiting').value,
    person_to_visit: document.getElementById('person_to_visit').value.trim(),
    scheduled_date
  };

  try {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Scheduling failed');

    const card = document.getElementById('success-card');
    document.getElementById('success-msg').textContent =
      `${data.full_name} · ${document.getElementById('department_visiting').options[document.getElementById('department_visiting').selectedIndex].text} · ${new Date(scheduled_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}`;
    card.style.display = 'block';
    e.target.reset();
    document.getElementById('scheduled_date').min = new Date().toISOString().split('T')[0];
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = '◆ CONFIRM SCHEDULE';
  }
});
