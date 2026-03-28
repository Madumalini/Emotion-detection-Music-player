from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
import io
from PIL import Image
import random

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except Exception as e:
    print('DeepFace import failed:', e)
    DEEPFACE_AVAILABLE = False

app = Flask(__name__)

@app.route('/detect', methods=['POST'])
def detect_emotion():
    try:
        data = request.get_json()
        image_data = data['image']
        header, encoded = image_data.split(',', 1)
        image_bytes = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(image)
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    except Exception as e:
        print('Image decode error:', e)
        return jsonify({'error': f'Image decode error: {str(e)}'}), 400

    if not DEEPFACE_AVAILABLE:
        # Fallback if DeepFace is not installed / TensorFlow unavailable
        fallback_emotions = ['happy', 'sad', 'angry', 'neutral']
        emotion = random.choice(fallback_emotions)
        print('DeepFace not available, returning fallback emotion:', emotion)
        return jsonify({'emotion': emotion, 'warning': 'DeepFace unavailable, using fallback emotion.'})

    try:
        result = DeepFace.analyze(img_bgr, actions=['emotion'], detector_backend='opencv', enforce_detection=False)
        # DeepFace returns a dict or list depending on version/config
        if isinstance(result, list):
            emotion = result[0].get('dominant_emotion', 'unknown')
        else:
            emotion = result.get('dominant_emotion', 'unknown')
        print('Detected emotion:', emotion)
        return jsonify({'emotion': emotion})
    except Exception as e:
        print('DeepFace error:', e)
        fallback_emotions = ['happy', 'sad', 'angry', 'neutral']
        emotion = random.choice(fallback_emotions)
        return jsonify({'emotion': emotion, 'warning': f'DeepFace failed: {str(e)} - fallback used.'})

if __name__ == '__main__':
    app.run(port=5001)