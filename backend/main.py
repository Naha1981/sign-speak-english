from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import mediapipe as mp
import numpy as np
from PIL import Image
import io
import tensorflow as tf
from sklearn.preprocessing import LabelEncoder
import pickle
import os
from typing import List, Dict
import base64

app = FastAPI(title="SASL Sign Recognition API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe Hands
try:
    import mediapipe as mp
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
except AttributeError:
    # Fallback for different MediaPipe versions
    print("MediaPipe solutions not available, using placeholder")
    mp_hands = None
    hands = None

# Placeholder for SASL classifier (you'll need to train this)
class SASLClassifier:
    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.load_model()

    def load_model(self):
        # Load your trained model here
        try:
            # Try loading scikit-learn model first
            with open('models/sasl_classifier.pkl', 'rb') as f:
                self.model = pickle.load(f)
            with open('models/label_encoder.pkl', 'rb') as f:
                self.label_encoder = pickle.load(f)
            print("SASL classifier model loaded successfully")
        except FileNotFoundError:
            print("No trained model found - using placeholder predictions")
        except Exception as e:
            print(f"Error loading model: {e} - using placeholder predictions")

    def predict(self, landmarks: np.ndarray) -> Dict[str, float]:
        # Use trained model if available
        if self.model is not None and self.label_encoder is not None:
            try:
                # Reshape landmarks for prediction
                landmarks_reshaped = landmarks.reshape(1, -1)

                # Get prediction probabilities
                if hasattr(self.model, 'predict_proba'):
                    probabilities = self.model.predict_proba(landmarks_reshaped)[0]
                    class_names = self.label_encoder.classes_

                    # Create predictions dict
                    predictions = {}
                    for i, prob in enumerate(probabilities):
                        predictions[class_names[i]] = float(prob)

                    # Sort by confidence and return top 3
                    sorted_predictions = dict(sorted(predictions.items(), key=lambda x: x[1], reverse=True))
                    return dict(list(sorted_predictions.items())[:3])
                else:
                    # Fallback for models without predict_proba
                    prediction = self.model.predict(landmarks.reshape(1, -1))[0]
                    return {str(prediction): 1.0}
            except Exception as e:
                print(f"Error during prediction: {e}")
                # Fall back to placeholder

        # Placeholder predictions - replace with actual model inference
        sasl_signs = ['hello', 'thank_you', 'please', 'sorry', 'goodbye', 'help', 'yes', 'no']
        # Random confidence scores for demo
        predictions = {sign: np.random.uniform(0.1, 0.9) for sign in sasl_signs}
        # Sort by confidence
        sorted_predictions = dict(sorted(predictions.items(), key=lambda x: x[1], reverse=True))
        return dict(list(sorted_predictions.items())[:3])  # Top 3 predictions

classifier = SASLClassifier()

def extract_hand_landmarks(image: np.ndarray) -> List[np.ndarray]:
    """Extract hand landmarks from image using MediaPipe"""
    if hands is None:
        # Return placeholder landmarks if MediaPipe not available
        return [np.random.rand(63)]  # 21 landmarks * 3 coordinates

    # Convert to RGB if needed
    if len(image.shape) == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.shape[2] == 4:  # RGBA
        image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)

    # Process with MediaPipe
    results = hands.process(image)

    landmarks_list = []
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # Extract 21 landmark coordinates (x, y, z)
            landmarks = []
            for landmark in hand_landmarks.landmark:
                landmarks.extend([landmark.x, landmark.y, landmark.z])
            landmarks_list.append(np.array(landmarks))

    return landmarks_list

@app.get("/")
async def root():
    return {"message": "SASL Sign Recognition API", "status": "running"}

@app.post("/recognize")
async def recognize_sign(file: UploadFile = File(...)):
    """Recognize SASL signs from uploaded image"""
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # Convert to numpy array
        image_np = np.array(image)

        # Extract hand landmarks
        landmarks = extract_hand_landmarks(image_np)

        if not landmarks:
            return {
                "success": False,
                "message": "No hands detected in image",
                "predictions": []
            }

        # Get predictions for each detected hand
        all_predictions = []
        for i, hand_landmarks in enumerate(landmarks):
            predictions = classifier.predict(hand_landmarks)
            all_predictions.append({
                "hand_index": i,
                "predictions": predictions
            })

        return {
            "success": True,
            "hands_detected": len(landmarks),
            "predictions": all_predictions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/recognize-base64")
async def recognize_sign_base64(data: Dict[str, str]):
    """Recognize SASL signs from base64 encoded image"""
    try:
        # Decode base64 image
        image_data = base64.b64decode(data["image"])
        image = Image.open(io.BytesIO(image_data))

        # Convert to numpy array
        image_np = np.array(image)

        # Extract hand landmarks
        landmarks = extract_hand_landmarks(image_np)

        if not landmarks:
            return {
                "success": False,
                "message": "No hands detected in image",
                "predictions": []
            }

        # Get predictions for each detected hand
        all_predictions = []
        for i, hand_landmarks in enumerate(landmarks):
            predictions = classifier.predict(hand_landmarks)
            all_predictions.append({
                "hand_index": i,
                "predictions": predictions
            })

        return {
            "success": True,
            "hands_detected": len(landmarks),
            "predictions": all_predictions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)