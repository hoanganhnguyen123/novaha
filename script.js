async function fetchStudents(){
  const res = await fetch('/api/students');
  const data = await res.json();
  const el = document.getElementById('list') || document.getElementById('students');
  if(!el) return;
  el.innerHTML = '';
  data.forEach(s => {
    const div = document.createElement('div');
    div.className = 'student-card';
    div.innerHTML = `<strong>${s.name}</strong> <div class="small">${s.university || ''} • ${s.skills.join(', ')}</div>
      <div style="margin-top:6px">${s.bio || ''}</div>
      <div style="margin-top:8px"><a href="${s.cv || '#'}" target="_blank">${s.cv ? 'Download CV' : ''}</a></div>
      <div style="margin-top:6px;font-size:12px;color:#888">Submitted: ${new Date(s.createdAt).toLocaleString()}</div>`;
    el.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  fetchStudents();
  const form = document.getElementById('studentForm');
  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const res = await fetch('/api/students', { method:'POST', body: fd });
      const data = await res.json();
      const msg = document.getElementById('msg');
      if(data.ok){
        msg.innerText = 'Gửi hồ sơ thành công!';
        form.reset();
        fetchStudents();
      } else {
        msg.innerText = 'Có lỗi, thử lại.';
      }
    });
  }
});
