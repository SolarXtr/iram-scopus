document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let database = null;
    let filteredResults = [];
    let facultyResults = [];
    let researchers = [];
    let currentYear = 'last5';
    
    // Pagination state
    let currentPage = 1;
    let itemsPerPage = 25; // Default to 25 as requested
    
    // Sorting state
    let sortField = 'year';
    let sortDirection = 'desc';

    // Charts instances
    let trendChart = null;
    let authorsChart = null;
    let departmentsChart = null;
    let quartileChart = null;
    let scivalCollabChart = null;
    let scivalSubjectsChart = null;
    let scivalTopicsChart = null;

    // DOM Elements
    const navOverview = document.getElementById('nav-overview');
    const navPublications = document.getElementById('nav-publications');
    const navAuthors = document.getElementById('nav-authors');
    
    const secOverview = document.getElementById('overview-section');
    const secPublications = document.getElementById('publications-section');
    const secAuthors = document.getElementById('authors-section');

    const yearFilter = document.getElementById('year-filter');
    const btnRefresh = document.getElementById('btn-refresh-data');
    const retrievedTimeEl = document.getElementById('retrieved-at');
    const dataSourceBadge = document.getElementById('data-source-badge');

    const quartileSourceSelect = document.getElementById('quartile-source-select');
    let activeQuartileSource = 'scimago';

    // KPI Elements
    const kpiTotalDocs = document.getElementById('kpi-total-docs');
    const kpiTotalCitations = document.getElementById('kpi-total-citations');
    const kpiAvgCitations = document.getElementById('kpi-avg-citations');
    const kpiMaxCitations = document.getElementById('kpi-max-citations');
    const kpiMaxCitationsTitle = document.getElementById('kpi-max-citations-title');
    const kpiTopAuthor = document.getElementById('kpi-top-author');
    const kpiTopAuthorCount = document.getElementById('kpi-top-author-count');

    // Search and dynamic contents
    const pubSearchInput = document.getElementById('pub-search');
    const publicationsTbody = document.getElementById('publications-tbody');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const paginationInfo = document.getElementById('pagination-info');
    const pageSizeSelect = document.getElementById('page-size-select');

    const authorSearchInput = document.getElementById('author-search');
    const authorsListGrid = document.getElementById('authors-list-grid');

    // Modal elements
    const researcherModal = document.getElementById('researcher-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalAuthorName = document.getElementById('modal-author-name');
    const modalAuthorDept = document.getElementById('modal-author-dept');
    const modalAvatar = document.getElementById('modal-avatar');
    const modalStatPubs = document.getElementById('modal-stat-pubs');
    const modalStatCitations = document.getElementById('modal-stat-citations');
    const modalStatAvg = document.getElementById('modal-stat-avg');
    const modalPubList = document.getElementById('modal-pub-list');

    // --- NAVIGATION LOGIC ---
    const navItems = [navOverview, navPublications, navAuthors].filter(Boolean);
    const sections = [secOverview, secPublications, secAuthors].filter(Boolean);

    function switchSection(targetId) {
        navItems.forEach(item => {
            if (item.getAttribute('href') === `#${targetId}`) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        sections.forEach(section => {
            if (section.id === `${targetId}-section`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            switchSection(targetId);
        });
    });

    // --- DATA LOADING & INITIALIZATION ---
    async function loadData() {
        try {
            retrievedTimeEl.textContent = 'Loading dataset...';
            const [pubsResponse, resResponse] = await Promise.all([
                fetch('https://iram-backend.tinnakornh.workers.dev/api/publications'),
                fetch('https://iram-backend.tinnakornh.workers.dev/api/researchers')
            ]);
            
            if (!pubsResponse.ok || !resResponse.ok) {
                throw new Error('Failed to fetch data from API');
            }
            
            const pubsData = await pubsResponse.json();
            const researchersData = await resResponse.json();

            // Map backend schema to app.js expected schema
            const mappedResults = pubsData.map(pub => {
                let parsedAuthors = [];
                let authorsRaw = [];
                let corrAuthorStr = null;
                let isFacultyAffiliated = false;
                if (pub.authors) {
                    try {
                        const authorsObjArray = typeof pub.authors === 'string' ? JSON.parse(pub.authors) : pub.authors;
                        if (Array.isArray(authorsObjArray)) {
                            authorsRaw = authorsObjArray;
                            parsedAuthors = authorsObjArray.map(a => typeof a === 'string' ? a : (a.name || ''));
                            const corr = authorsObjArray.find(a => typeof a === 'object' && (a.isCorresponding === 1 || a.isCorresponding === true));
                            if (corr) corrAuthorStr = corr.name;
                            
                            isFacultyAffiliated = authorsObjArray.some(a => typeof a === 'object' && (a.isNuAffiliated === 1 || a.isNuAffiliated === true));
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
                    id: pub.id,
                    title: pub.title || 'Untitled',
                    doi: pub.doi || '',
                    journal: pub.journal || 'Unknown Journal',
                    year: pub.year ? String(parseInt(pub.year, 10)) : 'Unknown Year',
                    coverDate: pub.coverDate || '',
                    quartile_scopus: pub.quartile || '',
                    quartile_scimago: pub.quartile || '',
                    status: pub.status || '',
                    authors: parsedAuthors,
                    authorsRaw: authorsRaw,
                    isFacultyAffiliated: isFacultyAffiliated,
                    creator: parsedAuthors.length > 0 ? parsedAuthors[0] : 'Unknown',
                    citations: pub.citations || 0,
                    corresponding_author: corrAuthorStr || pub.corresponding_author || null,
                    databases: parsedDbs,
                    departments: pub.departments || []
                };
            });

            database = {
                retrieved_at: new Date().toLocaleString(),
                data_source: 'live_api',
                results: mappedResults,
                researchers: researchersData
            };
            
            // UI Indicators update
            retrievedTimeEl.textContent = `Sync: ${database.retrieved_at}`;
            dataSourceBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>DataSource: Live API</span>`;
            dataSourceBadge.style.color = '#14b8a6';

            // Populate Year filter list
            populateYearFilter();
            
            // Run analysis & display
            applyFilter();
        } catch (error) {
            console.error('Error loading application data:', error);
            retrievedTimeEl.textContent = 'Failed to load dataset';
        }
    }

    function populateYearFilter() {
        // Collect years
        const years = new Set(database.results.map(r => r.year).filter(y => y && y !== 'Unknown Year'));
        const sortedYears = Array.from(years).sort((a, b) => b - a); // descending order
        
        // Reset and populate with quick timeframe filters
        yearFilter.innerHTML = `
            <option value="last5" selected>Last 5 Years</option>
            <option value="last3">Last 3 Years</option>
            <option value="last10">Last 10 Years</option>
            <option value="all">All Years</option>
        `;
        yearFilter.value = 'last5';
        
        sortedYears.forEach(year => {
            const opt = document.createElement('option');
            opt.value = year;
            opt.textContent = year;
            yearFilter.appendChild(opt);
        });
    }

    // --- DATA FILTERING ---
    function applyFilter() {
        if (quartileSourceSelect) {
            activeQuartileSource = quartileSourceSelect.value;
        }
        currentYear = yearFilter.value;
        
        // Find maximum year in the dataset to calculate relative ranges dynamically
        const years = database.results.map(r => parseInt(r.year, 10)).filter(y => !isNaN(y));
        const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

        // 1. Filter by year or timeframe range
        filteredResults = database.results.filter(pub => {
            const pubYr = parseInt(pub.year, 10);
            if (currentYear === 'all') {
                return true;
            } else if (currentYear === 'last3') {
                return !isNaN(pubYr) && pubYr >= (maxYear - 2);
            } else if (currentYear === 'last5') {
                return !isNaN(pubYr) && pubYr >= (maxYear - 4);
            } else if (currentYear === 'last10') {
                return !isNaN(pubYr) && pubYr >= (maxYear - 9);
            } else {
                return pub.year === currentYear;
            }
        });

        // Compute KPIs & Charts ONLY for faculty affiliated papers
        facultyResults = filteredResults.filter(pub => pub.isFacultyAffiliated);
        updateOverviewKPIs(facultyResults);
        updateOverviewCharts(facultyResults);

        // 2. Render Publications and Authors with search filters
        renderPublicationsTable();
        renderAuthorsList();
    }

    // Filter Listeners
    if (quartileSourceSelect) {
        quartileSourceSelect.addEventListener('change', () => {
            currentPage = 1;
            applyFilter();
        });
    }

    yearFilter.addEventListener('change', () => {
        currentPage = 1;
        applyFilter();
    });

    pubSearchInput.addEventListener('input', () => {
        currentPage = 1;
        renderPublicationsTable();
    });

    authorSearchInput.addEventListener('input', () => {
        renderAuthorsList();
    });

    btnRefresh.addEventListener('click', () => {
        btnRefresh.disabled = true;
        const icon = btnRefresh.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-arrows-rotate fa-spin';
        const span = btnRefresh.querySelector('span');
        if (span) span.textContent = 'Refreshing...';
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });

    // --- KPI COMPILATION ---
    function updateOverviewKPIs(data) {
        const totalDocs = data.length;
        kpiTotalDocs.textContent = totalDocs.toLocaleString();

        let totalCitations = 0;
        let maxCites = -1;
        let maxCiteTitle = 'N/A';
        let maxCiteDoi = '';

        const authorCounts = {};

        data.forEach(pub => {
            totalCitations += pub.citations;
            
            if (pub.citations > maxCites) {
                maxCites = pub.citations;
                maxCiteTitle = pub.title;
                maxCiteDoi = pub.doi || '';
            }

            // Calculate publications per author (Registered only)
            const registeredNames = new Set(database.researchers.map(r => r.name.trim().toLowerCase()));
            pub.authors.forEach(author => {
                const cleanedAuth = author.trim();
                if (registeredNames.has(cleanedAuth.toLowerCase())) {
                    authorCounts[cleanedAuth] = (authorCounts[cleanedAuth] || 0) + 1;
                }
            });
        });

        kpiTotalCitations.textContent = totalCitations.toLocaleString();
        
        const avg = totalDocs > 0 ? (totalCitations / totalDocs).toFixed(1) : 0;
        kpiAvgCitations.innerHTML = `<i class="fa-solid fa-chart-line"></i> Avg: ${avg} citation${avg != 1 ? 's' : ''} per article`;

        if (maxCites >= 0) {
            kpiMaxCitations.textContent = maxCites.toLocaleString();
            kpiMaxCitationsTitle.textContent = maxCiteTitle;
            kpiMaxCitationsTitle.title = maxCiteTitle;
        } else {
            kpiMaxCitations.textContent = "0";
            kpiMaxCitationsTitle.textContent = "No citations";
        }

        // Find top author
        let topAuthor = 'N/A';
        let topCount = 0;
        for (const [author, count] of Object.entries(authorCounts)) {
            if (count > topCount) {
                topCount = count;
                topAuthor = author;
            }
        }

        kpiTopAuthor.textContent = topAuthor;
        kpiTopAuthorCount.textContent = `${topCount} publication${topCount != 1 ? 's' : ''}`;

        // Quartile distribution calculations
        let q12Count = 0;
        data.forEach(pub => {
            const qVal = activeQuartileSource === 'scopus' ? pub.quartile_scopus : pub.quartile_scimago;
            if (qVal === 'Q1' || qVal === 'Q2') {
                q12Count++;
            }
        });
        const qRate = totalDocs > 0 ? ((q12Count / totalDocs) * 100).toFixed(0) : 0;
        const kpiQRate = document.getElementById('kpi-q-rate');
        const kpiQCount = document.getElementById('kpi-q-count');
        if (kpiQRate) kpiQRate.textContent = `${qRate}%`;
        if (kpiQCount) kpiQCount.textContent = `${q12Count} of ${totalDocs} articles`;
    }

    // --- CHART GENERATION ---
    function updateOverviewCharts(data) {
        // Destroy existing chart instances to avoid overlap/bugs
        if (trendChart) trendChart.destroy();
        if (authorsChart) authorsChart.destroy();
        if (departmentsChart) departmentsChart.destroy();
        if (quartileChart) quartileChart.destroy();
        if (scivalCollabChart) scivalCollabChart.destroy();
        if (scivalSubjectsChart) scivalSubjectsChart.destroy();
        if (scivalTopicsChart) scivalTopicsChart.destroy();

        // 1. Compile publications & citations by year
        const yearStats = {};
        data.forEach(pub => {
            const yr = pub.year;
            if (!yearStats[yr]) {
                yearStats[yr] = { pubs: 0, cites: 0 };
            }
            yearStats[yr].pubs++;
            yearStats[yr].cites += pub.citations;
        });

        const sortedYears = Object.keys(yearStats).sort();
        const pubsData = sortedYears.map(yr => yearStats[yr].pubs);
        const citesData = sortedYears.map(yr => yearStats[yr].cites);

        // Render Trend Chart
        const ctxTrend = document.getElementById('trendChart').getContext('2d');
        
        // Find peak publication year index to highlight
        const maxPubs = Math.max(...pubsData);
        const barColors = pubsData.map(val => val === maxPubs && maxPubs > 0 ? 'rgba(37, 99, 235, 0.95)' : 'rgba(148, 163, 184, 0.4)');
        const barBorderColors = pubsData.map(val => val === maxPubs && maxPubs > 0 ? '#2563eb' : '#94a3b8');

        trendChart = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: sortedYears,
                datasets: [
                    {
                        label: 'Publications (Highlighted Peak)',
                        data: pubsData,
                        backgroundColor: barColors,
                        borderColor: barBorderColors,
                        borderWidth: 1.5,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Citations Trend',
                        data: citesData,
                        type: 'line',
                        borderColor: '#7c3aed',
                        backgroundColor: 'rgba(124, 58, 237, 0.1)',
                        borderWidth: 3.5,
                        tension: 0.3,
                        pointRadius: 5,
                        pointBackgroundColor: '#7c3aed',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#475569' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label.includes('Publications')) {
                                    const isPeak = context.parsed.y === maxPubs;
                                    return `Publications: ${context.parsed.y} ${isPeak ? '★ PEAK YEAR' : ''}`;
                                }
                                return `Citations: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#f1f5f9' },
                        ticks: { color: '#64748b', font: { weight: 'bold' } }
                    },
                    y: {
                        position: 'left',
                        grid: { color: '#e2e8f0' },
                        ticks: { color: '#64748b' },
                        title: { display: true, text: 'Publications count', color: '#64748b' }
                    },
                    y1: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#64748b' },
                        title: { display: true, text: 'Citations count', color: '#64748b' }
                    }
                }
            }
        });

        // 2. Compile Top 10 Authors (Registered only)
        const registeredNames = new Set(database.researchers.map(r => r.name.trim().toLowerCase()));
        const authorCounts = {};
        data.forEach(pub => {
            pub.authors.forEach(auth => {
                const cleanedAuth = auth.trim();
                if (registeredNames.has(cleanedAuth.toLowerCase())) {
                    authorCounts[cleanedAuth] = (authorCounts[cleanedAuth] || 0) + 1;
                }
            });
        });

        const topAuthors = Object.entries(authorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const authorLabels = topAuthors.map(item => item[0]);
        const authorValues = topAuthors.map(item => item[1]);

        // Highlight top 1 researcher, and top 2-3 in a medium shade, others in light neutral gray
        const maxAuthorVal = authorValues[0];
        const authorColors = authorValues.map((val, idx) => {
            if (idx === 0) return 'rgba(13, 148, 136, 0.95)'; // Rank 1: Strong Teal
            if (idx < 3) return 'rgba(13, 148, 136, 0.5)';   // Rank 2-3: Light Teal
            return 'rgba(148, 163, 184, 0.3)';              // Others: Soft Gray
        });
        const authorBorderColors = authorValues.map((val, idx) => {
            if (idx === 0) return '#0d9488';
            if (idx < 3) return 'rgba(13, 148, 136, 0.7)';
            return '#cbd5e1';
        });

        // Render Top Authors Chart
        const ctxAuthors = document.getElementById('authorsChart').getContext('2d');
        authorsChart = new Chart(ctxAuthors, {
            type: 'bar',
            data: {
                labels: authorLabels,
                datasets: [{
                    label: 'Publications',
                    data: authorValues,
                    backgroundColor: authorColors,
                    borderColor: authorBorderColors,
                    borderWidth: 1.5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: '#e2e8f0' },
                        ticks: { color: '#64748b', stepSize: 1 }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#0f172a', font: { weight: '500' } }
                    }
                }
            }
        });

        // 3. Compile Department/Specialty Distribution
        const deptCounts = {};
        data.forEach(pub => {
            if (pub.departments && pub.departments.length > 0) {
                pub.departments.forEach(dept => {
                    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
                });
            } else {
                deptCounts["General Medicine"] = (deptCounts["General Medicine"] || 0) + 1;
            }
        });

        const sortedDepts = Object.entries(deptCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6); // Keep top 6 specialties

        const deptLabels = sortedDepts.map(item => item[0].replace('Department of ', ''));
        const deptValues = sortedDepts.map(item => item[1]);

        // Doughnut Chart colors: First (largest) specialty is highlighted with high saturation, others are muted gradient shades
        const doughnutColors = [
            'rgba(37, 99, 235, 0.95)', // Dominant Specialty: Deep Royal Blue
            'rgba(148, 163, 184, 0.55)', // Rank 2
            'rgba(148, 163, 184, 0.45)', // Rank 3
            'rgba(148, 163, 184, 0.35)', // Rank 4
            'rgba(148, 163, 184, 0.25)', // Rank 5
            'rgba(148, 163, 184, 0.15)'  // Rank 6
        ];

        // Render Doughnut chart
        const ctxDepts = document.getElementById('departmentsChart').getContext('2d');
        departmentsChart = new Chart(ctxDepts, {
            type: 'doughnut',
            data: {
                labels: deptLabels,
                datasets: [{
                    data: deptValues,
                    backgroundColor: doughnutColors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#475569', boxWidth: 12, padding: 10 }
                    }
                }
            }
        });

        // --- SCIVAL CHART 1: Geographical Collaboration & FWCI ---
        const ctxScivalCollab = document.getElementById('scivalCollabChart').getContext('2d');
        scivalCollabChart = new Chart(ctxScivalCollab, {
            type: 'bar',
            data: {
                labels: ['International', 'National Only', 'Institutional Only', 'Single Author'],
                datasets: [
                    {
                        label: 'Publications count',
                        data: [97, 137, 103, 6],
                        backgroundColor: 'rgba(37, 99, 235, 0.85)',
                        borderColor: '#2563eb',
                        borderWidth: 1.5,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Citation Impact (FWCI)',
                        data: [1.21, 0.59, 0.35, 0.39],
                        type: 'line',
                        borderColor: '#ea580c',
                        backgroundColor: 'rgba(234, 88, 12, 0.1)',
                        borderWidth: 3.5,
                        tension: 0.3,
                        pointRadius: 5,
                        pointBackgroundColor: '#ea580c',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#475569', boxWidth: 12 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.label.includes('FWCI')) {
                                    return `FWCI: ${context.parsed.y} (${context.parsed.y >= 1.0 ? 'Above' : 'Below'} World Average)`;
                                }
                                return `Publications: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { weight: 'bold' } }
                    },
                    y: {
                        position: 'left',
                        grid: { color: '#e2e8f0' },
                        ticks: { color: '#64748b' },
                        title: { display: true, text: 'Publications', color: '#64748b' }
                    },
                    y1: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#64748b' },
                        title: { display: true, text: 'FWCI (World Avg = 1.0)', color: '#ea580c' },
                        min: 0,
                        max: 2.0
                    }
                }
            }
        });

        // --- SCIVAL CHART 2: Publication Share by Subject Area ---
        const ctxScivalSubjects = document.getElementById('scivalSubjectsChart').getContext('2d');
        scivalSubjectsChart = new Chart(ctxScivalSubjects, {
            type: 'doughnut',
            data: {
                labels: ['Medicine', 'Biochemistry & Genetics', 'Multidisciplinary', 'Pharmacology & Toxicology', 'Immunology & Microbiology', 'Other Fields'],
                datasets: [{
                    data: [78.4, 11.7, 7.9, 7.6, 5.3, 20.4],
                    backgroundColor: [
                        '#e11d48', // Medicine - Vibrant red
                        '#0284c7', // Biochem - Blue
                        '#4f46e5', // Multidisciplinary - Indigo
                        '#0d9488', // Pharm - Teal
                        '#b91c1c', // Immunology - Dark Red
                        '#cbd5e1'  // Other - Gray
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#475569', boxWidth: 10, padding: 8 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.parsed}% of output`;
                            }
                        }
                    }
                }
            }
        });

        // --- SCIVAL CHART 3: Top Research Topics by Publications ---
        const ctxScivalTopics = document.getElementById('scivalTopicsChart').getContext('2d');
        scivalTopicsChart = new Chart(ctxScivalTopics, {
            type: 'bar',
            data: {
                labels: [
                    'Enhanced Pain Management (Knee)',
                    'Tendinopathy in Athletes',
                    'T Cell Receptor Signal Transduction',
                    'Calotropis Procera Extracts',
                    'RSV Dynamics and Prevention'
                ],
                datasets: [{
                    label: 'Publications',
                    data: [9, 5, 5, 5, 4],
                    backgroundColor: 'rgba(13, 148, 136, 0.85)',
                    borderColor: '#0d9488',
                    borderWidth: 1.5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                const index = context[0].dataIndex;
                                const percentiles = ['91.6%', '95.8%', '93.8%', '68.3%', '99.5%'];
                                const fwcistats = ['0.69', '0.29', '0.25', '0.54', '0.73'];
                                return `Prominence Percentile: ${percentiles[index]}\nTopic FWCI: ${fwcistats[index]}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#e2e8f0' },
                        ticks: { color: '#64748b', stepSize: 1 }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#0f172a', font: { weight: '500' } }
                    }
                }
            }
        });
    }

    // --- PUBLICATIONS TABLE RENDERING & PAGINATION ---
    function renderPublicationsTable() {
        const searchText = pubSearchInput.value.toLowerCase();
        
        // Apply search filter on top of faculty-filtered results
        const searchFiltered = facultyResults.filter(pub => {
            return (
                pub.title.toLowerCase().includes(searchText) ||
                pub.creator.toLowerCase().includes(searchText) ||
                pub.journal.toLowerCase().includes(searchText) ||
                pub.authors.some(auth => auth.toLowerCase().includes(searchText))
            );
        });

        // Apply sorting
        searchFiltered.sort((a, b) => {
            let valA, valB;
            if (sortField === 'title') {
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
            } else if (sortField === 'author') {
                valA = a.creator.toLowerCase();
                valB = b.creator.toLowerCase();
            } else if (sortField === 'journal') {
                valA = a.journal.toLowerCase();
                valB = b.journal.toLowerCase();
            } else if (sortField === 'year') {
                valA = parseInt(a.year, 10) || 0;
                valB = parseInt(b.year, 10) || 0;
            } else if (sortField === 'citations') {
                valA = a.citations;
                valB = b.citations;
            } else if (sortField === 'quartile') {
                valA = (activeQuartileSource === 'scopus' ? a.quartile_scopus : a.quartile_scimago) || 'Q9';
                valB = (activeQuartileSource === 'scopus' ? b.quartile_scopus : b.quartile_scimago) || 'Q9';
            }
            
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Update the visual sorting icons in the headers
        updateSortIcons();

        const totalItems = searchFiltered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        if (currentPage > totalPages) currentPage = totalPages;

        // Slice for current page pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const pageItems = searchFiltered.slice(startIndex, endIndex);

        // Update pagination buttons state
        btnPrev.disabled = (currentPage === 1);
        btnNext.disabled = (currentPage === totalPages || totalItems === 0);
        
        if (totalItems > 0) {
            paginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;
        } else {
            paginationInfo.textContent = `No matches found`;
        }

        // Render Table Body Rows
        publicationsTbody.innerHTML = '';
        if (pageItems.length === 0) {
            publicationsTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                        <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 1rem; display: block;"></i>
                        No publication data matches search parameters
                    </td>
                </tr>`;
            return;
        }

        pageItems.forEach(pub => {
            const tr = document.createElement('tr');
            
            // Helper function to format full names or other variations to "Lastname, F."
            const formatAuthorName = (name) => {
                if (!name) return '';
                name = name.trim();
                if (name.includes(',')) return name;
                
                const parts = name.split(/\s+/);
                if (parts.length === 2) {
                    const first = parts[0];
                    const second = parts[1];
                    // If second part is initials (e.g. S. or S)
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

            // Helper function for robust corresponding author matching
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
                
                // Extract surnames (long tokens) and initials (short tokens)
                const aSurnames = aTokens.filter(t => t.length > 2);
                const cSurnames = cTokens.filter(t => t.length > 2);
                const aInits = aTokens.filter(t => t.length <= 2).map(t => t[0]);
                const cInits = cTokens.filter(t => t.length <= 2).map(t => t[0]);
                
                // Must share at least one surname
                const sharedSurname = aSurnames.some(a => cSurnames.includes(a));
                if (!sharedSurname) return false;
                
                // If both have initials, they must match
                if (aInits.length > 0 && cInits.length > 0) {
                    return aInits.some(ai => cInits.includes(ai));
                }
                
                // If one has initials and other has full names, check initial vs first char
                if (aInits.length > 0 && cSurnames.length > 0) {
                    return cSurnames.some(cs => aInits.includes(cs[0]));
                }
                if (cInits.length > 0 && aSurnames.length > 0) {
                    return aSurnames.some(as => cInits.includes(as[0]));
                }
                
                // Both have full names with shared surname
                return true;
            };

            const matchResearcher = (authorName, researchers) => {
                if (!authorName) return null;
                const clean = authorName.toLowerCase()
                    .replace(/,/g, ' ')
                    .replace(/\./g, ' ')
                    .replace(/[^a-z\s-]/g, '')
                    .trim();
                const authTokens = clean.split(/\s+/).filter(t => t.length > 0);
                if (authTokens.length === 0) return null;
                
                // Separate surname-like tokens (len > 2) from initials (len <= 2)
                const authSurnames = authTokens.filter(t => t.length > 2);
                const authInits = authTokens.filter(t => t.length <= 2).map(t => t[0]);
                
                let bestMatch = null;
                
                for (let r of researchers) {
                    const rClean = r.name.toLowerCase().replace(/[^a-z\s-]/g, '').trim();
                    const rTokens = rClean.split(/\s+/).filter(t => t.length > 0);
                    if (rTokens.length < 2) continue;
                    
                    // For researchers.json, names are "Firstname Lastname" format
                    const rFirst = rTokens[0];          // e.g. "worawan"
                    const rLast = rTokens[rTokens.length - 1]; // e.g. "jittham"
                    
                    // The author's surname tokens must include the researcher's last name
                    if (!authSurnames.includes(rLast)) continue;
                    
                    // Now verify initials: the author's initial must match researcher's first name initial
                    if (authInits.length > 0) {
                        if (authInits.includes(rFirst[0])) {
                            return r; // Strong match: surname + initial
                        }
                        // Initials don't match this researcher, skip
                        continue;
                    }
                    
                    // No initials in author name - check if full first name matches
                    if (authSurnames.includes(rFirst)) {
                        return r; // Full name match
                    }
                    
                    // Surname matches but no initial to verify - weak match, save as fallback
                    if (!bestMatch) bestMatch = r;
                }
                
                return bestMatch;
            };

            const formatAuthorsWithEtAl = (authors, correspondingAuthor) => {
                if (!authors || authors.length === 0) return '';
                const formatName = (name) => formatAuthorName(name);

                if (authors.length < 4) {
                    return authors.map(author => {
                        const isCorresponding = correspondingAuthor && (
                            author.trim().toLowerCase() === correspondingAuthor.trim().toLowerCase() ||
                            isCorrespondingAuthor(author, correspondingAuthor)
                        );
                        const formattedName = formatName(author);
                        if (isCorresponding) {
                            return `<strong>${formattedName}</strong> <i class="fa-regular fa-envelope" title="Corresponding Author" style="color: var(--accent-purple); cursor: help;" class="corresponding-icon"></i>`;
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
                    ? `<strong>${formatName(firstAuthor)}</strong> <i class="fa-regular fa-envelope" title="Corresponding Author" style="color: var(--accent-purple); cursor: help;" class="corresponding-icon"></i>` 
                    : formatName(firstAuthor);

                if (corrAuthor) {
                    const corrDisplay = `<strong>${formatName(corrAuthor)}</strong> <i class="fa-regular fa-envelope" title="Corresponding Author" style="color: var(--accent-purple); cursor: help;" class="corresponding-icon"></i>`;
                    return `${firstDisplay}, ${corrDisplay}, et al.`;
                }

                return `${firstDisplay}, et al.`;
            };

            // Format author tag display using et al. logic
            const formattedAuthors = formatAuthorsWithEtAl(pub.authors, pub.corresponding_author);
            
            const scopusUrl = pub.doi 
                ? `https://www.scopus.com/results/results.uri?sot=b&sct=f&sl=20&s=DOI%28${encodeURIComponent(pub.doi)}%29` 
                : `https://www.scopus.com/results/results.uri?sot=b&sct=f&sl=20&s=TITLE%28${encodeURIComponent(pub.title)}%29`;

            const doiSection = pub.doi ? `
                <a href="https://doi.org/${pub.doi}" target="_blank" class="doi-badge">
                    <i class="fa-solid fa-link"></i> DOI: ${pub.doi}
                </a>` : '';

            // Generate database source badges
            const dbList = pub.databases || ["Scopus"];
            const dbBadgesHtml = dbList.map(db => {
                const cleanDb = db.trim();
                let icon = "fa-solid fa-graduation-cap";
                let badgeClass = "db-badge-scopus";
                if (cleanDb.toLowerCase() === "pubmed") {
                    icon = "fa-solid fa-notes-medical";
                    badgeClass = "db-badge-pubmed";
                } else if (cleanDb.toLowerCase() === "wos" || cleanDb.toLowerCase() === "web of science") {
                    icon = "fa-solid fa-book";
                    badgeClass = "db-badge-wos";
                }
                return `<span class="db-badge ${badgeClass}"><i class="${icon}" style="font-size: 0.65rem;"></i> ${cleanDb}</span>`;
            }).join('');

            // Compute Faculty of Medicine researchers with superscript numbers
            const nuResearchers = [];
            const activeResList = database.researchers.filter(r => r.status === "Active" || !r.status);
            
            if (pub.authorsRaw && pub.authorsRaw.length > 0) {
                pub.authorsRaw.forEach((rawAuth, index) => {
                    if (typeof rawAuth !== 'object' || !rawAuth.name) return;
                    const matchedRes = matchResearcher(rawAuth.name, activeResList);
                    if (matchedRes) {
                        const displayName = matchedRes.name;
                        const formattedDisplay = formatAuthorName(displayName);
                        const isAff = (rawAuth.isNuAffiliated === 1 || rawAuth.isNuAffiliated === true);
                        if (isAff) {
                            nuResearchers.push(`<span class="researcher-tag-item" style="font-weight: 500; font-size: 0.85rem; color: var(--text-primary);">${formattedDisplay}<sup>${index + 1}</sup></span>`);
                        } else {
                            nuResearchers.push(`<span class="researcher-tag-item" title="Non-NU Affiliation for this paper" style="font-weight: 400; font-size: 0.85rem; color: var(--text-muted); opacity: 0.6;">${formattedDisplay}*<sup>${index + 1}</sup></span>`);
                        }
                    }
                });
            } else {
                pub.authors.forEach((author, index) => {
                    const matchedRes = matchResearcher(author, activeResList);
                    if (matchedRes) {
                        const displayName = matchedRes.name;
                        const formattedDisplay = formatAuthorName(displayName);
                        nuResearchers.push(`<span class="researcher-tag-item" style="font-weight: 500; font-size: 0.85rem; color: var(--text-primary);">${formattedDisplay}<sup>${index + 1}</sup></span>`);
                    }
                });
            }
            const researcherContent = nuResearchers.length > 0 
                ? nuResearchers.join(', ') 
                : `<span style="color: var(--text-muted); font-style: italic;">-</span>`;

            const qVal = activeQuartileSource === 'scopus' ? pub.quartile_scopus : pub.quartile_scimago;
            const qScopus = pub.quartile_scopus || 'N/A';
            const qScimago = pub.quartile_scimago || 'N/A';
            
            let qBadgeColor = 'var(--text-muted)';
            let qBgColor = 'rgba(148, 163, 184, 0.1)';
            let qBorderColor = 'rgba(148, 163, 184, 0.2)';
            
            if (qVal === 'Q1') {
                qBadgeColor = '#0d9488';
                qBgColor = 'rgba(13, 148, 136, 0.1)';
                qBorderColor = 'rgba(13, 148, 136, 0.2)';
            } else if (qVal === 'Q2') {
                qBadgeColor = '#2563eb';
                qBgColor = 'rgba(37, 99, 235, 0.1)';
                qBorderColor = 'rgba(37, 99, 235, 0.2)';
            } else if (qVal === 'Q3') {
                qBadgeColor = '#d97706';
                qBgColor = 'rgba(217, 119, 6, 0.1)';
                qBorderColor = 'rgba(217, 119, 6, 0.2)';
            } else if (qVal === 'Q4') {
                qBadgeColor = '#ef4444';
                qBgColor = 'rgba(239, 68, 68, 0.1)';
                qBorderColor = 'rgba(239, 68, 68, 0.2)';
            }
            
            let evalYear = parseInt(pub.year);
            if (!isNaN(evalYear)) {
                evalYear = Math.min(evalYear, 2024); // Assume max evaluation year available is 2024
            }
            
            const isNa = (!qVal || qVal === 'N/A' || qVal === 'Unknown');
            const qDisplay = !isNa && !isNaN(evalYear) ? `${qVal} (${evalYear})` : (isNa ? 'N/A' : qVal);
            const tooltipText = `Scopus: ${qScopus} | SCImago: ${qScimago}`;

            tr.innerHTML = `
                <td>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                        <div>
                            <a href="${scopusUrl}" target="_blank" class="title-link" style="margin-bottom: 0; display: inline; font-size: 0.95rem; font-weight: 600;" title="View on Scopus">${pub.title}</a>
                        </div>
                        <div class="article-authors" style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                            ${formattedAuthors}
                        </div>
                        <div style="display: flex; align-items: center; flex-wrap: wrap;">
                            ${doiSection}
                            <div class="db-badges">
                                ${dbBadgesHtml}
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="researcher-tags" style="font-size: 0.85rem; line-height: 1.4;">
                        ${researcherContent}
                    </div>
                </td>
                <td>
                    <div class="text-truncate" style="font-size: 0.85rem;" title="${pub.journal}">
                        ${pub.journal}
                    </div>
                </td>
                <td style="text-align: center; font-weight: 600;">${pub.year}</td>
                <td style="text-align: center;">
                    <span class="badge badge-citation" style="background: rgba(139, 92, 246, 0.15); color: var(--accent-purple); padding: 0.35rem 0.6rem; border-radius: 6px; font-weight: bold; border: 1px solid rgba(139, 92, 246, 0.25);">
                        ${pub.citations}
                    </span>
                </td>
                <td style="text-align: center;">
                    <span class="badge badge-quartile" style="background: ${qBgColor}; color: ${qBadgeColor}; padding: 0.35rem 0.6rem; border-radius: 6px; font-weight: bold; border: 1px solid ${qBorderColor}; cursor: help;" title="${tooltipText}">
                        ${qDisplay}
                    </span>
                </td>
            `;
            publicationsTbody.appendChild(tr);
        });
    }

    // Pagination Listeners
    btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPublicationsTable();
        }
    });

    btnNext.addEventListener('click', () => {
        const totalItems = filteredResults.filter(pub => {
            const searchText = pubSearchInput.value.toLowerCase();
            return (
                pub.title.toLowerCase().includes(searchText) ||
                pub.creator.toLowerCase().includes(searchText) ||
                pub.journal.toLowerCase().includes(searchText) ||
                pub.authors.some(auth => auth.toLowerCase().includes(searchText))
            );
        }).length;
        
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPublicationsTable();
        }
    });

    // --- RESEARCHERS CARDS LIST ---
    function renderAuthorsList() {
        const searchText = authorSearchInput.value.toLowerCase();
        
        // Compile author stats (Registered only)
        const activeResearchers = database.researchers.filter(r => r.status === "Active" || !r.status);
        const registeredNames = new Set(activeResearchers.map(r => r.name.trim().toLowerCase()));
        const authorStats = {};
        
        filteredResults.forEach(pub => {
            if (!pub.authorsRaw) return;
            pub.authorsRaw.forEach(rawAuth => {
                if (typeof rawAuth !== 'object' || !rawAuth.name) return;
                const cleanedAuth = rawAuth.name.trim();
                
                if (registeredNames.has(cleanedAuth.toLowerCase())) {
                    const regInfo = database.researchers.find(r => r.name.trim().toLowerCase() === cleanedAuth.toLowerCase());
                    const deptName = regInfo ? regInfo.department : (pub.departments ? pub.departments[0] : "Faculty of Medicine");
                    
                    if (!authorStats[cleanedAuth]) {
                        authorStats[cleanedAuth] = {
                            name: cleanedAuth,
                            pubs: 0,
                            citations: 0,
                            citationsList: [],
                            journals: new Set(),
                            department: deptName
                        };
                    }
                    
                    // Only count towards their KPIs if they were affiliated at the time of publication
                    if (rawAuth.isNuAffiliated === 1 || rawAuth.isNuAffiliated === true) {
                        authorStats[cleanedAuth].pubs++;
                        authorStats[cleanedAuth].citations += (pub.citations || 0);
                        authorStats[cleanedAuth].citationsList.push(pub.citations || 0);
                        authorStats[cleanedAuth].journals.add(pub.journal);
                    }
                }
            });
        });

        // Filter and sort authors
        const sortedAuthors = Object.values(authorStats)
            .filter(author => author.name.toLowerCase().includes(searchText))
            .sort((a, b) => b.pubs - a.pubs);

        authorsListGrid.innerHTML = '';
        
        if (sortedAuthors.length === 0) {
            authorsListGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem;">
                    <i class="fa-solid fa-users-slash" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    No researchers found matching search text.
                </div>`;
            return;
        }        sortedAuthors.forEach(author => {
            const card = document.createElement('div');
            card.className = 'author-card';
            
            // Get initials
            const initials = author.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Find registry info for orcid
            const regInfo = database.researchers.find(r => r.name.trim().toLowerCase() === author.name.toLowerCase());
            const orcidUrl = (regInfo && regInfo.orcid) 
                ? `https://orcid.org/${regInfo.orcid}`
                : `https://orcid.org/orcid-search/search?searchQuery=${encodeURIComponent(author.name)}`;

            card.innerHTML = `
                <div class="author-card-header">
                    <div class="author-avatar">${initials}</div>
                    <div class="author-info">
                        <h4>${author.name}</h4>
                        <p>${author.department}</p>
                        <div style="margin-top: 0.3rem;">
                            <a href="${orcidUrl}" target="_blank" class="orcid-link" style="color: #a6ce39; font-size: 0.8rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem; z-index: 10;">
                                <i class="fa-brands fa-orcid" style="font-size: 0.95rem;"></i> ORCID Profile
                            </a>
                        </div>
                    </div>
                </div>
                <div class="author-stats">
                    <div class="author-stat-item">
                        <span class="author-stat-label">Publications</span>
                        <span class="author-stat-value">${author.pubs}</span>
                    </div>
                    <div class="author-stat-item">
                        <span class="author-stat-label">h-index</span>
                        <span class="author-stat-value" style="color: #ea580c;">${calculateHIndex(author.citationsList)}</span>
                    </div>
                    <div class="author-stat-item">
                        <span class="author-stat-label">Total Citations</span>
                        <span class="author-stat-value" style="color: var(--accent-purple);">${author.citations}</span>
                    </div>
                </div>
            `;
            
            // Add Click listener to show modal profile detail
            card.addEventListener('click', () => {
                showResearcherModal(author.name, author.department);
            });

            // Prevent modal popup when clicking the ORCID link
            const orcidLink = card.querySelector('.orcid-link');
            if (orcidLink) {
                orcidLink.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            authorsListGrid.appendChild(card);
        });
    }

    // --- MODAL & PAGE SIZE LOGIC ---
    // Modal Close handlers
    modalCloseBtn.addEventListener('click', () => {
        researcherModal.classList.remove('active');
    });

    researcherModal.addEventListener('click', (e) => {
        if (e.target === researcherModal) {
            researcherModal.classList.remove('active');
        }
    });

    function calculateHIndex(citationsArray) {
        if (!citationsArray || citationsArray.length === 0) return 0;
        const sorted = [...citationsArray].sort((a, b) => b - a);
        let hIndex = 0;
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] >= i + 1) {
                hIndex = i + 1;
            } else {
                break;
            }
        }
        return hIndex;
    }

    // Function to render researcher detail profile inside modal
    function showResearcherModal(authorName, authorDept) {
        // Filter publications belonging to this author
        const allAuthorPapers = database.results.filter(pub => 
            pub.authors.some(auth => auth.trim().toLowerCase() === authorName.trim().toLowerCase())
        );

        // Separate affiliated vs non-affiliated
        const affiliatedPapers = [];
        const nonAffiliatedPapers = [];
        
        allAuthorPapers.forEach(pub => {
            let isAff = false;
            if (pub.authorsRaw) {
                const rawMatch = pub.authorsRaw.find(a => typeof a === 'object' && a.name && a.name.trim().toLowerCase() === authorName.trim().toLowerCase());
                if (rawMatch && (rawMatch.isNuAffiliated === 1 || rawMatch.isNuAffiliated === true)) {
                    isAff = true;
                }
            }
            if (isAff) affiliatedPapers.push(pub);
            else nonAffiliatedPapers.push(pub);
        });

        // Compute stats ONLY from affiliated papers
        const totalCites = affiliatedPapers.reduce((sum, pub) => sum + (pub.citations || 0), 0);
        const avgCites = affiliatedPapers.length > 0 ? (totalCites / affiliatedPapers.length).toFixed(1) : 0;
        const citationsList = affiliatedPapers.map(p => p.citations || 0);
        const hIndex = calculateHIndex(citationsList);

        // Set Profile details
        modalAuthorName.textContent = authorName;
        modalAuthorDept.textContent = authorDept;
        modalAvatar.textContent = authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        modalStatPubs.textContent = affiliatedPapers.length;
        document.getElementById('modal-stat-hindex').textContent = hIndex;
        modalStatCitations.textContent = totalCites.toLocaleString();
        modalStatAvg.textContent = avgCites;

        // Populate publication list inside modal (showing all)
        modalPubList.innerHTML = '';
        if (allAuthorPapers.length === 0) {
            modalPubList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No publications recorded.</div>';
        } else {
            allAuthorPapers.forEach(paper => {
                const isNonAff = nonAffiliatedPapers.includes(paper);
                const item = document.createElement('div');
                item.className = 'modal-pub-item';
                if (isNonAff) {
                    item.style.opacity = '0.7';
                }
                
                const doiLink = paper.doi ? `
                    <a href="https://doi.org/${paper.doi}" target="_blank" class="doi-badge" style="margin-top: 0.4rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                        <i class="fa-solid fa-link"></i> DOI: ${paper.doi}
                    </a>` : '';

                const nonAffBadge = isNonAff ? `<span style="font-size: 0.75rem; color: #dc2626; background: rgba(220, 38, 38, 0.1); padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> ผลงานช่วงที่ไม่ได้สังกัดคณะแพทยฯ</span>` : '';

                item.innerHTML = `
                    <div class="modal-pub-title">${paper.title}${nonAffBadge}</div>
                    <div class="modal-pub-meta">
                        <span><i class="fa-regular fa-folder-open"></i> ${paper.journal} (${paper.year})</span>
                        <span style="font-weight: 600; color: var(--accent-purple);"><i class="fa-solid fa-quote-right" style="font-size:0.75rem;"></i> Citations: ${paper.citations}</span>
                    </div>
                    ${doiLink}
                `;
                modalPubList.appendChild(item);
            });
        }

        // Show Modal
        researcherModal.classList.add('active');
    }

    // Page Size Selector Listener
    pageSizeSelect.addEventListener('change', () => {
        const val = pageSizeSelect.value;
        if (val === 'all') {
            itemsPerPage = filteredResults.length || 1;
        } else {
            itemsPerPage = parseInt(val, 10);
        }
        currentPage = 1;
        renderPublicationsTable();
    });

    // Function to update visual sorting icons in the headers
    function updateSortIcons() {
        const headers = {
            'title': document.getElementById('th-title'),
            'author': document.getElementById('th-author'),
            'journal': document.getElementById('th-journal'),
            'year': document.getElementById('th-year'),
            'citations': document.getElementById('th-citations'),
            'quartile': document.getElementById('th-quartile')
        };
        
        for (const [field, el] of Object.entries(headers)) {
            if (!el) continue;
            const icon = el.querySelector('i');
            if (!icon) continue;
            
            if (field === sortField) {
                icon.className = sortDirection === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                icon.style.opacity = '1';
            } else {
                icon.className = 'fa-solid fa-sort';
                icon.style.opacity = '0.4';
            }
        }
    }

    // Header Sort Event Listeners
    function handleHeaderClick(field) {
        if (sortField === field) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = field;
            sortDirection = (field === 'year' || field === 'citations') ? 'desc' : 'asc';
        }
        currentPage = 1;
        renderPublicationsTable();
    }

    const thTitle = document.getElementById('th-title');
    const thAuthor = document.getElementById('th-author');
    const thJournal = document.getElementById('th-journal');
    const thYear = document.getElementById('th-year');
    const thCitations = document.getElementById('th-citations');
    const thQuartile = document.getElementById('th-quartile');

    if (thTitle) thTitle.addEventListener('click', () => handleHeaderClick('title'));
    if (thAuthor) thAuthor.addEventListener('click', () => handleHeaderClick('author'));
    if (thJournal) thJournal.addEventListener('click', () => handleHeaderClick('journal'));
    if (thYear) thYear.addEventListener('click', () => handleHeaderClick('year'));
    if (thCitations) thCitations.addEventListener('click', () => handleHeaderClick('citations'));
    if (thQuartile) thQuartile.addEventListener('click', () => handleHeaderClick('quartile'));

    // --- INITIAL BOOTSTRAP ---
    loadData();
});

