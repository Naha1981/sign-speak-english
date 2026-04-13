"""
SASL Sign Recognition Training Script

This script demonstrates how to train a classifier for SASL signs using
hand landmarks extracted with MediaPipe.
"""

import cv2
import mediapipe as mp
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import pickle
import os
from typing import List, Tuple

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.5
)

def extract_landmarks(image_path: str) -> np.ndarray:
    """Extract hand landmarks from a single image"""
    image = cv2.imread(image_path)
    if image is None:
        return None

    # Convert to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Process with MediaPipe
    results = hands.process(image_rgb)

    if results.multi_hand_landmarks:
        # Take the first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]

        # Extract 21 landmarks (x, y, z coordinates)
        landmarks = []
        for landmark in hand_landmarks.landmark:
            landmarks.extend([landmark.x, landmark.y, landmark.z])

        return np.array(landmarks)

    return None

def load_dataset(data_dir: str) -> Tuple[np.ndarray, np.ndarray]:
    """Load dataset from directory structure: data_dir/sign_name/image.jpg"""
    X = []
    y = []

    for sign_dir in os.listdir(data_dir):
        sign_path = os.path.join(data_dir, sign_dir)
        if not os.path.isdir(sign_path):
            continue

        print(f"Processing sign: {sign_dir}")

        for image_file in os.listdir(sign_path):
            if not image_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue

            image_path = os.path.join(sign_path, image_file)
            landmarks = extract_landmarks(image_path)

            if landmarks is not None:
                X.append(landmarks)
                y.append(sign_dir)

    return np.array(X), np.array(y)

def train_sasl_classifier(data_dir: str = "training_data"):
    """Train the SASL classifier"""

    print("Loading dataset...")
    X, y = load_dataset(data_dir)

    if len(X) == 0:
        print("No training data found!")
        return

    print(f"Dataset loaded: {len(X)} samples, {len(np.unique(y))} classes")

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train classifier
    print("Training classifier...")
    classifier = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        n_jobs=-1
    )

    classifier.fit(X_train, y_train)

    # Evaluate
    print("Evaluating model...")
    y_pred = classifier.predict(X_test)
    print(classification_report(y_test, y_pred))

    # Save model
    os.makedirs("models", exist_ok=True)

    # Save as pickle for scikit-learn models
    with open("models/sasl_classifier.pkl", "wb") as f:
        pickle.dump(classifier, f)

    # Save label encoder (if needed)
    from sklearn.preprocessing import LabelEncoder
    label_encoder = LabelEncoder()
    label_encoder.fit(y)
    with open("models/label_encoder.pkl", "wb") as f:
        pickle.dump(label_encoder, f)

    print("Model saved to models/sasl_classifier.pkl")
    print("Label encoder saved to models/label_encoder.pkl")

if __name__ == "__main__":
    # Example usage
    # Make sure you have a training_data directory with subdirectories for each sign
    # training_data/hello/image1.jpg, training_data/thank_you/image2.jpg, etc.

    train_sasl_classifier()