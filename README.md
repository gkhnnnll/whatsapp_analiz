# WhatsApp Sohbet Analiz Aracı

Bu proje, dışa aktarılmış WhatsApp sohbet `.txt` dosyalarını analiz etmek ve görselleştirmek için geliştirilmiş bir Python Flask web uygulamasıdır. Kullanıcıların sohbet geçmişlerini interaktif bir arayüzde görüntülemelerine ve sohbet dinamikleri, mesajlaşma alışkanlıkları ve daha fazlası hakkında derinlemesine bilgi edinmelerine olanak tanır.

![Uygulama Arayüzü](https://i.imgur.com/your-screenshot-url.png)
*(Not: Bu ekran görüntüsü linkini, uygulamanın kendi ekran görüntüsüyle değiştirebilirsin.)*

---

## 🚀 Özellikler

Uygulama, hem görsel hem de analitik olarak zengin bir dizi özellik sunar:

### 📊 Detaylı Analiz Paneli
- **Genel Bakış:** Toplam mesaj sayısı.
- **Kullanıcı İstatistikleri:** Her kullanıcının toplam mesaj sayısı ve ortalama mesaj uzunluğu.
- **Duygu Analizi:** Her kullanıcının genel pozitiflik skoru ve sohbetin duygusal seyrini gösteren zaman çizelgesi grafiği.
- **Zaman Analizi:** Mesajlaşma yoğunluğunu günlük olarak gösteren interaktif zaman çizelgesi ve günün en aktif saatlerini gösteren bar grafiği.
- **İçerik Analizi:** En çok kullanılan emojiler (genel ve kullanıcı bazında), paylaşılan medya ve link sayıları.
- **"En"ler Paneli:** Sohbetteki en uzun mesaj, en çok konuşulan gün ve kullanıcı bazında en sık kullanılan kelimeler.
- **🏆 Başarımlar:** "Gece Kuşu", "Roman Yazarı", "Hızlı Cevap Şampiyonu" gibi eğlenceli unvanlar.

### ✨ İnteraktif Arayüz
- **Filtreleme:** Mesajları anahtar kelimeye, başlangıç/bitiş tarihine ve kullanıcıya göre filtreleme.
- **İnteraktif Paneller:** Analiz panelindeki kullanıcı isimlerine veya link sayılarına tıklayarak ilgili mesajları anında filtreleme.
- **Kolay Gezinme:** Belirli bir tarihe veya içinde mesaj olan rastgele bir güne tek tuşla gitme.
- **"O Gün Bugün":** Geçmiş yıllarda tam olarak bugünün tarihinde ne konuştuğunuzu gösteren nostaljik bir özellik.
- **Gelişmiş Arama:** Arama sonuçları arasında "Önceki/Sonraki" butonlarıyla gezinme ve sonuç sayısını görme.

### 🎨 Kullanıcı Deneyimi
- **Modern Arayüz:** WhatsApp Web'e benzer, tanıdık bir sohbet görüntüleme deneyimi.
- **Mobil Uyumlu Tasarım:** Telefon ve tablet gibi cihazlarda sorunsuz kullanım.
- **Koyu / Açık Tema:** Kullanıcının tercihine göre tema değiştirme.
- **Veri Kalıcılığı:** Yüklenen son sohbetin tarayıcı hafızasında (IndexedDB) saklanması, böylece sayfayı her yenilediğinde dosyayı tekrar yüklemeye gerek kalmaz.
- **Performans:** Binlerce mesajı akıcı bir şekilde göstermek için "sonsuz kaydırma" (lazy loading) tekniği.
- **Raporlama:** Analiz panelini yazdırma veya PDF olarak kaydetme.
- **Yardım Paneli:** Uygulamanın nasıl kullanılacağını anlatan bir yardım penceresi.

---

## 🛠️ Kullanılan Teknolojiler

- **Backend:** Python, Flask, Pandas
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Veri Görselleştirme:** Chart.js
- **Doğal Dil İşleme:** vaderSentiment (Duygu Analizi için)
- **WSGI Sunucusu:** Waitress

---

## 💻 Kurulum ve Yerel Makinede Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

1.  **Depoyu klonlayın:**
    ```bash
    git clone [https://github.com/gkhnnnll/whatsapp_analiz.git](https://github.com/gkhnnnll/whatsapp_analiz.git)
    cd whatsapp_analiz
    ```

2.  **Sanal ortam oluşturun ve aktifleştirin:**
    ```bash
    # Sanal ortamı oluştur
    python -m venv venv

    # Windows için aktifleştirme
    .\venv\Scripts\activate
    ```

3.  **Gerekli kütüphaneleri yükleyin:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Flask uygulamasını çalıştırın:**
    ```bash
    flask run
    ```

5.  Tarayıcınızdan `http://127.0.0.1:5000` adresine gidin.

---

## 📝 Nasıl Kullanılır?

1.  **WhatsApp Sohbetini Dışa Aktarın:**
    - Görüntülemek istediğiniz sohbete girin.
    - Ayarlar menüsünden "Sohbeti Dışa Aktar" seçeneğini seçin.
    - **"Medya Eklemeden"** seçeneğini tercih ederek `.txt` dosyasını oluşturun ve bilgisayarınıza kaydedin.

2.  **Uygulamaya Yükleyin:**
    - Uygulama arayüzündeki dosya yükleme alanını kullanarak oluşturduğunuz `.txt` dosyasını seçin.
    - "Sohbeti Yükle ve Analiz Et" butonuna tıklayın ve analizin keyfini çıkarın!

---

## 📄 Lisans

Bu proje MIT Lisansı ile lisanslanmıştır.
