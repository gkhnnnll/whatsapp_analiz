document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL DEĞİŞKENLER ---
    let allMessages = [];
    let filteredMessages = [];
    let currentlyRenderedCount = 0;
    const RENDER_CHUNK_SIZE = 100;

    let userChart, timelineChart, activeHoursChart = null;
    let db;

    // Arama sonuçları için
    let searchResults = [];
    let currentResultIndex = -1;

    // --- ELEMENT REFERANSLARI ---
    const body = document.body;
    const chatContainer = document.getElementById('chat-container');
    const analysisContainer = document.getElementById('analysis-container');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn'); 
    const chatFileInput = document.getElementById('chatFileInput');
    const viewChatBtn = document.getElementById('viewChatBtn');
    const uploadSection = document.getElementById('upload-section');
    const clearSection = document.getElementById('clear-section');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const filtersContainer = document.querySelector('.filters-container');
    const keywordSearch = document.getElementById('keywordSearch');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const filterBtn = document.getElementById('filterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const searchNavContainer = document.getElementById('search-nav-container');
    const searchResultCount = document.getElementById('searchResultCount');
    const prevResultBtn = document.getElementById('prevResultBtn');
    const nextResultBtn = document.getElementById('nextResultBtn');
    const printReportBtn = document.getElementById('printReportBtn');
    const goToDateBtn = document.getElementById('goToDateBtn');
    const datePicker = document.getElementById('datePicker');
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('theme-label');
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');
    const onThisDayBtn = document.getElementById('onThisDayBtn');
    // --- YORUM SATIRI: Rastgele güne git butonu referansı eklendi ---
    const randomDateBtn = document.getElementById('randomDateBtn');
    

    // --- VERİTABANI YARDIMCI FONKSİYONLARI ---
    const DB_NAME = 'WhatsAppChatDB';
    const STORE_NAME = 'chat_store';
    function openDB() { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onerror = () => reject("Veritabanı açılamadı."); request.onsuccess = (event) => { db = event.target.result; resolve(db); }; request.onupgradeneeded = (event) => { const db = event.target.result; db.createObjectStore(STORE_NAME, { keyPath: 'id' }); }; }); }
    function saveData(data) { return new Promise((resolve, reject) => { if (!db) return reject("Veritabanı bağlantısı yok."); const transaction = db.transaction([STORE_NAME], 'readwrite'); const store = transaction.objectStore(STORE_NAME); const request = store.put({ id: 'last_chat', ...data }); request.onerror = () => reject("Veri kaydedilemedi."); request.onsuccess = () => resolve("Veri başarıyla kaydedildi."); }); }
    function getData() { return new Promise((resolve, reject) => { if (!db) return resolve(null); const transaction = db.transaction([STORE_NAME], 'readonly'); const store = transaction.objectStore(STORE_NAME); const request = store.get('last_chat'); request.onerror = () => reject("Veri alınamadı."); request.onsuccess = () => resolve(request.result); }); }
    function clearData() { return new Promise((resolve, reject) => { if (!db) return reject("Veritabanı bağlantısı yok."); const transaction = db.transaction([STORE_NAME], 'readwrite'); const store = transaction.objectStore(STORE_NAME); const request = store.clear(); request.onerror = () => reject("Veri silinemedi."); request.onsuccess = () => resolve("Veri başarıyla silindi."); }); }

    // --- UYGULAMA BAŞLATMA VE ARAYÜZ KONTROLÜ ---
    async function initializeApp() {
        await openDB();
        const savedData = await getData();
        if (savedData && savedData.messages) {
            allMessages = savedData.messages;
            renderAnalysis(savedData.analysis);
            applyFilters();
            toggleUI(true);
        } else {
            toggleUI(false);
        }
    }

    function toggleUI(chatLoaded) {
        uploadSection.style.display = chatLoaded ? 'none' : 'block';
        clearSection.style.display = chatLoaded ? 'block' : 'none';
        filtersContainer.style.display = chatLoaded ? 'block' : 'none';
        if (!chatLoaded) {
            chatContainer.innerHTML = '<div class="placeholder"><h2>Başlamak için lütfen bir sohbet dosyası yükleyin.</h2></div>';
            analysisContainer.innerHTML = '';
        }
    }
    
    // --- OLAY DİNLEYİCİLERİ ---
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    sidebarCloseBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    chatContainer.addEventListener('click', () => sidebar.classList.remove('open'));
    helpBtn.addEventListener('click', () => helpModal.style.display = 'flex');
    closeHelpModal.addEventListener('click', () => helpModal.style.display = 'none');
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) { helpModal.style.display = 'none'; } });
    printReportBtn.addEventListener('click', () => window.print());
    viewChatBtn.addEventListener('click', handleFileUpload);
    clearChatBtn.addEventListener('click', async () => { if (confirm("Kaydedilmiş sohbeti silmek istediğinize emin misiniz?")) { await clearData(); location.reload(); } });
    filterBtn.addEventListener('click', applyFilters);
    resetFilterBtn.addEventListener('click', () => {
        keywordSearch.value = '';
        startDate.value = '';
        endDate.value = '';
        document.body.removeAttribute('data-author-filter');
        applyFilters();
    });
    keywordSearch.addEventListener('input', applyFilters); 
    prevResultBtn.addEventListener('click', navigateSearchResults.bind(null, -1));
    nextResultBtn.addEventListener('click', navigateSearchResults.bind(null, 1));
    onThisDayBtn.addEventListener('click', filterOnThisDay);
    // --- YORUM SATIRI: Rastgele güne git butonu için olay dinleyici eklendi ---
    randomDateBtn.addEventListener('click', goToRandomDate);
    goToDateBtn.addEventListener('click', () => {
        const targetDateValue = datePicker.value;
        if (!targetDateValue || allMessages.length === 0) return;
        const [year, month, day] = targetDateValue.split('-');
        const formattedTargetDate = `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
        const targetIndex = allMessages.findIndex(msg => msg.date === formattedTargetDate);
        if (targetIndex !== -1) {
            keywordSearch.value = ''; startDate.value = ''; endDate.value = ''; document.body.removeAttribute('data-author-filter');
            applyFilters(); 
            setTimeout(() => revealTargetMessage(targetIndex), 100);
        } else {
            alert('Bu tarihte mesaj bulunamadı.');
        }
    });
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') { body.classList.add('light-mode'); themeToggle.checked = true; themeLabel.textContent = 'Açık Tema'; } 
    else { themeLabel.textContent = 'Koyu Tema'; }
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) { body.classList.add('light-mode'); localStorage.setItem('theme', 'light'); themeLabel.textContent = 'Açık Tema'; } 
        else { body.classList.remove('light-mode'); localStorage.setItem('theme', 'dark'); themeLabel.textContent = 'Koyu Tema'; }
    });
    let scrollTimeout;
    chatContainer.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 300) {
                if (currentlyRenderedCount < filteredMessages.length) {
                    renderMoreMessages();
                }
            }
            updateStickyDate();
        }, 50);
    });

    // --- ANA FONKSİYONLAR ---
    async function handleFileUpload() {
        const file = chatFileInput.files[0];
        if (!file) { alert('Lütfen bir dosya seçin!'); return; }
        const formData = new FormData();
        formData.append('chatfile', file);
        chatContainer.innerHTML = '<div class="placeholder"><h2>Sohbet yükleniyor ve analiz ediliyor...</h2></div>';
        analysisContainer.innerHTML = '';
        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Dosya yüklenirken hata.');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            await saveData({ messages: data.messages, analysis: data.analysis });
            allMessages = data.messages;
            renderAnalysis(data.analysis);
            applyFilters();
            toggleUI(true);
        } catch (error) {
            chatContainer.innerHTML = `<div class="placeholder"><h2>Hata!</h2><p>${error.message}</p><p>Lütfen geçerli bir WhatsApp sohbet dosyası yüklediğinizden emin olun.</p></div>`;
            toggleUI(false);
        }
    }

    function applyFilters() {
        const keyword = keywordSearch.value.toLowerCase().trim();
        const start = startDate.value ? new Date(startDate.value) : null;
        const end = endDate.value ? new Date(endDate.value) : null;
        const authorFilter = document.body.getAttribute('data-author-filter');
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        let tempFiltered = allMessages;
        if (authorFilter) { tempFiltered = tempFiltered.filter(msg => msg.author === authorFilter); }
        if (start || end) {
            tempFiltered = tempFiltered.filter(msg => {
                const msgDateParts = msg.date.split('.');
                const msgDate = new Date(`${msgDateParts[2]}-${msgDateParts[1]}-${msgDateParts[0]}`);
                return (!start || msgDate >= start) && (!end || msgDate <= end);
            });
        }
        if (keyword) { tempFiltered = tempFiltered.filter(msg => msg.message.toLowerCase().includes(keyword)); }
        filteredMessages = tempFiltered; 
        renderChatInitial(filteredMessages, keyword);
    }
    
    function filterOnThisDay() {
        if (allMessages.length === 0) return;
    
        const today = new Date();
        const currentDay = String(today.getDate()).padStart(2, '0');
        const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
        const todayFormatted = `${currentDay}.${currentMonth}`;
    
        keywordSearch.value = '';
        startDate.value = '';
        endDate.value = '';
        document.body.removeAttribute('data-author-filter');
    
        const filtered = allMessages.filter(msg => msg.date.startsWith(todayFormatted));
    
        filteredMessages = filtered;
        renderChatInitial(filtered, '');
    }
    
    // --- YORUM SATIRI: Rastgele güne gitme mantığını içeren fonksiyon eklendi ---
    function goToRandomDate() {
        if (allMessages.length === 0) return;

        // 1. İçinde mesaj olan tüm farklı tarihleri bul
        const allDatesWithMessages = [...new Set(allMessages.map(msg => msg.date))];
        if (allDatesWithMessages.length === 0) return;

        // 2. Bu tarihlerden rastgele birini seç
        const randomIndex = Math.floor(Math.random() * allDatesWithMessages.length);
        const randomDate = allDatesWithMessages[randomIndex];

        // 3. O tarihteki ilk mesajın index'ini bul
        const targetIndex = allMessages.findIndex(msg => msg.date === randomDate);

        if (targetIndex !== -1) {
            // 4. Diğer tüm filtreleri temizle ve sohbeti yeniden yükle
            keywordSearch.value = '';
            startDate.value = '';
            endDate.value = '';
            document.body.removeAttribute('data-author-filter');
            applyFilters();

            // 5. DOM'un güncellenmesi için kısa bir süre sonra hedef mesaja git
            setTimeout(() => revealTargetMessage(targetIndex), 100);
        }
    }

    function filterMessagesWithLinks(author) {
        keywordSearch.value = '';
        startDate.value = '';
        endDate.value = '';
        document.body.removeAttribute('data-author-filter');
        const linkRegex = /https?:\/\//;
        const filtered = allMessages.filter(msg => {
            return msg.author === author && linkRegex.test(msg.message);
        });
        filteredMessages = filtered;
        renderChatInitial(filtered, '');
    }
    
    function renderChatInitial(messages, keyword) {
        chatContainer.innerHTML = '<div id="sticky-date-header" class="sticky-date"></div>';
        currentlyRenderedCount = 0; 
        if (messages.length === 0) {
            chatContainer.insertAdjacentHTML('beforeend', '<div class="placeholder"><h2>Filtreyle eşleşen mesaj bulunamadı.</h2></div>');
            const header = document.getElementById('sticky-date-header');
            if(header) header.classList.remove('visible');
            updateSearchResults();
            return;
        }
        renderMoreMessages(keyword); 
        chatContainer.scrollTop = 0;
        setTimeout(updateStickyDate, 100);
    }

    function renderMoreMessages(keyword) {
        const currentKeyword = keyword !== undefined ? keyword : keywordSearch.value.toLowerCase().trim();
        const newMessages = filteredMessages.slice(currentlyRenderedCount, currentlyRenderedCount + RENDER_CHUNK_SIZE);
        appendMessagesToDOM(newMessages, currentKeyword);
        currentlyRenderedCount += newMessages.length;
        setTimeout(updateSearchResults, 50);
    }
    
    function linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }

    function appendMessagesToDOM(messages, keyword) {
        messages.forEach((msg) => {
            const originalIndex = allMessages.indexOf(msg);
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', msg.type);
            messageDiv.setAttribute('data-index', originalIndex);
            let messageText = escapeHTML(msg.message);
            messageText = linkify(messageText);
            if (keyword) {
                 const regex = new RegExp(escapeRegExp(keyword), 'gi');
                 messageText = messageText.replace(regex, match => `<span class="highlight">${match}</span>`);
            }
            let authorHtml = (msg.type === 'incoming' && msg.author) ? `<div class="author">${escapeHTML(msg.author)}</div>` : '';
            if (msg.type === 'system') authorHtml = '';
            messageDiv.innerHTML = `<div class="text">${messageText}</div><div class="timestamp">${escapeHTML(msg.time)}</div>`;
            if (authorHtml) messageDiv.insertAdjacentHTML('afterbegin', authorHtml);
            chatContainer.appendChild(messageDiv);
        });
    }

    function updateSearchResults() {
        const keyword = keywordSearch.value.toLowerCase().trim();
        if (!keyword) {
            searchResults = [];
            currentResultIndex = -1;
            searchNavContainer.style.display = 'none';
            document.querySelectorAll('.highlight.active').forEach(el => el.classList.remove('active'));
            return;
        }
        searchResults = Array.from(chatContainer.querySelectorAll('.highlight'));
        searchResultCount.textContent = `${searchResults.length} sonuç bulundu`;
        searchNavContainer.style.display = searchResults.length > 0 ? 'flex' : 'none';
        currentResultIndex = -1;
    }

    function navigateSearchResults(direction) {
        if (searchResults.length === 0) return;
        if (currentResultIndex !== -1 && searchResults[currentResultIndex]) { searchResults[currentResultIndex].classList.remove('active'); }
        currentResultIndex += direction;
        if (currentResultIndex >= searchResults.length) currentResultIndex = 0;
        if (currentResultIndex < 0) currentResultIndex = searchResults.length - 1;
        const activeResult = searchResults[currentResultIndex];
        activeResult.classList.add('active');
        activeResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function revealTargetMessage(targetIndex) {
        let targetElement = document.querySelector(`.message[data-index="${targetIndex}"]`);
        const revealAndHighlight = () => {
            targetElement = document.querySelector(`.message[data-index="${targetIndex}"]`);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetElement.style.transition = 'background-color 0.5s ease';
                targetElement.style.backgroundColor = 'rgba(0, 168, 132, 0.5)';
                setTimeout(() => { targetElement.style.backgroundColor = ''; }, 2000);
            }
        };
        if (!targetElement) {
            const renderUntilFound = () => {
                if (currentlyRenderedCount >= filteredMessages.length) return;
                renderMoreMessages();
                targetElement = document.querySelector(`.message[data-index="${targetIndex}"]`);
                if (targetElement) { setTimeout(revealAndHighlight, 50); } 
                else { requestAnimationFrame(renderUntilFound); }
            };
            requestAnimationFrame(renderUntilFound);
        } else { revealAndHighlight(); }
    }

    let lastKnownDate = "";
    function updateStickyDate() {
        const header = document.getElementById('sticky-date-header');
        if (!header) return;
        const containerTop = chatContainer.getBoundingClientRect().top;
        const messagesInView = Array.from(chatContainer.querySelectorAll('.message'));
        let topMessage = null;
        for (const msgEl of messagesInView) { if (msgEl.getBoundingClientRect().top >= containerTop) { topMessage = msgEl; break; } }
        if (topMessage) {
            const index = parseInt(topMessage.getAttribute('data-index'));
            const messageData = allMessages[index];
            if (messageData && messageData.date !== lastKnownDate) { header.textContent = messageData.date; lastKnownDate = messageData.date; }
            header.classList.add('visible');
        } else if (messagesInView.length === 0) { header.classList.remove('visible'); }
    }
    
    function renderAnalysis(analysis) {
        analysisContainer.innerHTML = ''; 
        analysisContainer.innerHTML += `<div class="stats-section"><h4>Genel Bakış</h4><ul><li><strong>Toplam Mesaj:</strong> ${analysis.total_user_messages}</li></ul></div>`;
        const lengths = Object.entries(analysis.avg_message_length);
        let lengthListHtml = '<div class="stats-section"><h4>Ortalama Mesaj Uzunluğu</h4><ul>';
        lengths.sort((a,b) => b[1] - a[1]).forEach(([author, length]) => { lengthListHtml += `<li><strong>${escapeHTML(author)}:</strong> ${length} karakter</li>`; });
        lengthListHtml += '</ul></div>';
        analysisContainer.innerHTML += lengthListHtml;

        if (analysis.sentiment_scores) {
            let sentimentHtml = '<div class="stats-section"><h4>Genel Duygu Skoru (Pozitiflik)</h4><ul>';
            const sortedSentiment = Object.entries(analysis.sentiment_scores).sort((a,b) => b[1] - a[1]);
            sortedSentiment.forEach(([author, score]) => {
                sentimentHtml += `<li><strong>${escapeHTML(author)}:</strong> %${score}</li>`;
            });
            sentimentHtml += '</ul></div>';
            analysisContainer.innerHTML += sentimentHtml;
        }

        const responses = Object.entries(analysis.response_times);
        if(responses.length > 0){
            let responseHtml = '<div class="stats-section"><h4>Ortalama Cevap Süresi</h4><ul>';
            responses.forEach(([author, time]) => { responseHtml += `<li><strong>${escapeHTML(author)}:</strong> ${time}</li>`; });
            responseHtml += '</ul></div>';
            analysisContainer.innerHTML += responseHtml;
        }
        const users = Object.entries(analysis.user_message_counts);
        let userListHtml = '<div class="stats-section"><h4>Kullanıcıya Göre Mesaj Sayısı (Filtrelemek için tıkla)</h4><ul>';
        users.sort((a, b) => b[1] - a[1]).forEach(([author, count]) => { userListHtml += `<li data-author="${escapeHTML(author)}"><strong>${escapeHTML(author)}:</strong> ${count} mesaj</li>`; });
        userListHtml += '</ul></div>';
        analysisContainer.innerHTML += userListHtml;

        if (analysis.media_counts && analysis.link_counts) {
            let sharingHtml = '<div class="stats-section"><h4>Paylaşım İstatistikleri 🖼️🔗</h4>';
            const sortedMedia = Object.entries(analysis.media_counts).sort((a, b) => b[1] - a[1]);
            sharingHtml += '<h5>Paylaşılan Medya Sayısı</h5><ul>';
            sortedMedia.forEach(([author, count]) => { sharingHtml += `<li><strong>${escapeHTML(author)}:</strong> ${count} medya</li>`; });
            sharingHtml += '</ul>';
            const sortedLinks = Object.entries(analysis.link_counts).sort((a, b) => b[1] - a[1]);
            sharingHtml += '<h5>Paylaşılan Link Sayısı</h5><ul>';
            sortedLinks.forEach(([author, count]) => {
                sharingHtml += `<li class="link-filter" data-author="${escapeHTML(author)}"><strong>${escapeHTML(author)}:</strong> ${count} link</li>`;
            });
            sharingHtml += '</ul></div>';
            analysisContainer.innerHTML += sharingHtml;
        }
        let emojiHtml = '<div class="stats-section"><h4>Emoji Liderleri</h4>';
        emojiHtml += `<h5>Genel Top 5</h5><ul>${analysis.emoji_analysis.overall.map(e => `<li>${e[0]} : ${e[1]} kez</li>`).join('')}</ul>`;
        Object.entries(analysis.emoji_analysis.per_user).forEach(([author, emojis]) => {
            if(emojis.length > 0) { emojiHtml += `<h5>${escapeHTML(author)}</h5><ul>${emojis.map(e => `<li>${e[0]} : ${e[1]} kez</li>`).join('')}</ul>`; }
        });
        emojiHtml += '</div>';
        analysisContainer.innerHTML += emojiHtml;
        if (analysis.milestones_and_achievements) {
            const m = analysis.milestones_and_achievements;
            let commonWordsHtml = '<h5>En Sık Kullanılan Kelimeler</h5><ul>';
            Object.entries(m.most_common_words).forEach(([author, word_info]) => { commonWordsHtml += `<li><strong>${escapeHTML(author)}:</strong> "${word_info[0]}" (${word_info[1]} kez)</li>`; });
            commonWordsHtml += '</ul>';
            let milestonesHtml = `<div class="stats-section"><h4>⭐ Sohbetin "En"leri</h4><ul><li><strong>İlk Mesaj Tarihi:</strong> ${m.first_message_date}</li><li><strong>En Konuşkan Gün:</strong> ${m.most_talkative_day.date} (${m.most_talkative_day.count} mesaj)</li><li><strong>En Uzun Mesaj (${m.longest_message.length} krkt):</strong><p class="milestone-message"><strong>${escapeHTML(m.longest_message.author)}:</strong> "${escapeHTML(m.longest_message.text)}"</p></li></ul>${commonWordsHtml}</div>`;
            analysisContainer.innerHTML += milestonesHtml;
            const a = m.achievements;
            let achievementsHtml = `<div class="stats-section achievements"><h4>🏆 Başarımlar</h4><ul><li><strong>Roman Yazarı ✍️:</strong> ${escapeHTML(a.novelist)}</li><li><strong>Gece Kuşu 🦉:</strong> ${escapeHTML(a.night_owl)}</li><li><strong>Hızlı Cevap Şampiyonu ⚡:</strong> ${escapeHTML(a.quick_reply_champion)}</li><li><strong>Emoji Kralı/Kraliçesi 😎:</strong> ${escapeHTML(a.emoji_king)}</li></ul></div>`;
            analysisContainer.innerHTML += achievementsHtml;
        }
        analysisContainer.innerHTML += `<div class="stats-section"><h4>Mesaj Dağılımı (Kişi)</h4><canvas id="userChart"></canvas></div><div class="stats-section"><h4>Mesaj Dağılımı (Saat)</h4><canvas id="activeHoursChart"></canvas></div><div class="stats-section"><h4>Zaman Çizelgesi (Gün & Duygu)</h4><canvas id="timelineChart"></canvas></div>`;
        
        renderUserChart(analysis.user_message_counts);
        renderActiveHoursChart(analysis.active_hours);
        renderTimelineChart(analysis.timeline_data, analysis.sentiment_timeline_data);
        
        document.querySelectorAll('#analysis-container li[data-author]').forEach(item => { item.addEventListener('click', () => { document.body.setAttribute('data-author-filter', item.getAttribute('data-author')); applyFilters(); }); });
        
        document.querySelectorAll('#analysis-container li.link-filter').forEach(item => {
            item.addEventListener('click', () => {
                const author = item.getAttribute('data-author');
                filterMessagesWithLinks(author);
            });
        });
    }
    
    function renderActiveHoursChart(data) { if(activeHoursChart) activeHoursChart.destroy(); const ctx = document.getElementById('activeHoursChart').getContext('2d'); const labels = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`); const chartData = labels.map((label, index) => data[index] || 0); activeHoursChart = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Saatlik Mesaj Sayısı', data: chartData, backgroundColor: 'rgba(255, 159, 64, 0.6)', borderColor: 'rgba(255, 159, 64, 1)', borderWidth: 1 }] }, options: { scales: { y: { beginAtZero: true } } } }); }
    function renderUserChart(data) { if(userChart) userChart.destroy(); const ctx = document.getElementById('userChart').getContext('2d'); const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]); userChart = new Chart(ctx, { type: 'bar',data: {labels: sortedData.map(item => item[0]),datasets: [{label: 'Mesaj Sayısı',data: sortedData.map(item => item[1]),backgroundColor: 'rgba(0, 168, 132, 0.6)',borderColor: 'rgba(0, 168, 132, 1)',borderWidth: 1}]},options: { scales: { y: { beginAtZero: true } } }}); }
    
    function renderTimelineChart(countData, sentimentData) {
        if(timelineChart) timelineChart.destroy();
        const ctx = document.getElementById('timelineChart').getContext('2d');
        timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: countData.labels,
                datasets: [{
                    label: 'Günlük Mesaj Sayısı',
                    data: countData.data,
                    fill: true,
                    borderColor: 'rgba(83, 189, 255, 1)',
                    backgroundColor: 'rgba(83, 189, 235, 0.2)',
                    tension: 0.1,
                    yAxisID: 'yMessages',
                },
                {
                    label: 'Duygu Skoru (Günlük Ortalama)',
                    data: sentimentData,
                    borderColor: 'rgba(255, 159, 64, 1)',
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    tension: 0.1,
                    yAxisID: 'ySentiment',
                }]
            },
            options: {
                scales: {
                    yMessages: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: 'Mesaj Sayısı' } },
                    ySentiment: { type: 'linear', display: true, position: 'right', min: -1, max: 1, title: { display: true, text: 'Duygu Skoru' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }
    
    function escapeHTML(str) { if (typeof str !== 'string') return ''; return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
    function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    
    initializeApp();
});