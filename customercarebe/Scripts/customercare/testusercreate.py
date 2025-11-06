from backend.models import Call, SentimentalAnalysis, User
from datetime import datetime, timedelta
import random

def generate_test_data():
    statuses = ['ongoing', 'completed']
    sentiments = ['Negative', 'Neutral', 'Positive']
    emotions = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
    customers = ['Alice', 'Bob', 'Charlie', 'Diana']

    for user_id in range(1, 11):
            user = str(user_id)
        
        for i in range(2):
            call = Call.objects.create(
                user=user,
                customer=random.choice(customers),
                timestamp=datetime.now() - timedelta(minutes=i * 15),
                duration=timedelta(seconds=random.randint(60, 600)),
                status=random.choice(statuses),
                sentiment_score=round(random.uniform(0.1, 1.0), 2)
            )

            SentimentalAnalysis.objects.create(
                call=call,
                user=user,
                customer_sentiment=random.choice(sentiments),
                employee_sentiment=random.choice(sentiments),
                emotion=random.choice(emotions),
                confidence_score=round(random.uniform(0.6, 1.0), 2)
            )

# Call the function
generate_test_data()
