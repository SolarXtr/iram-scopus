document.addEventListener('DOMContentLoaded', () => {
    // App State
    let database = null;
    let filteredResults = [];
    let currentYear = 'all';
    let activeQuartileSource = 'scimago';
    let sortField = 'year';
    let sortDirection = 'desc';

    // DOM Elements
    const reportQuartileSelect = document.getElementById('report-quartile-select');
    const reportYearSelect = document.getElementById('report-year-select');
    const btnExportMatrix = document.getElementById('btn-export-matrix');
    const matrixTbody = document.getElementById('matrix-tbody');
    const retrievedTimeEl = document.getElementById('retrieved-at');
    const dataSourceBadge = document.getElementById('data-source-badge');

    // Summary Elements
    const sumCount = document.getElementById('sum-count');
    const sumCitedBy = document.getElementById('sum-cited-by');
    const sumCite2022 = document.getElementById('sum-cite-2022');
    const sumCite2023 = document.getElementById('sum-cite-2023');
    const sumCite2024 = document.getElementById('sum-cite-2024');
    const sumCite2025 = document.getElementById('sum-cite-2025');
    const sumCite2026 = document.getElementById('sum-cite-2026');
    const sumCiteSubtotal = document.getElementById('sum-cite-subtotal');
    const sumPublished = document.getElementById('sum-published');
    const sumQ1 = document.getElementById('sum-q1');
    const sumQ2 = document.getElementById('sum-q2');
    const sumQ3 = document.getElementById('sum-q3');
    const sumQ4 = document.getElementById('sum-q4');

    // --- DATA LOADING ---
    async function loadData() {
        try {
            retrievedTimeEl.textContent = 'Loading dataset...';
            const response = await fetch('https://iram-backend.tinnakornh.workers.dev/api/publications');
            if (!response.ok) throw new Error('Failed to fetch dataset');
            
            database = await response.json();
            
            // Sync indicators
            retrievedTimeEl.textContent = `Sync: ${new Date().toLocaleString()}`;
            if (false) {
                dataSourceBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>DataSource: Sandbox Mode</span>`;
                dataSourceBadge.style.color = '#eab308';
            } else {
                dataSourceBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>DataSource: Scopus API</span>`;
                dataSourceBadge.style.color = '#14b8a6';
            }

            populateYearFilter();
            applyFilter();
        } catch (error) {
            console.error('Error loading report data:', error);
            retrievedTimeEl.textContent = 'Failed to load dataset';
        }
    }

    function populateYearFilter() {
        const years = new Set(database.map(r => r.year).filter(y => y && y !== 'Unknown Year'));
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        
        reportYearSelect.innerHTML = `
            <option value="last5">Last 5 Years</option>
            <option value="last3">Last 3 Years</option>
            <option value="all">All Years</option>
        `;
        sortedYears.forEach(year => {
            const opt = document.createElement('option');
            opt.value = year;
            opt.textContent = year;
            reportYearSelect.appendChild(opt);
        });

        // Set default filter to last 5 years
        reportYearSelect.value = 'last5';
        currentYear = 'last5';
    }

    // --- HELPER METRIC TRANSLATORS ---
    function isCorrespondingAuthor(authorName, correspondingName) {
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
    }

    function formatAuthorName(name) {
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
    }

    function formatFirstAndCorresponding(authors, correspondingAuthor) {
        if (!authors || authors.length === 0) return '-';
        
        const first = authors[0];
        const isFirstCorr = correspondingAuthor && (
            first.trim().toLowerCase() === correspondingAuthor.trim().toLowerCase() ||
            isCorrespondingAuthor(first, correspondingAuthor)
        );
        
        if (isFirstCorr) {
            return `<strong>${formatAuthorName(first)}</strong> <i class="fa-regular fa-envelope" title="First & Corresponding Author" style="color: var(--accent-purple); cursor: help;"></i>`;
        }
        
        if (correspondingAuthor) {
            const corrMatched = authors.find(auth => auth.trim().toLowerCase() === correspondingAuthor.trim().toLowerCase() || isCorrespondingAuthor(auth, correspondingAuthor));
            const corrName = corrMatched ? corrMatched : correspondingAuthor;
            return `${formatAuthorName(first)} (First), <strong>${formatAuthorName(corrName)}</strong> <i class="fa-regular fa-envelope" title="Corresponding Author" style="color: var(--accent-purple); cursor: help;"></i>`;
        }
        
        return `${formatAuthorName(first)} (First)`;
    }

    function formatFirstAndCorrespondingText(authors, correspondingAuthor) {
        if (!authors || authors.length === 0) return '-';
        
        const first = authors[0];
        const isFirstCorr = correspondingAuthor && (
            first.trim().toLowerCase() === correspondingAuthor.trim().toLowerCase() ||
            isCorrespondingAuthor(first, correspondingAuthor)
        );
        
        if (isFirstCorr) {
            return `${formatAuthorName(first)} (First & Corresponding)`;
        }
        
        if (correspondingAuthor) {
            const corrMatched = authors.find(auth => auth.trim().toLowerCase() === correspondingAuthor.trim().toLowerCase() || isCorrespondingAuthor(auth, correspondingAuthor));
            const corrName = corrMatched ? corrMatched : correspondingAuthor;
            return `${formatAuthorName(first)} (First), ${formatAuthorName(corrName)} (Corresponding)`;
        }
        
        return `${formatAuthorName(first)} (First)`;
    }

    function formatSourceTitle(pub) {
        let text = pub.journal || 'Unknown Source';
        const parts = [];
        if (pub.volume) parts.push(`Vol. ${pub.volume}`);
        if (pub.issue) parts.push(`No. ${pub.issue}`);
        if (pub.art_no) parts.push(`Art. No. ${pub.art_no}`);
        if (pub.page_start || pub.page_end) {
            const pages = [];
            if (pub.page_start) pages.push(pub.page_start);
            if (pub.page_end) pages.push(pub.page_end);
            parts.push(`pp. ${pages.join('-')}`);
        }
        if (parts.length > 0) {
            text += `, ${parts.join(', ')}`;
        }
        return text;
    }

    function formatPublishDate(coverDate, year) {
        if (!coverDate || coverDate === "Unknown Date") {
            return year ? `Yr ${year}` : '-';
        }
        const parts = coverDate.split('-');
        if (parts.length >= 2) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIdx = parseInt(parts[1], 10) - 1;
            if (monthIdx >= 0 && monthIdx < 12) {
                const m = months[monthIdx];
                const y = parts[0].substring(2);
                return `${m}-${y}`;
            }
        }
        return coverDate;
    }

    function distributeCitations(totalCitations, pubYear) {
        const timeline = { 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 };
        const targetYears = [2022, 2023, 2024, 2025, 2026];
        
        let yr = parseInt(pubYear, 10);
        if (isNaN(yr) || totalCitations <= 0) return { timeline, subtotal: 0 };
        
        const activeYears = targetYears.filter(y => y >= yr);
        if (activeYears.length === 0) return { timeline, subtotal: 0 };
        
        let remaining = totalCitations;
        activeYears.forEach((y, idx) => {
            if (idx === activeYears.length - 1) {
                timeline[y] = remaining;
            } else {
                const share = Math.floor(totalCitations / activeYears.length);
                const val = Math.min(remaining, Math.max(0, share));
                timeline[y] = val;
                remaining -= val;
            }
        });
        
        const subtotal = activeYears.reduce((sum, y) => sum + timeline[y], 0);
        return { timeline, subtotal };
    }

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
 
    // --- DATA FILTER & RENDER ---
    function applyFilter() {
        currentYear = reportYearSelect.value;
        activeQuartileSource = reportQuartileSelect.value;

        // Find maximum year in the dataset to calculate relative ranges dynamically
        const years = database.map(r => parseInt(r.year, 10)).filter(y => !isNaN(y));
        const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

        // Apply Year Filter
        filteredResults = database.filter(pub => {
            const pubYr = parseInt(pub.year, 10);
            if (currentYear === 'all') {
                return true;
            } else if (currentYear === 'last3') {
                return !isNaN(pubYr) && pubYr >= (maxYear - 2);
            } else if (currentYear === 'last5') {
                return !isNaN(pubYr) && pubYr >= (maxYear - 4);
            } else {
                return pub.year === currentYear;
            }
        });

        // Sort by selected field
        filteredResults.sort((a, b) => {
            let valA, valB;
            if (sortField === 'no') {
                valA = database.indexOf(a);
                valB = database.indexOf(b);
            } else if (sortField === 'author') {
                valA = (a.authors && a.authors[0] || '').toLowerCase();
                valB = (b.authors && b.authors[0] || '').toLowerCase();
            } else if (sortField === 'title') {
                valA = (a.title || '').toLowerCase();
                valB = (b.title || '').toLowerCase();
            } else if (sortField === 'year') {
                valA = parseInt(a.year, 10) || 0;
                valB = parseInt(b.year, 10) || 0;
            } else if (sortField === 'source') {
                valA = (a.journal || '').toLowerCase();
                valB = (b.journal || '').toLowerCase();
            } else if (sortField === 'citations') {
                valA = a.citations || 0;
                valB = b.citations || 0;
            } else if (sortField === 'subtotal') {
                valA = distributeCitations(a.citations, a.year).subtotal;
                valB = distributeCitations(b.citations, b.year).subtotal;
            } else if (sortField === 'publish') {
                valA = a.coverDate || a.year || '0000-00-00';
                valB = b.coverDate || b.year || '0000-00-00';
            }
            
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        renderMatrix();
    }

    function renderMatrix() {
        matrixTbody.innerHTML = '';
        
        // Accumulators for Summary Row
        let totalCited = 0;
        let total2022 = 0;
        let total2023 = 0;
        let total2024 = 0;
        let total2025 = 0;
        let total2026 = 0;
        let totalSubtotal = 0;
        let countQ1 = 0;
        let countQ2 = 0;
        let countQ3 = 0;
        let countQ4 = 0;

        if (filteredResults.length === 0) {
            matrixTbody.innerHTML = `
                <tr>
                    <td colspan="17" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                        No publication records found for the selected filter.
                    </td>
                </tr>`;
            updateSummaryRow(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
            return;
        }

        filteredResults.forEach((pub, idx) => {
            const tr = document.createElement('tr');
            
            // Format Author List
            const authorList = formatFirstAndCorresponding(pub.authors, pub.corresponding_author);
            
            // Format Publish Date
            const publishStr = formatPublishDate(pub.coverDate, pub.year);
            
            // Distribute Citations
            const dist = distributeCitations(pub.citations, pub.year);
            
            // Determine Quartile Tick
            const qVal = activeQuartileSource === 'scopus' ? pub.quartile_scopus : pub.quartile_scimago;
            const isQ1 = qVal === 'Q1' ? '1' : '';
            const isQ2 = qVal === 'Q2' ? '1' : '';
            const isQ3 = qVal === 'Q3' ? '1' : '';
            const isQ4 = qVal === 'Q4' ? '1' : '';

            // Update Accumulators
            totalCited += pub.citations || 0;
            total2022 += dist.timeline[2022];
            total2023 += dist.timeline[2023];
            total2024 += dist.timeline[2024];
            total2025 += dist.timeline[2025];
            total2026 += dist.timeline[2026];
            totalSubtotal += dist.subtotal;
            if (isQ1) countQ1++;
            if (isQ2) countQ2++;
            if (isQ3) countQ3++;
            if (isQ4) countQ4++;

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
                return `<span class="db-badge ${badgeClass}" style="font-size:0.6rem; padding:0.15rem 0.35rem; border-radius:4px; font-weight:600; display:inline-flex; align-items:center; gap:0.2rem;"><i class="${icon}" style="font-size:0.55rem;"></i>${cleanDb}</span>`;
            }).join('');

            const doiSection = pub.doi ? `
                <a href="https://doi.org/${pub.doi}" target="_blank" class="doi-badge" style="font-size:0.6rem; padding:0.15rem 0.35rem; background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); border: 1px solid rgba(59, 130, 246, 0.15); border-radius:4px; text-decoration:none; display:inline-flex; align-items:center; gap:0.2rem;">
                    <i class="fa-solid fa-link" style="font-size:0.55rem;"></i>DOI: ${pub.doi}
                </a>` : '';

            tr.innerHTML = `
                <td class="center">${idx + 1}</td>
                <td class="text-wrap-authors">${authorList}</td>
                <td class="text-wrap-title">
                    <div style="font-weight: 500;">${pub.title}</div>
                    <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.35rem; align-items: center;">
                        ${doiSection}
                        ${dbBadgesHtml}
                    </div>
                </td>
                <td class="center">${pub.year || '-'}</td>
                <td style="font-style: italic; white-space: normal; min-width: 250px;">${formatSourceTitle(pub)}</td>
                <td class="number" style="font-weight:600; color:var(--accent-purple);">${pub.citations}</td>
                <td class="number">${dist.timeline[2022] || '-'}</td>
                <td class="number">${dist.timeline[2023] || '-'}</td>
                <td class="number">${dist.timeline[2024] || '-'}</td>
                <td class="number">${dist.timeline[2025] || '-'}</td>
                <td class="number">${dist.timeline[2026] || '-'}</td>
                <td class="number" style="font-weight:600;">${dist.subtotal || '-'}</td>
                <td class="center" style="font-weight:600; color:var(--accent-blue);">${publishStr}</td>
                <td class="center tick">${isQ1}</td>
                <td class="center tick-q2">${isQ2}</td>
                <td class="center tick-q3">${isQ3}</td>
                <td class="center tick-q4">${isQ4}</td>
            `;
            matrixTbody.appendChild(tr);
        });

        // Calculate h-index for matrix
        const citationsArray = filteredResults.map(r => r.citations || 0);
        const hIndex = calculateHIndex(citationsArray);
        const hIndexTextEl = document.getElementById('report-hindex-text');
        if (hIndexTextEl) {
            hIndexTextEl.textContent = `h-index = ${hIndex} (Of the ${filteredResults.length} documents considered for the h-index, ${hIndex} have been cited at least ${hIndex} times.)`;
        }

        updateSummaryRow(
            filteredResults.length,
            totalCited,
            total2022,
            total2023,
            total2024,
            total2025,
            total2026,
            totalSubtotal,
            filteredResults.length,
            countQ1,
            countQ2,
            countQ3,
            countQ4
        );
    }

    function updateSummaryRow(count, cited, c22, c23, c24, c25, c26, sub, pubCount, q1, q2, q3, q4) {
        sumCount.textContent = count.toLocaleString();
        sumCitedBy.textContent = cited.toLocaleString();
        sumCite2022.textContent = c22 > 0 ? c22.toLocaleString() : '-';
        sumCite2023.textContent = c23 > 0 ? c23.toLocaleString() : '-';
        sumCite2024.textContent = c24 > 0 ? c24.toLocaleString() : '-';
        sumCite2025.textContent = c25 > 0 ? c25.toLocaleString() : '-';
        sumCite2026.textContent = c26 > 0 ? c26.toLocaleString() : '-';
        sumCiteSubtotal.textContent = sub > 0 ? sub.toLocaleString() : '-';
        sumPublished.textContent = pubCount.toLocaleString();
        sumQ1.textContent = q1 > 0 ? q1.toLocaleString() : '-';
        sumQ2.textContent = q2 > 0 ? q2.toLocaleString() : '-';
        sumQ3.textContent = q3 > 0 ? q3.toLocaleString() : '-';
        sumQ4.textContent = q4 > 0 ? q4.toLocaleString() : '-';
    }

    // --- CSV EXPORTER ---
    function exportMatrixToCSV() {
        const csvRows = [];
        
        // Define spreadsheet header row 1
        const headers1 = [
            "no", "Authors (First / Corresponding)", "Title", "Year", "Source title (Journal, Volume, Issue, Art No, Pages)", "Cited by",
            "Citations 2022", "Citations 2023", "Citations 2024", "Citations 2025", "Citations 2026", "subtotal", "Publish",
            "Q1", "Q2", "Q3", "Q4"
        ];
        csvRows.push(headers1.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

        // summary totals row
        const summaryRow = [
            "-", `Total Results: ${filteredResults.length}`, "-", "-", "-",
            sumCitedBy.textContent, sumCite2022.textContent, sumCite2023.textContent, sumCite2024.textContent, sumCite2025.textContent, sumCite2026.textContent,
            sumCiteSubtotal.textContent, sumPublished.textContent, sumQ1.textContent, sumQ2.textContent, sumQ3.textContent, sumQ4.textContent
        ];
        csvRows.push(summaryRow.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","));

        // data rows
        filteredResults.forEach((pub, idx) => {
            const authorList = formatFirstAndCorrespondingText(pub.authors, pub.corresponding_author);
            const publishStr = formatPublishDate(pub.coverDate, pub.year);
            const dist = distributeCitations(pub.citations, pub.year);
            const qVal = activeQuartileSource === 'scopus' ? pub.quartile_scopus : pub.quartile_scimago;
            
            const isQ1 = qVal === 'Q1' ? '1' : '';
            const isQ2 = qVal === 'Q2' ? '1' : '';
            const isQ3 = qVal === 'Q3' ? '1' : '';
            const isQ4 = qVal === 'Q4' ? '1' : '';

            const row = [
                idx + 1,
                authorList,
                pub.title,
                pub.year || "",
                formatSourceTitle(pub),
                pub.citations || 0,
                dist.timeline[2022] || "",
                dist.timeline[2023] || "",
                dist.timeline[2024] || "",
                dist.timeline[2025] || "",
                dist.timeline[2026] || "",
                dist.subtotal || 0,
                publishStr,
                isQ1,
                isQ2,
                isQ3,
                isQ4
            ];
            csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","));
        });

        // Download trigger
        const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `mednu_matrix_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- EVENT LISTENERS ---
    reportQuartileSelect.addEventListener('change', applyFilter);
    reportYearSelect.addEventListener('change', applyFilter);
    btnExportMatrix.addEventListener('click', exportMatrixToCSV);

    // --- SORT CLICK EVENT LISTENERS ---
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            
            if (sortField === field) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortField = field;
                // Default to desc for citations and year, asc for others
                sortDirection = (field === 'citations' || field === 'year' || field === 'subtotal') ? 'desc' : 'asc';
            }
            
            // Update sorting icons
            document.querySelectorAll('.sortable-header i').forEach(icon => {
                icon.className = "fa-solid fa-sort";
                icon.style.opacity = "0.6";
            });
            
            const icon = header.querySelector('i');
            if (icon) {
                icon.className = sortDirection === 'asc' ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
                icon.style.opacity = "1";
            }
            
            applyFilter();
        });
    });

    // Initial Load
    loadData();
});
