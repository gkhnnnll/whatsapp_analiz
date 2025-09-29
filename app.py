import re
import io
import pandas as pd
from flask import Flask, render_template, request, jsonify
from collections import Counter
import emoji
import string
# YENİ: Duygu analizi için kütüphaneyi ekliyoruz
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Kankam, kendi adını buraya yaz ki mesajların sağda yeşil renkte görünsün!
MY_NAME = "Gökhan"

# En çok kullanılan kelimeleri bulurken atlanacak yaygın Türkçe kelimeler
TURKISH_STOPWORDS = set([
    'acaba', 'ama', 'aslında', 'az', 'bazı', 'belki', 'biri', 'birkaç', 'birşey', 'biz', 'bu', 'çok', 'çünkü', 'da', 'daha', 'de',
    'defa', 'diye', 'eğer', 'en', 'gibi', 'hem', 'hep', 'hepsi', 'her', 'hiç', 'için', 'ile', 'ise', 'kez', 'ki', 'kim', 'mı', 'mu',
    'mü', 'nasıl', 'ne', 'neden', 'nerde', 'nerede', 'nereye', 'niçin', 'niye', 'o', 'sanki', 'şey', 'siz', 'şu', 'tüm', 've', 'veya',
    'ya', 'yani', 'bir', 'iki', 'ben', 'sen', 'bi', 'kadar', 'yok', 'var', 'öyle', 'değil', 'mi', 'ama', 'zaten', 'o', 'bu', 'şu',
    'ne', 'kadar', 'oldu', 'olur', 'tamam', 'evet', 'hayır', 'benim', 'senin', 'onun', 'bizim', 'sizin', 'onların', 'dedim', 'dedin'
])

app = Flask(__name__)

def parse_whatsapp_chat(lines_iterator):
    user_message_pattern = re.compile(r'(\d{1,2}\.\d{2}\.\d{4}) (\d{2}:\d{2}) - (.*?): (.*)')
    system_message_pattern = re.compile(r'(\d{1,2}\.\d{2}\.[0-9]{4}) (\d{2}:\d{2}) - (.*)')
    
    messages = []
    for line in lines_iterator:
        clean_line = line.strip()
        if not clean_line: continue

        user_match = user_message_pattern.match(clean_line)
        system_match = system_message_pattern.match(clean_line)
        
        if user_match:
            date, time, author, message_content = user_match.groups()
            messages.append({ 
                'date': date, 'time': time, 'author': author, 'message': message_content, 
                'type': 'outgoing' if author.strip() == MY_NAME else 'incoming' 
            })
        elif system_match and ":" not in system_match.group(3):
            date, time, message_content = system_match.groups()
            messages.append({ 
                'date': date, 'time': time, 'author': 'System', 'message': message_content, 'type': 'system' 
            })
        else:
            if messages:
                messages[-1]['message'] += '\n' + clean_line
    return messages

def analyze_chat_advanced(messages):
    user_messages = [msg for msg in messages if msg['type'] != 'system']
    if not user_messages: return {}

    df = pd.DataFrame(user_messages)
    df['datetime'] = pd.to_datetime(df['date'] + ' ' + df['time'], format='%d.%m.%Y %H:%M')
    df['message_length'] = df['message'].str.len()
    
    # --- TEMEL ANALİZLER ---
    authors = df['author'].unique()
    author_counts = df['author'].value_counts().to_dict()
    avg_msg_length = df.groupby('author')['message_length'].mean().round(1).to_dict()
    timeline = df.set_index('datetime').resample('D').size()
    timeline_data = { 'labels': timeline.index.strftime('%Y-%m-%d').tolist(), 'data': timeline.values.tolist() }
    df['hour'] = df['datetime'].dt.hour
    active_hours = df['hour'].value_counts().sort_index().to_dict()

    # --- MEDYA VE LİNK SAYACI ---
    media_counts = df.groupby('author')['message'].apply(lambda x: x.str.count('<Medya dahil edilmedi>').sum()).to_dict()
    link_counts = df.groupby('author')['message'].apply(lambda x: x.str.contains('http://|https://').sum()).to_dict()
    media_counts = {author: int(count) for author, count in media_counts.items()}
    link_counts = {author: int(count) for author, count in link_counts.items()}

    # --- EMOJİ ANALİZİ ---
    all_emojis = []
    author_emojis = {author: [] for author in authors}
    for index, row in df.iterrows():
        found_emojis = [e['emoji'] for e in emoji.emoji_list(row['message'])]
        if found_emojis:
            all_emojis.extend(found_emojis)
            author_emojis[row['author']].extend(found_emojis)
    top_emojis_overall = Counter(all_emojis).most_common(5)
    top_emojis_per_user = {author: Counter(emojis).most_common(5) for author, emojis in author_emojis.items()}
    
    # --- YENİ: DUYGU ANALİZİ ---
    analyzer = SentimentIntensityAnalyzer()
    df['sentiment'] = df['message'].apply(lambda msg: analyzer.polarity_scores(msg)['compound'])
    
    # Kişilere göre ortalama duygu skorunu hesapla ve %'ye çevir
    avg_sentiment_by_author = df.groupby('author')['sentiment'].mean()
    sentiment_scores = ((avg_sentiment_by_author + 1) / 2 * 100).round(1).to_dict()
    
    # Zaman çizelgesi için günlük ortalama duygu skorunu hesapla
    sentiment_timeline = df.set_index('datetime').resample('D')['sentiment'].mean().fillna(0)
    sentiment_timeline_data = sentiment_timeline.values.tolist()


    # --- CEVAP VERME SÜRESİ ANALİZİ ---
    response_times = {}
    raw_response_seconds = {}
    if len(authors) == 2:
        df_sorted = df.sort_values('datetime')
        df_sorted['prev_author'] = df_sorted['author'].shift(1)
        df_sorted['time_diff'] = df_sorted['datetime'].diff().dt.total_seconds()
        replies = df_sorted[df_sorted['author'] != df_sorted['prev_author']]
        for author in authors:
            author_replies = replies[replies['author'] == author]
            valid_replies = author_replies[author_replies['time_diff'] < 86400]
            if not valid_replies.empty:
                avg_seconds = valid_replies['time_diff'].mean()
                raw_response_seconds[author] = avg_seconds
                minutes, seconds = divmod(avg_seconds, 60)
                hours, minutes = divmod(minutes, 60)
                response_times[author] = f"{int(hours)} sa, {int(minutes)} dk, {int(seconds)} sn"
            else:
                response_times[author] = "Hesaplanamadı"
    
    # --- MİHENK TAŞLARI ("EN"LER) ---
    longest_msg_row = df.loc[df['message_length'].idxmax()]
    longest_message_info = {
        'author': longest_msg_row['author'],
        'text': longest_msg_row['message'][:200] + '...' if len(longest_msg_row['message']) > 200 else longest_msg_row['message'],
        'length': int(longest_msg_row['message_length'])
    }
    most_talkative_day_info = {}
    if not timeline.empty:
        most_talkative_day = timeline.idxmax()
        most_talkative_day_info = {
            'date': most_talkative_day.strftime('%d.%m.%Y'),
            'count': int(timeline.max())
        }
    first_message_date = df['datetime'].min().strftime('%d.%m.%Y')
    most_common_words = {}
    translator = str.maketrans('', '', string.punctuation)
    for author in authors:
        author_messages = " ".join(df[df['author'] == author]['message']).lower()
        author_messages = author_messages.translate(translator)
        words = [word for word in author_messages.split() if word not in TURKISH_STOPWORDS and not word.isdigit()]
        if words:
            most_common_words[author] = Counter(words).most_common(1)[0]
        else:
            most_common_words[author] = ("(Kelime bulunamadı)", 0)

    # --- BAŞARIMLAR (ACHIEVEMENTS) ---
    achievements = {}
    night_owl_df = df[(df['datetime'].dt.hour >= 0) & (df['datetime'].dt.hour < 4)]
    achievements['night_owl'] = night_owl_df['author'].value_counts().idxmax() if not night_owl_df.empty else "Belirlenemedi"
    achievements['novelist'] = longest_message_info['author']
    achievements['quick_reply_champion'] = min(raw_response_seconds, key=raw_response_seconds.get) if raw_response_seconds else "Belirlenemedi"
    emoji_counts_per_user = {author: sum(count for emoji, count in emojis) for author, emojis in top_emojis_per_user.items()}
    achievements['emoji_king'] = max(emoji_counts_per_user, key=emoji_counts_per_user.get) if emoji_counts_per_user else "Belirlenemedi"

    # Tüm analizleri tek bir objede topla
    analysis = {
        'total_user_messages': len(user_messages),
        'user_message_counts': author_counts,
        'avg_message_length': avg_msg_length,
        'timeline_data': timeline_data,
        'active_hours': active_hours,
        'media_counts': media_counts,
        'link_counts': link_counts,
        'emoji_analysis': {'overall': top_emojis_overall, 'per_user': top_emojis_per_user},
        'response_times': response_times,
        'sentiment_scores': sentiment_scores, # YENİ
        'sentiment_timeline_data': sentiment_timeline_data, # YENİ
        'milestones_and_achievements': {
            'longest_message': longest_message_info,
            'most_talkative_day': most_talkative_day_info,
            'first_message_date': first_message_date,
            'most_common_words': most_common_words,
            'achievements': achievements
        }
    }
    return analysis

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'chatfile' not in request.files: return jsonify({'error': 'Dosya seçilmedi!'}), 400
    file = request.files['chatfile']
    if file.filename == '': return jsonify({'error': 'Dosya seçilmedi!'}), 400
    if file:
        lines_iterator = io.TextIOWrapper(file.stream, encoding='utf-8', errors='ignore')
        all_messages = parse_whatsapp_chat(lines_iterator)
        chat_analysis = analyze_chat_advanced(all_messages)
        return jsonify({ 'messages': all_messages, 'analysis': chat_analysis })

# if __name__ == '__main__':
#     app.run(debug=True)