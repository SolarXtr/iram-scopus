document.addEventListener('DOMContentLoaded', () => {
    // State arrays
    let researchers = [];
    let publications = [];
    let dbMetadata = {}; // to keep retrieve time, affiliation etc.

    // Sorting state
    let pubSortField = 'year';
    let pubSortDir = 'desc';
    let resSortField = 'name';
    let resSortDir = 'asc';

    // DOM Elements
    const navResearchers = document.getElementById('nav-manage-researchers');
    const navPublications = document.getElementById('nav-manage-publications');
    const navAnalytics = document.getElementById('nav-manage-analytics');
    
    const secResearchers = document.getElementById('manage-researchers-section');
    const secPublications = document.getElementById('manage-publications-section');
    const secAnalytics = document.getElementById('manage-analytics-section');

    const researcherTbody = document.getElementById('researcher-admin-tbody');
    const publicationTbody = document.getElementById('publication-admin-tbody');

    const searchResearcher = document.getElementById('researcher-admin-search');
    const searchPublication = document.getElementById('publication-admin-search');
    const adminYearFilter = document.getElementById('admin-year-filter');
    const adminResStatusFilter = document.getElementById('admin-res-status-filter');
    const adminResDeptFilter = document.getElementById('admin-res-dept-filter');

    const researcherSummaryContainer = document.getElementById('researcher-summary-container');
    const publicationSummaryContainer = document.getElementById('publication-summary-container');

    // Modals & Forms
    const researcherModal = document.getElementById('researcher-form-modal');
    const researcherForm = document.getElementById('researcher-form');
    const btnAddResearcher = document.getElementById('btn-add-researcher');
    const btnCancelResearcher = document.getElementById('btn-cancel-researcher');
    const researcherModalTitle = document.getElementById('researcher-modal-title');

    const publicationModal = document.getElementById('publication-form-modal');
    const publicationForm = document.getElementById('publication-form');
    const btnAddPublication = document.getElementById('btn-add-publication');
    const btnCancelPublication = document.getElementById('btn-cancel-publication');
    const publicationModalTitle = document.getElementById('publication-modal-title');

    const toastEl = document.getElementById('toast-el');
    const toastMsg = document.getElementById('toast-msg');

    // --- TAB SYSTEM NAVIGATION ---
    function switchTab(target) {
        navResearchers.classList.remove('active');
        navPublications.classList.remove('active');
        if(navAnalytics) navAnalytics.classList.remove('active');
        secResearchers.classList.remove('active');
        secPublications.classList.remove('active');
        if(secAnalytics) secAnalytics.classList.remove('active');

        if (target === 'researchers') {
            navResearchers.classList.add('active');
            secResearchers.classList.add('active');
        } else if (target === 'analytics') {
            if(navAnalytics) navAnalytics.classList.add('active');
            if(secAnalytics) secAnalytics.classList.add('active');
            loadAnalytics();
        } else {
            navPublications.classList.add('active');
            secPublications.classList.add('active');
        }
    }

    navResearchers.addEventListener('click', (e) => { e.preventDefault(); switchTab('researchers'); });
    navPublications.addEventListener('click', (e) => { e.preventDefault(); switchTab('publications'); });
    if(navAnalytics) navAnalytics.addEventListener('click', (e) => { e.preventDefault(); switchTab('analytics'); });
    
    const btnRefreshAnalytics = document.getElementById('btn-refresh-analytics');
    if(btnRefreshAnalytics) btnRefreshAnalytics.addEventListener('click', () => loadAnalytics());

    let trendChart = null;
    let deviceChart = null;
    let countryChart = null;
    let referrerChart = null;
    let resolutionChart = null;

    async function loadAnalytics() {
        try {
            const resp = await fetch('https://iram-backend.tinnakornh.workers.dev/api/analytics/summary');
            if (resp.ok) {
                const data = await resp.json();
                renderAnalytics(data);
            }
            
            const dashResp = await fetch('https://iram-backend.tinnakornh.workers.dev/api/analytics/dashboard');
            if (dashResp.ok) {
                const dashData = await dashResp.json();
                renderCharts(dashData);
            }
        } catch (e) {
            console.error('Failed to load analytics', e);
        }
    }
    
    function renderCharts(data) {
        if (typeof Chart === 'undefined') return; // Chart.js not loaded
        
        const safeDestroy = (chartObj) => { if (chartObj) chartObj.destroy(); };
        const chartColors = ['#2563eb', '#059669', '#ea580c', '#7c3aed', '#db2777', '#0891b2', '#ca8a04', '#4f46e5', '#dc2626', '#16a34a'];

        // 1. Trend Line Chart
        safeDestroy(trendChart);
        trendChart = new Chart(document.getElementById('chart-trend'), {
            type: 'line',
            data: {
                labels: data.trend.map(d => d.date),
                datasets: [{
                    label: 'Pageviews',
                    data: data.trend.map(d => d.count),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // 2. Devices Doughnut Chart
        safeDestroy(deviceChart);
        deviceChart = new Chart(document.getElementById('chart-devices'), {
            type: 'doughnut',
            data: {
                labels: data.devices.map(d => d.label || 'Unknown'),
                datasets: [{
                    data: data.devices.map(d => d.count),
                    backgroundColor: chartColors
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // 3. Countries Bar Chart
        safeDestroy(countryChart);
        countryChart = new Chart(document.getElementById('chart-countries'), {
            type: 'bar',
            data: {
                labels: data.countries.map(d => d.label || 'Unknown'),
                datasets: [{
                    label: 'Views',
                    data: data.countries.map(d => d.count),
                    backgroundColor: '#059669',
                    borderRadius: 4
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // 4. Referrers Bar Chart
        safeDestroy(referrerChart);
        referrerChart = new Chart(document.getElementById('chart-referrers'), {
            type: 'bar',
            data: {
                labels: data.referrers.map(d => d.label || 'Direct'),
                datasets: [{
                    label: 'Visits',
                    data: data.referrers.map(d => d.count),
                    backgroundColor: '#7c3aed',
                    borderRadius: 4
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // 5. Resolutions Bar Chart
        safeDestroy(resolutionChart);
        resolutionChart = new Chart(document.getElementById('chart-resolutions'), {
            type: 'bar',
            data: {
                labels: data.resolutions.map(d => d.label || 'Unknown'),
                datasets: [{
                    label: 'Views',
                    data: data.resolutions.map(d => d.count),
                    backgroundColor: '#db2777',
                    borderRadius: 4
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    function renderAnalytics(data) {
        const tbody = document.getElementById('analytics-admin-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.domain}${row.path}</td>
                <td style="text-align: center;"><span class="db-badge" style="background: #2563eb; color: white;">${row.totalViews}</span></td>
                <td style="text-align: center;"><span class="db-badge" style="background: #059669; color: white;">${row.viewsThisMonth}</span></td>
                <td style="text-align: center;"><span class="db-badge" style="background: #ea580c; color: white;">${row.viewsToday}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- DATA FETCHING ---
    async function loadData() {
        try {
            // Load researchers from researchers.json
            const resResp = await fetch('https://iram-backend.tinnakornh.workers.dev/api/researchers');
            if (resResp.ok) {
                researchers = await resResp.json();
            }

            // Load data.json for publications
            const dataResp = await fetch('https://iram-backend.tinnakornh.workers.dev/api/publications');
            if (dataResp.ok) {
                const rawPubs = await dataResp.json() || [];
                publications = rawPubs.map(pub => {
                    let parsedAuthors = [];
                    let corrAuthorStr = null;
                    if (pub.authors) {
                        try {
                            const authorsObjArray = typeof pub.authors === 'string' ? JSON.parse(pub.authors) : pub.authors;
                            if (Array.isArray(authorsObjArray)) {
                                parsedAuthors = authorsObjArray.map(a => typeof a === 'string' ? a : (a.name || ''));
                                const corr = authorsObjArray.find(a => typeof a === 'object' && (a.isCorresponding === 1 || a.isCorresponding === true));
                                if (corr) corrAuthorStr = corr.name;
                            }
                        } catch (e) {
                            console.warn('Failed to parse authors for pub', pub.id);
                        }
                    }
                    
                    let parsedDbs = ['Scopus'];
                    if (pub.sourceDatabases) {
                        try {
                            parsedDbs = typeof pub.sourceDatabases === 'string' ? JSON.parse(pub.sourceDatabases) : pub.sourceDatabases;
                        } catch(e) {}
                    }
                    
                    return {
                        ...pub,
                        quartile_scopus: pub.quartile || '',
                        quartile_scimago: pub.quartile_scimago || '',
                        authors: parsedAuthors,
                        corresponding_author: corrAuthorStr || pub.corresponding_author || null,
                        databases: parsedDbs
                    };
                });
                dbMetadata = {
                    status: "success",
                    data_source: "manual",
                    retrieved_at: new Date().toLocaleString(),
                    affiliation: "Faculty of Medicine, Naresuan University",
                    researchers: []
                };
            }
            
            // Check last sync date from dbMetadata.retrieved_at
            if (dbMetadata.retrieved_at) {
                const syncDate = new Date(dbMetadata.retrieved_at);
                const now = new Date();
                const diffTime = Math.abs(now - syncDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 15) {
                    const warnEl = document.getElementById('sync-warning');
                    const dateEl = document.getElementById('last-sync-date');
                    if (warnEl && dateEl) {
                        dateEl.textContent = syncDate.toLocaleDateString();
                        warnEl.style.display = 'block';
                    }
                }
            }
            
            populateYearDropdown();
            // Default year filter to 5 years (5y)
            if (adminYearFilter) {
                adminYearFilter.value = '5y';
            }
            populateResearcherFilters();
            renderResearchers();
            renderPublications();
        } catch (err) {
            console.error("Error loading data:", err);
            showToast("Failed to load databases", "error");
        }
    }

    function populateYearDropdown() {
        if (!adminYearFilter) return;
        adminYearFilter.innerHTML = `
            <option value="all">All Years</option>
            <option value="3y">Past 3 Years</option>
            <option value="5y">Past 5 Years</option>
            <option value="10y">Past 10 Years</option>
        `;
        const years = [...new Set(publications.map(p => parseInt(p.year)))].filter(y => !isNaN(y)).sort((a, b) => b - a);
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = `Year ${y}`;
            adminYearFilter.appendChild(opt);
        });
    }

    function populateResearcherFilters() {
        if (!adminResDeptFilter) return;
        adminResDeptFilter.innerHTML = `<option value="all">All Departments</option>`;
        const depts = [...new Set(researchers.map(r => r.department))].filter(d => d).sort();
        depts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            adminResDeptFilter.appendChild(opt);
        });
    }

    // --- TOAST NOTIFICATIONS ---
    function showToast(message, type = "success") {
        toastMsg.textContent = message;
        if (type === "success") {
            toastEl.querySelector('i').className = "fa-solid fa-circle-check";
            toastEl.querySelector('i').style.color = "var(--accent-teal)";
        } else {
            toastEl.querySelector('i').className = "fa-solid fa-triangle-exclamation";
            toastEl.querySelector('i').style.color = "#ef4444";
        }
        toastEl.classList.add('active');
        setTimeout(() => {
            toastEl.classList.remove('active');
        }, 3000);
    }

    // --- RESEARCHER SUMMARIZATION ---
    function renderResearcherSummary(filteredRes) {
        if (!researcherSummaryContainer) return;
        const deptGroups = {};
        filteredRes.forEach(r => {
            const dept = r.department || "Faculty of Medicine";
            if (!deptGroups[dept]) {
                deptGroups[dept] = { active: 0, inactive: 0 };
            }
            if (r.status === 'Active') {
                deptGroups[dept].active++;
            } else {
                deptGroups[dept].inactive++;
            }
        });

        let html = `
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Department / Division</th>
                        <th style="width: 20%; text-align: center;">Active Researchers</th>
                        <th style="width: 20%; text-align: center;">Resigned / Inactive</th>
                        <th style="width: 20%; text-align: center;">Total Researchers</th>
                    </tr>
                </thead>
                <tbody>
        `;
        const depts = Object.keys(deptGroups).sort();
        if (depts.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No researchers to summarize</td></tr>`;
        } else {
            depts.forEach(d => {
                const g = deptGroups[d];
                html += `
                    <tr>
                        <td><strong>${d}</strong></td>
                        <td style="text-align: center;"><span style="color:var(--accent-teal); font-weight:600;">${g.active}</span></td>
                        <td style="text-align: center;"><span style="color:var(--text-muted);">${g.inactive}</span></td>
                        <td style="text-align: center;"><strong>${g.active + g.inactive}</strong></td>
                    </tr>
                `;
            });
        }
        html += `</tbody></table>`;
        researcherSummaryContainer.innerHTML = html;
    }

    // --- PUBLICATION SUMMARIZATION ---
    function renderPublicationSummary(filteredPubs) {
        if (!publicationSummaryContainer) return;
        const yearGroups = {};
        filteredPubs.forEach(pub => {
            const y = pub.year ? String(parseInt(pub.year, 10)) : "Unknown";
            if (!yearGroups[y]) {
                yearGroups[y] = { count: 0, citations: 0 };
            }
            yearGroups[y].count++;
            yearGroups[y].citations += parseInt(pub.citations) || 0;
        });

        const sortedYears = Object.keys(yearGroups).sort((a, b) => b - a);
        let html = `
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Year</th>
                        <th style="width: 25%; text-align: center;">Total Articles</th>
                        <th style="width: 25%; text-align: center;">Total Citations</th>
                        <th style="width: 25%; text-align: center;">Average Citations per Article</th>
                    </tr>
                </thead>
                <tbody>
        `;
        if (sortedYears.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No articles to summarize</td></tr>`;
        } else {
            sortedYears.forEach(y => {
                const g = yearGroups[y];
                const avg = g.count > 0 ? (g.citations / g.count).toFixed(2) : 0;
                html += `
                    <tr>
                        <td><strong>${y}</strong></td>
                        <td style="text-align: center;">${g.count}</td>
                        <td style="text-align: center;">${g.citations}</td>
                        <td style="text-align: center;">${avg}</td>
                    </tr>
                `;
            });
        }
        html += `</tbody></table>`;
        publicationSummaryContainer.innerHTML = html;
    }

    // --- SORTING HELPERS ---
    function sortResearchers(list) {
        return list.sort((a, b) => {
            let valA = (a[resSortField] || '').toLowerCase();
            let valB = (b[resSortField] || '').toLowerCase();
            if (valA < valB) return resSortDir === 'asc' ? -1 : 1;
            if (valA > valB) return resSortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function sortPublications(list) {
        return list.sort((a, b) => {
            let valA, valB;
            if (pubSortField === 'title') {
                valA = (a.title || '').toLowerCase();
                valB = (b.title || '').toLowerCase();
            } else if (pubSortField === 'journal') {
                valA = (a.journal || '').toLowerCase();
                valB = (b.journal || '').toLowerCase();
            } else if (pubSortField === 'year') {
                valA = parseInt(a.year) || 0;
                valB = parseInt(b.year) || 0;
            } else if (pubSortField === 'citations') {
                valA = parseInt(a.citations) || 0;
                valB = parseInt(b.citations) || 0;
            } else if (pubSortField === 'quartile') {
                valA = a.quartile_scopus || 'Q9';
                valB = b.quartile_scopus || 'Q9';
            }
            if (valA < valB) return pubSortDir === 'asc' ? -1 : 1;
            if (valA > valB) return pubSortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // --- RENDER RESEARCHERS ---
    function renderResearchers() {
        // Get active filtered and sorted list
        const filtered = getFilteredResearchers();

        // Render Summary Table
        renderResearcherSummary(filtered);

        researcherTbody.innerHTML = '';
        if (filtered.length === 0) {
            researcherTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No researchers found.</td></tr>`;
            return;
        }

        filtered.forEach((r, idx) => {
            const originalIndex = researchers.indexOf(r);
            const tr = document.createElement('tr');
            
            let badgeStyle = '';
            if (r.status === 'Active') {
                badgeStyle = 'background: rgba(13, 148, 136, 0.15); color: var(--accent-teal); border: 1px solid rgba(13, 148, 136, 0.25);';
            } else if (r.status === 'Resigned') {
                badgeStyle = 'background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.25);';
            } else {
                badgeStyle = 'background: rgba(148, 163, 184, 0.15); color: var(--text-muted); border: 1px solid rgba(148, 163, 184, 0.25);';
            }

            tr.innerHTML = `
                <td style="font-weight:600;">${r.name}</td>
                <td><code>${r.author_id}</code></td>
                <td style="font-size:0.85rem;">${r.department}</td>
                <td>
                    <span class="badge" style="padding: 0.25rem 0.5rem; border-radius: 6px; font-weight:600; font-size:0.75rem; ${badgeStyle}">
                        ${r.status}
                    </span>
                </td>
                <td style="text-align: center;">
                    <button class="admin-action-btn btn-edit" data-idx="${originalIndex}"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="admin-action-btn btn-delete" data-idx="${originalIndex}"><i class="fa-solid fa-trash"></i> Delete</button>
                </td>
            `;
            researcherTbody.appendChild(tr);
        });

        // Add event listeners to edit and delete buttons
        researcherTbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                openResearcherModal(idx);
            });
        });
        researcherTbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                if (confirm(`Are you sure you want to delete ${researchers[idx].name}?`)) {
                    researchers.splice(idx, 1);
                    renderResearchers();
                    showToast("Researcher removed locally (Remember to Save)");
                }
            });
        });
    }

    // Helper function to format full names or other variations to "Lastname, F."
    const formatAuthorName = (name) => {
        if (!name) return '';
        name = name.trim();
        if (name.includes(',')) return name;
        
        const parts = name.split(/\s+/);
        if (parts.length === 2) {
            const first = parts[0];
            const second = parts[1];
            if (/^[A-Z]\.?([A-Z]\.?)?$/.test(second)) {
                const cleanInitials = second.replace(/\.+/g, '').split('').join('.') + '.';
                return `${first}, ${cleanInitials}`;
            }
        }
        
        if (parts.length >= 2) {
            const last = parts[parts.length - 1];
            const first = parts[0];
            const initial = first.charAt(0).toUpperCase() + '.';
            return `${last}, ${initial}`;
        }
        return name;
    };

    // Helper function for corresponding author matching
    const isCorrespondingAuthor = (authorName, correspondingName) => {
        if (!authorName || !correspondingName) return false;
        
        const normalize = (str) => {
            return str.toLowerCase()
                .replace(/,/g, ' ')
                .replace(/\./g, ' ')
                .replace(/[^a-z\s-]/g, '')
                .trim()
                .split(/\s+/)
                .filter(t => t.length > 0);
        };
        
        const aTokens = normalize(authorName);
        const cTokens = normalize(correspondingName);
        
        if (aTokens.length === 0 || cTokens.length === 0) return false;
        
        const aSurnames = aTokens.filter(t => t.length > 2);
        const cSurnames = cTokens.filter(t => t.length > 2);
        const aInits = aTokens.filter(t => t.length <= 2).map(t => t[0]);
        const cInits = cTokens.filter(t => t.length <= 2).map(t => t[0]);
        
        const sharedSurname = aSurnames.some(a => cSurnames.includes(a));
        if (!sharedSurname) return false;
        
        if (aInits.length > 0 && cInits.length > 0) {
            return aInits.some(ai => cInits.includes(ai));
        }
        if (aInits.length > 0 && cSurnames.length > 0) {
            return cSurnames.some(cs => aInits.includes(cs[0]));
        }
        if (cInits.length > 0 && aSurnames.length > 0) {
            return aSurnames.some(as => cInits.includes(as[0]));
        }
        
        return true;
    };

    const formatAuthorsWithEtAl = (authors, correspondingAuthor) => {
        if (!authors || authors.length === 0) return '';
        
        // Helper to format name
        const formatName = (name) => formatAuthorName(name);

        if (authors.length < 4) {
            return authors.map(author => {
                const isCorresponding = correspondingAuthor && (
                    author.trim().toLowerCase() === correspondingAuthor.trim().toLowerCase() ||
                    isCorrespondingAuthor(author, correspondingAuthor)
                );
                const formattedName = formatName(author);
                if (isCorresponding) {
                    return `<strong>${formattedName}</strong> <i class="fa-regular fa-envelope" title="Corresponding Author" style="color: var(--accent-purple); cursor: help;"></i>`;
                }
                return formattedName;
            }).join(', ');
        }

        // 4 or more authors
        const firstAuthor = authors[0];
        const isFirstCorresponding = correspondingAuthor && (
            firstAuthor.trim().toLowerCase() === correspondingAuthor.trim().toLowerCase() ||
            isCorrespondingAuthor(firstAuthor, correspondingAuthor)
        );

        let corrAuthor = null;
        if (correspondingAuthor) {
            corrAuthor = authors.find((auth, idx) => idx > 0 && (
                auth.trim().toLowerCase() === correspondingAuthor.trim().toLowerCase() ||
                isCorrespondingAuthor(auth, correspondingAuthor)
            ));
        }

        const firstDisplay = isFirstCorresponding 
            ? `<strong>${formatName(firstAuthor)}</strong> <i class="fa-regular fa-envelope" title="Corresponding Author" style="color: var(--accent-purple); cursor: help;"></i>` 
            : formatName(firstAuthor);

        if (corrAuthor) {
            const corrDisplay = `<strong>${formatName(corrAuthor)}</strong> <i class="fa-regular fa-envelope" title="Corresponding Author" style="color: var(--accent-purple); cursor: help;"></i>`;
            return `${firstDisplay}, ${corrDisplay}, et al.`;
        }

        return `${firstDisplay}, et al.`;
    };

    // --- RENDER PUBLICATIONS ---
    function renderPublications() {
        // Get active filtered and sorted list
        const filtered = getFilteredPublications();

        // Render Summary Table
        renderPublicationSummary(filtered);

        publicationTbody.innerHTML = '';
        if (filtered.length === 0) {
            publicationTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No publications found.</td></tr>`;
            return;
        }

        filtered.forEach((pub, idx) => {
            const originalIndex = publications.indexOf(pub);
            const tr = document.createElement('tr');
            
            const doiSection = pub.doi ? `
                <div style="font-size:0.75rem; color: var(--text-secondary); margin-top:0.25rem;">
                    <i class="fa-solid fa-link"></i> DOI: ${pub.doi}
                </div>` : '';

            const dbList = pub.databases || ["Scopus"];
            const dbBadgesHtml = dbList.filter(db => db.trim().toLowerCase() !== "orcid").map(db => {
                const cleanDb = db.trim();
                let badgeClass = "db-badge-scopus";
                if (cleanDb.toLowerCase() === "pubmed") {
                    badgeClass = "db-badge-pubmed";
                } else if (cleanDb.toLowerCase() === "wos" || cleanDb.toLowerCase() === "web of science") {
                    badgeClass = "db-badge-wos";
                }
                return `<span class="db-badge ${badgeClass}" style="font-size:0.6rem; padding:0.1rem 0.3rem;">${cleanDb}</span>`;
            }).join(' ');

            // Format authors list using et al. logic
            const formattedAuthors = formatAuthorsWithEtAl(pub.authors, pub.corresponding_author);

            const cleanYear = pub.year ? String(parseInt(pub.year, 10)) : 'Unknown';
            const scopusVal = pub.quartile_scopus || 'N/A';
            const scimagoVal = pub.quartile_scimago || 'N/A';
            const quartileText = `${scopusVal} / ${scimagoVal}`;

            tr.innerHTML = `
                <td>
                    <div style="font-weight:600; font-size:0.9rem; line-height:1.4;">${pub.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">
                        ${formattedAuthors}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.3rem;">
                        ${doiSection}
                        <div class="db-badges" style="margin-left:0;">${dbBadgesHtml}</div>
                    </div>
                </td>
                <td style="font-size:0.85rem;">${pub.journal}</td>
                <td style="text-align: center; font-weight:500;">${cleanYear}</td>
                <td style="text-align: center;">
                    <span class="badge" style="background: rgba(124, 58, 237, 0.1); color: var(--accent-purple); font-weight:bold; padding:0.2rem 0.5rem; border-radius:6px;">
                        ${pub.citations}
                    </span>
                </td>
                <td style="text-align: center; font-size: 0.8rem; font-weight: 500;">
                    ${quartileText}
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="admin-action-btn btn-edit" data-idx="${originalIndex}"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="admin-action-btn btn-delete" data-idx="${originalIndex}"><i class="fa-solid fa-trash"></i> Delete</button>
                </td>
            `;
            publicationTbody.appendChild(tr);
        });

        // Add event listeners
        publicationTbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                openPublicationModal(idx);
            });
        });
        publicationTbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                if (confirm(`Are you sure you want to delete this publication: "${publications[idx].title.substring(0, 50)}..."?`)) {
                    publications.splice(idx, 1);
                    renderPublications();
                    showToast("Article removed locally (Remember to Save)");
                }
            });
        });
    }

    // --- FORM MODAL ACTIONS ---
    // Researcher Modal Helpers
    function openResearcherModal(idx = null) {
        if (idx !== null) {
            researcherModalTitle.textContent = "Edit Researcher";
            const r = researchers[idx];
            document.getElementById('researcher-idx').value = idx;
            document.getElementById('res-name').value = r.name;
            document.getElementById('res-id').value = r.author_id;
            document.getElementById('res-orcid').value = r.orcid || "";
            document.getElementById('res-dept').value = r.department;
            document.getElementById('res-join-date').value = r.joinDate || "";
            document.getElementById('res-resign-date').value = r.resignDate || "";
            document.getElementById('res-status').value = r.status;
        } else {
            researcherModalTitle.textContent = "Add Researcher";
            researcherForm.reset();
            document.getElementById('researcher-idx').value = "";
            document.getElementById('res-orcid').value = "";
            document.getElementById('res-join-date').value = "";
            document.getElementById('res-resign-date').value = "";
        }
        researcherModal.classList.add('active');
    }

    btnAddResearcher.addEventListener('click', () => openResearcherModal());
    btnCancelResearcher.addEventListener('click', () => researcherModal.classList.remove('active'));
    document.getElementById('researcher-modal-close').addEventListener('click', () => researcherModal.classList.remove('active'));

    researcherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idx = document.getElementById('researcher-idx').value;
        const record = {
            name: document.getElementById('res-name').value.trim(),
            author_id: document.getElementById('res-id').value.trim(),
            orcid: document.getElementById('res-orcid').value.trim(),
            department: document.getElementById('res-dept').value.trim(),
            joinDate: document.getElementById('res-join-date').value,
            resignDate: document.getElementById('res-resign-date').value,
            status: document.getElementById('res-status').value
        };

        if (idx !== "") {
            const oldRecord = researchers[parseInt(idx)];
            const updatedRecord = { ...oldRecord, ...record };
            researchers[parseInt(idx)] = updatedRecord;
            
            // Call API to update if id exists
            if (updatedRecord.id) {
                try {
                    const btn = document.querySelector('#researcher-form button[type="submit"]');
                    btn.disabled = true;
                    btn.textContent = 'Saving...';
                    const res = await fetch(`https://iram-backend.tinnakornh.workers.dev/api/researchers/${updatedRecord.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(record)
                    });
                    btn.disabled = false;
                    btn.textContent = 'Save Details';
                    if (!res.ok) throw new Error('API Error');
                    showToast("Researcher updated successfully in DB");
                } catch(e) {
                    showToast("Failed to update researcher in DB");
                }
            } else {
                showToast("Researcher updated locally");
            }
        } else {
            researchers.push(record);
            showToast("Researcher added locally");
        }
        researcherModal.classList.remove('active');
        renderResearchers();
    });

    // Publication Modal Helpers
    function openPublicationModal(idx = null) {
        if (idx !== null) {
            publicationModalTitle.textContent = "Edit Article Details";
            const pub = publications[idx];
            document.getElementById('publication-idx').value = idx;
            document.getElementById('pub-title-input').value = pub.title;
            document.getElementById('pub-authors-input').value = pub.authors.join(', ');
            document.getElementById('pub-corr-input').value = pub.corresponding_author || "";
            document.getElementById('pub-journal-input').value = pub.journal;
            document.getElementById('pub-year-input').value = pub.year;
            document.getElementById('pub-citations-input').value = pub.citations;
            document.getElementById('pub-doi-input').value = pub.doi || "";
            document.getElementById('pub-volume-input').value = pub.volume || "";
            document.getElementById('pub-issue-input').value = pub.issue || "";
            document.getElementById('pub-artno-input').value = pub.art_no || "";
            document.getElementById('pub-pagestart-input').value = pub.page_start || "";
            document.getElementById('pub-pageend-input').value = pub.page_end || "";
            document.getElementById('pub-q-scopus').value = pub.quartile_scopus || "";
            document.getElementById('pub-q-scimago').value = pub.quartile_scimago || "";
 
            const dbList = pub.databases || ["Scopus"];
            document.getElementById('db-scopus').checked = dbList.includes("Scopus");
            document.getElementById('db-pubmed').checked = dbList.includes("PubMed");
            document.getElementById('db-wos').checked = dbList.includes("WoS") || dbList.includes("Web of Science");
        } else {
            publicationModalTitle.textContent = "Add New Article";
            publicationForm.reset();
            document.getElementById('publication-idx').value = "";
            document.getElementById('pub-volume-input').value = "";
            document.getElementById('pub-issue-input').value = "";
            document.getElementById('pub-artno-input').value = "";
            document.getElementById('pub-pagestart-input').value = "";
            document.getElementById('pub-pageend-input').value = "";
            document.getElementById('pub-q-scopus').value = "";
            document.getElementById('pub-q-scimago').value = "";
            document.getElementById('db-scopus').checked = true;
            document.getElementById('db-pubmed').checked = false;
            document.getElementById('db-wos').checked = false;
        }
        publicationModal.classList.add('active');
    }

    btnAddPublication.addEventListener('click', () => openPublicationModal());
    btnCancelPublication.addEventListener('click', () => publicationModal.classList.remove('active'));
    document.getElementById('publication-modal-close').addEventListener('click', () => publicationModal.classList.remove('active'));

    publicationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const idx = document.getElementById('publication-idx').value;
        
        // Parse authors array
        const authorsVal = document.getElementById('pub-authors-input').value;
        const authorsList = authorsVal.split(',').map(a => a.trim()).filter(a => a !== "");

        // Build database tags
        const databases = [];
        if (document.getElementById('db-scopus').checked) databases.push("Scopus");
        if (document.getElementById('db-pubmed').checked) databases.push("PubMed");
        if (document.getElementById('db-wos').checked) databases.push("WoS");
        if (databases.length === 0) databases.push("Scopus"); // Fallback

        const record = {
            title: document.getElementById('pub-title-input').value.trim(),
            creator: authorsList[0] || "Unknown",
            authors: authorsList,
            corresponding_author: document.getElementById('pub-corr-input').value.trim() || null,
            departments: [], // populated automatically on save
            journal: document.getElementById('pub-journal-input').value.trim(),
            coverDate: `${document.getElementById('pub-year-input').value}-01-01`,
            year: document.getElementById('pub-year-input').value.toString(),
            citations: parseInt(document.getElementById('pub-citations-input').value) || 0,
            doi: document.getElementById('pub-doi-input').value.trim() || null,
            volume: document.getElementById('pub-volume-input').value.trim() || null,
            issue: document.getElementById('pub-issue-input').value.trim() || null,
            art_no: document.getElementById('pub-artno-input').value.trim() || null,
            page_start: document.getElementById('pub-pagestart-input').value.trim() || null,
            page_end: document.getElementById('pub-pageend-input').value.trim() || null,
            databases: databases,
            quartile_scopus: document.getElementById('pub-q-scopus').value || null,
            quartile_scimago: document.getElementById('pub-q-scimago').value || null
        };

        // Inject department auto-matching for the added authors
        const registeredDepts = [];
        authorsList.forEach(author => {
            const matched = researchers.find(r => r.name.toLowerCase() === author.toLowerCase());
            if (matched && !registeredDepts.includes(matched.department)) {
                registeredDepts.push(matched.department);
            }
        });
        record.departments = registeredDepts.length > 0 ? registeredDepts : ["Faculty of Medicine"];

        if (idx !== "") {
            const originalPub = publications[parseInt(idx)];
            const saveBtn = publicationForm.querySelector('button[type="submit"]');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            fetch(`https://iram-backend.tinnakornh.workers.dev/api/publications/${originalPub.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: record.title,
                    journal: record.journal,
                    year: record.year,
                    citations: record.citations,
                    doi: record.doi,
                    quartile: record.quartile_scopus,
                    quartile_scimago: record.quartile_scimago
                })
            }).then(res => {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Details';
                if (res.ok) {
                    publications[parseInt(idx)] = { ...originalPub, ...record };
                    renderPublications();
                    showToast("Article updated successfully in DB");
                } else {
                    showToast("Failed to update article in DB", "error");
                }
            }).catch(err => {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Details';
                showToast("Failed to update article in DB", "error");
            });
        } else {
            // Adding a new publication
            const saveBtn = publicationForm.querySelector('button[type="submit"]');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            // Format authors list for import API
            const authorsPayload = record.authors.map((name, index) => {
                // Determine if this author is a registered NU researcher
                const matched = researchers.find(r => r.name.toLowerCase() === name.toLowerCase());
                return {
                    name: name,
                    order: index + 1,
                    isCorresponding: record.corresponding_author ? record.corresponding_author.toLowerCase() === name.toLowerCase() : false,
                    isNuAffiliated: matched ? 1 : 0
                };
            });
            
            fetch(`https://iram-backend.tinnakornh.workers.dev/api/publications/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doi: record.doi,
                    title: record.title,
                    journal: record.journal,
                    year: parseInt(record.year, 10) || 0,
                    coverDate: record.coverDate,
                    citations: record.citations,
                    quartile: record.quartile_scopus,
                    quartile_scimago: record.quartile_scimago,
                    status: record.status || "PUBLISHED",
                    authors: authorsPayload,
                    databases: record.databases
                })
            }).then(res => res.json()).then(resData => {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Details';
                if (resData.id) {
                    record.id = resData.id;
                    publications.push(record);
                    renderPublications();
                    showToast("Article added successfully in DB");
                } else {
                    showToast("Failed to add article in DB: " + (resData.error || "Unknown"), "error");
                }
            }).catch(err => {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Details';
                showToast("Failed to add article in DB", "error");
            });
        }
        publicationModal.classList.remove('active');
        renderPublications();
    });

    // Helper to get active filtered and sorted lists
    function getFilteredPublications() {
        const query = searchPublication.value.toLowerCase();
        const yearVal = adminYearFilter ? adminYearFilter.value : 'all';
        const currentYear = new Date().getFullYear();

        let filtered = publications.filter(pub => {
            const matchText = pub.title.toLowerCase().includes(query) ||
                pub.journal.toLowerCase().includes(query) ||
                pub.authors.some(a => a.toLowerCase().includes(query));

            if (!matchText) return false;

            const pubYear = parseInt(pub.year);
            if (isNaN(pubYear)) return yearVal === 'all';

            if (yearVal === 'all') return true;
            if (yearVal === '3y') return pubYear >= (currentYear - 2);
            if (yearVal === '5y') return pubYear >= (currentYear - 4);
            if (yearVal === '10y') return pubYear >= (currentYear - 9);

            return pubYear === parseInt(yearVal);
        });
        return sortPublications(filtered);
    }

    function getFilteredResearchers() {
        const query = searchResearcher.value.toLowerCase();
        const statusVal = adminResStatusFilter ? adminResStatusFilter.value : 'all';
        const deptVal = adminResDeptFilter ? adminResDeptFilter.value : 'all';

        let filtered = researchers.filter(r => {
            const matchText = r.name.toLowerCase().includes(query) ||
                r.author_id.includes(query) ||
                r.department.toLowerCase().includes(query);

            if (!matchText) return false;

            const matchStatus = (statusVal === 'all') || (r.status === statusVal);
            const matchDept = (deptVal === 'all') || (r.department === deptVal);

            return matchStatus && matchDept;
        });
        return sortResearchers(filtered);
    }

    // --- SEARCH & FILTER LISTENERS ---
    searchResearcher.addEventListener('input', renderResearchers);
    searchPublication.addEventListener('input', renderPublications);
    if (adminYearFilter) {
        adminYearFilter.addEventListener('change', renderPublications);
    }
    if (adminResStatusFilter) {
        adminResStatusFilter.addEventListener('change', renderResearchers);
    }
    if (adminResDeptFilter) {
        adminResDeptFilter.addEventListener('change', renderResearchers);
    }

    // --- SORT CLICK EVENT LISTENERS ---
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.getAttribute('data-sec');
            const field = header.getAttribute('data-sort');
            
            if (section === 'publication') {
                if (pubSortField === field) {
                    pubSortDir = pubSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    pubSortField = field;
                    pubSortDir = 'asc';
                }
                // Update sorting icons
                document.querySelectorAll('[data-sec="publication"] i').forEach(icon => {
                    icon.className = "fa-solid fa-sort";
                });
                const icon = header.querySelector('i');
                icon.className = pubSortDir === 'asc' ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
                renderPublications();
            } else if (section === 'researcher') {
                if (resSortField === field) {
                    resSortDir = resSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    resSortField = field;
                    resSortDir = 'asc';
                }
                // Update sorting icons
                document.querySelectorAll('[data-sec="researcher"] i').forEach(icon => {
                    icon.className = "fa-solid fa-sort";
                });
                const icon = header.querySelector('i');
                icon.className = resSortDir === 'asc' ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
                renderResearchers();
            }
        });
    });

    // --- REPORT GENERATION EXPORTS ---
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnExportWord = document.getElementById('btn-export-word');
    const btnExportPdf = document.getElementById('btn-export-pdf');

    // CSV Exporter (uses filtered list)
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            const csvContent = [];
            // Headers
            csvContent.push(["Title", "Authors", "Corresponding Author", "Journal", "Year", "Citations", "Quartile Scopus", "Quartile SCImago", "DOI", "Databases", "Departments"].map(h => `"${h.replace(/"/g, '""')}"`).join(","));
            
            // Rows from filtered lists
            const activePublications = getFilteredPublications();
            activePublications.forEach(pub => {
                csvContent.push([
                    pub.title || "",
                    pub.authors ? pub.authors.join("; ") : "",
                    pub.corresponding_author || "",
                    pub.journal || "",
                    pub.year || "",
                    pub.citations || "0",
                    pub.quartile_scopus || "",
                    pub.quartile_scimago || "",
                    pub.doi || "",
                    pub.databases ? pub.databases.join("; ") : "Scopus",
                    pub.departments ? pub.departments.join("; ") : ""
                ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(","));
            });

            const blob = new Blob(["\ufeff" + csvContent.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `mednu_publications_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("CSV Exported successfully!");
        });
    }

    // Word Exporter (uses filtered list)
    if (btnExportWord) {
        btnExportWord.addEventListener('click', () => {
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const activePublications = getFilteredPublications();
            
            let html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <title>Research Publications Report</title>
                <!--[if gte mso 9]>
                <xml>
                    <w:WordDocument>
                        <w:View>Print</w:View>
                        <w:Zoom>100</w:Zoom>
                    </w:WordDocument>
                </xml>
                <![endif]-->
                <style>
                    body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #333333; }
                    h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; font-size: 20pt; }
                    .meta { font-size: 10pt; color: #666666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 10pt; text-align: left; }
                    th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
                    .title { font-weight: bold; }
                    .authors { font-style: italic; color: #4b5563; }
                </style>
            </head>
            <body>
                <h1>Research Publications Report</h1>
                <div class="meta">
                    <strong>Faculty of Medicine, Naresuan University</strong><br/>
                    Generated on: ${dateStr}<br/>
                    Total Filtered Publications: ${activePublications.length}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%">No.</th>
                            <th style="width: 40%">Title & Authors</th>
                            <th style="width: 25%">Journal</th>
                            <th style="width: 10%">Year</th>
                            <th style="width: 10%">Citations</th>
                            <th style="width: 10%">Quartiles (Scopus/SJR)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            activePublications.forEach((pub, idx) => {
                html += `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>
                                <div class="title">${pub.title}</div>
                                <div class="authors">${pub.authors ? pub.authors.join(', ') : ''}</div>
                            </td>
                            <td>${pub.journal}</td>
                            <td style="text-align: center;">${pub.year}</td>
                            <td style="text-align: center;">${pub.citations}</td>
                            <td style="text-align: center; font-size: 8.5pt;">${pub.quartile_scopus || '-'}/${pub.quartile_scimago || '-'}</td>
                        </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            </body>
            </html>
            `;

            const blob = new Blob(["\ufeff" + html], { type: "application/msword" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `mednu_publications_report_${new Date().toISOString().split('T')[0]}.doc`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Word Report Exported successfully!");
        });
    }

    // PDF / Print Layout Exporter
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            document.querySelector('.main-content').setAttribute('data-date', today);
            window.print();
        });
    }

    // --- RESEARCHERS EXPORT HANDLERS ---
    const btnExportResCsv = document.getElementById('btn-export-res-csv');
    const btnExportResWord = document.getElementById('btn-export-res-word');
    const btnExportResPdf = document.getElementById('btn-export-res-pdf');

    if (btnExportResCsv) {
        btnExportResCsv.addEventListener('click', () => {
            const csvContent = [];
            csvContent.push(["Name", "Scopus Author ID", "Department", "Status"].map(h => `"${h.replace(/"/g, '""')}"`).join(","));
            
            const activeRes = getFilteredResearchers();
            activeRes.forEach(r => {
                csvContent.push([
                    r.name || "",
                    r.author_id || "",
                    r.department || "",
                    r.status || "Active"
                ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(","));
            });

            const blob = new Blob(["\ufeff" + csvContent.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `mednu_researchers_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Researchers CSV Exported successfully!");
        });
    }

    if (btnExportResWord) {
        btnExportResWord.addEventListener('click', () => {
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const activeRes = getFilteredResearchers();
            
            let html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <title>Researchers Directory Report</title>
                <!--[if gte mso 9]>
                <xml>
                    <w:WordDocument>
                        <w:View>Print</w:View>
                        <w:Zoom>100</w:Zoom>
                    </w:WordDocument>
                </xml>
                <![endif]-->
                <style>
                    body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #333333; }
                    h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; font-size: 20pt; }
                    .meta { font-size: 10pt; color: #666666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 10pt; text-align: left; }
                    th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
                    .name { font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Researchers Directory Report</h1>
                <div class="meta">
                    <strong>Faculty of Medicine, Naresuan University</strong><br/>
                    Generated on: ${dateStr}<br/>
                    Total Filtered Researchers: ${activeRes.length}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%">No.</th>
                            <th style="width: 35%">Name</th>
                            <th style="width: 25%">Scopus ID</th>
                            <th style="width: 25%">Department</th>
                            <th style="width: 10%">Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            activeRes.forEach((r, idx) => {
                html += `
                        <tr>
                            <td>${idx + 1}</td>
                            <td class="name">${r.name}</td>
                            <td><code>${r.author_id}</code></td>
                            <td>${r.department}</td>
                            <td style="text-align: center;">${r.status}</td>
                        </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            </body>
            </html>
            `;

            const blob = new Blob(["\ufeff" + html], { type: "application/msword" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `mednu_researchers_report_${new Date().toISOString().split('T')[0]}.doc`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Researchers Word Report Exported successfully!");
        });
    }

    if (btnExportResPdf) {
        btnExportResPdf.addEventListener('click', () => {
            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            document.querySelector('.main-content').setAttribute('data-date', today);
            window.print();
        });
    }

    // Helper to stringify with nice format and preserving thai unicode if any
    function jsonStringifyWithUnicode(obj) {
        return JSON.stringify(obj, null, 2);
    }

    // --- INITIAL DATA LOAD ---
    loadData();
});

