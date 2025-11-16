// dashboard.js (với Pagination + Filters + Export Excel + Charts)

/* Global state */
let allStudents = [];
let filteredStudents = []; // sau khi filter
let currentPage = 1;
let pageSize = 10;

/* Load data */
async function loadAdminDashboard(){
  const res = await fetch("/api/admin/students", {
    headers: { "x-admin-token": localStorage.getItem("adminToken") }
  });
  allStudents = await res.json();

  // mặc định filtered = all
  filteredStudents = [...allStudents];

  renderSummary();
  renderFilters();
  renderCharts();
  setupPaginationControls();
  renderListPage(currentPage);
}

/* SUMMARY */
function renderSummary(){
  document.getElementById("totalStudents").innerText = allStudents.length;
  document.getElementById("totalCV").innerText = allStudents.filter(s=>s.cv).length;

  const skillMap = {};
  allStudents.forEach(s => s.skills.forEach(sk => {
    skillMap[sk] = (skillMap[sk] || 0) + 1;
  }));

  document.getElementById("topSkills").innerText =
    Object.entries(skillMap)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5)
      .map(([k,v]) => `${k} (${v})`)
      .join(", ");
}

/* FILTERS */
function renderFilters(){
  const skills = new Set();
  const universities = new Set();

  allStudents.forEach(s => {
    s.skills.forEach(sk => skills.add(sk));
    if(s.university) universities.add(s.university);
  });

  const filterSkill = document.getElementById("filterSkill");
  const filterUniversity = document.getElementById("filterUniversity");

  // reset options (preserve first empty option)
  filterSkill.querySelectorAll('option:not([value=""])')?.forEach(o=>o.remove());
  filterUniversity.querySelectorAll('option:not([value=""])')?.forEach(o=>o.remove());

  Array.from(skills).sort().forEach(sk => {
    const op = document.createElement("option");
    op.value = sk; op.textContent = sk;
    filterSkill.appendChild(op);
  });

  Array.from(universities).sort().forEach(u => {
    const op = document.createElement("option");
    op.value = u; op.textContent = u;
    filterUniversity.appendChild(op);
  });

  filterSkill.onchange = onFilterChange;
  filterUniversity.onchange = onFilterChange;

  // page size control
  const ps = document.getElementById("pageSize");
  ps.value = pageSize;
  ps.onchange = () => {
    pageSize = parseInt(ps.value, 10);
    currentPage = 1;
    renderListPage(currentPage);
  };
}

function onFilterChange(){
  const skill = document.getElementById("filterSkill").value;
  const uni = document.getElementById("filterUniversity").value;

  filteredStudents = allStudents.filter(s => {
    const matchSkill = skill ? s.skills.includes(skill) : true;
    const matchUni = uni ? s.university === uni : true;
    return matchSkill && matchUni;
  });

  // cập nhật charts & summary (nếu muốn charts dựa trên filtered -> update)
  renderCharts(); // charts dùng filteredStudents inside
  currentPage = 1;
  setupPaginationControls();
  renderListPage(currentPage);
}

/* EXPORT Excel (xuất filtered list) */
function exportExcel(){
  // ensure XLSX lib loaded in HTML: xlsx.full.min.js
  const dataForExport = filteredStudents.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    university: s.university,
    skills: s.skills.join(', '),
    cv: s.cv,
    createdAt: s.createdAt
  }));
  const ws = XLSX.utils.json_to_sheet(dataForExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, `NovaHA_Students_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* CHARTS - use filteredStudents for charts to reflect filters */
let chartSkill, chartUni, chartWeek;
function renderCharts(){
  const data = filteredStudents;

  // skill map
  const skillMap = {};
  data.forEach(s => s.skills.forEach(sk => {
    skillMap[sk] = (skillMap[sk]||0) + 1;
  }));

  // university map
  const uniMap = {};
  data.forEach(s => { if(s.university) uniMap[s.university] = (uniMap[s.university]||0)+1; });

  // weekly map
  const weekMap = {};
  data.forEach(s => {
    let wk = getWeekNumber(new Date(s.createdAt));
    weekMap[wk] = (weekMap[wk]||0) + 1;
  });

  // destroy existing charts (if already created) to avoid duplicates
  if(chartSkill) chartSkill.destroy();
  if(chartUni) chartUni.destroy();
  if(chartWeek) chartWeek.destroy();

  const skillCtx = document.getElementById('skillChart').getContext('2d');
  chartSkill = new Chart(skillCtx, {
    type: 'pie',
    data: { labels: Object.keys(skillMap), datasets: [{ data: Object.values(skillMap), backgroundColor: ['#0ea5ff','#7c3aed','#22c55e','#f43f5e','#f59e0b','#6366f1'] }] },
    options: { responsive:true, maintainAspectRatio:false }
  });

  const uniCtx = document.getElementById('universityChart').getContext('2d');
  chartUni = new Chart(uniCtx, {
    type: 'bar',
    data: { labels: Object.keys(uniMap), datasets:[{ label:'SV', data: Object.values(uniMap), backgroundColor:'#7c3aed' }] },
    options: { responsive:true, maintainAspectRatio:false }
  });

  const weekCtx = document.getElementById('weekChart').getContext('2d');
  chartWeek = new Chart(weekCtx, {
    type: 'line',
    data: { labels: Object.keys(weekMap).map(w=>'Tuần '+w), datasets:[{ label:'Ứng viên', data:Object.values(weekMap), borderColor:'#0ea5ff', backgroundColor:'#0ea5ff33', fill:true, tension:0.3 }] },
    options: { responsive:true, maintainAspectRatio:false }
  });
}

/* HELPER: week number */
function getWeekNumber(date){
  const onejan = new Date(date.getFullYear(),0,1);
  return Math.ceil((((date - onejan) / 86400000) + onejan.getDay()+1)/7);
}

/* PAGINATION UI */
function setupPaginationControls(){
  const total = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const ctr = document.getElementById('paginationControls');
  ctr.innerHTML = '';

  const prev = document.createElement('button');
  prev.textContent = '« Prev';
  prev.className = 'btn-primary';
  prev.style.padding = '6px 10px';
  prev.disabled = currentPage === 1;
  prev.onclick = ()=> { if(currentPage>1){ currentPage--; renderListPage(currentPage); } };
  ctr.appendChild(prev);

  // page numbers (show limited window)
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize/2));
  let end = Math.min(totalPages, start + windowSize - 1);
  if(end - start < windowSize -1) start = Math.max(1, end - windowSize + 1);

  for(let p = start; p <= end; p++){
    const btn = document.createElement('button');
    btn.textContent = p;
    btn.style.padding = '6px 10px';
    btn.style.marginLeft = '6px';
    btn.className = (p === currentPage) ? 'btn-primary' : '';
    btn.onclick = ((page)=> () => { currentPage = page; renderListPage(currentPage); })(p);
    ctr.appendChild(btn);
  }

  const next = document.createElement('button');
  next.textContent = 'Next »';
  next.className = 'btn-primary';
  next.style.padding = '6px 10px';
  next.style.marginLeft = '8px';
  next.disabled = currentPage === totalPages;
  next.onclick = ()=> { if(currentPage < totalPages){ currentPage++; renderListPage(currentPage); } };
  ctr.appendChild(next);

  // summary
  const info = document.createElement('div');
  info.style.marginLeft = '12px';
  info.style.color = 'var(--muted)';
  info.style.fontSize = '14px';
  info.textContent = `Trang ${currentPage} / ${totalPages} • ${total} kết quả`;
  ctr.appendChild(info);
}

/* RENDER list for a page */
function renderListPage(page){
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filteredStudents.slice(start, end);
  renderList(pageItems);
  setupPaginationControls();
}

/* RENDER list (given array) */
function renderList(arr){
  const box = document.getElementById("students");
  box.innerHTML = "";

  arr.forEach(s=>{
    const initials = (s.name || '').split(" ").map(i=>i[0]).join("").slice(0,2).toUpperCase() || "NV";
    const div = document.createElement("div");
    div.className = "student-card";

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <strong>${s.name}</strong><br>
          <span class="small">${s.university || ""}</span><br>
          <span class="small">${s.skills.join(", ")}</span><br>
          ${s.cv ? `<a href="${s.cv}" target="_blank">📄 Xem CV</a>` : "<i>Chưa có CV</i>"}
        </div>
        <div class="avatar-circle" title="${s.name}">${initials}</div>
      </div>
    `;

    box.appendChild(div);
  });
}

/* INIT */
loadAdminDashboard();
