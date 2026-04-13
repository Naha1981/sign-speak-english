# SASL Sign Recognition Backend

A FastAPI service for recognizing South African Sign Language (SASL) signs using MediaPipe hand tracking and a custom classifier.

## Features

- Real-time hand landmark detection using MediaPipe
- Custom SASL sign classification
- REST API endpoints for image processing
- Docker containerization for easy deployment

## Setup

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the service:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

2. Or build manually:
```bash
docker build -t sasl-recognition .
docker run -p 8000:8000 sasl-recognition
```

## API Endpoints

### POST /recognize
Upload an image file to recognize SASL signs.

**Request:** Multipart form data with `file` field containing image
**Response:**
```json
{
  "success": true,
  "hands_detected": 1,
  "predictions": [
    {
      "hand_index": 0,
      "predictions": {
        "hello": 0.95,
        "thank_you": 0.85,
        "please": 0.75
      }
    }
  ]
}
```

### POST /recognize-base64
Send base64 encoded image for recognition.

**Request:**
```json
{
  "image": "base64_encoded_image_string"
}
```

### GET /health
Health check endpoint.

## Training Your SASL Classifier

1. Collect training data of SASL signs
2. Extract hand landmarks using MediaPipe
3. Train a classifier (e.g., SVM, Random Forest, or Neural Network)
4. Save the model as `models/sasl_classifier.h5`
5. Save the label encoder as `models/label_encoder.pkl`

## Integration with Frontend

Add this to your frontend to use the recognition service:

```javascript
// Upload image for recognition
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('http://localhost:8000/recognize', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.predictions);
```

## Environment Variables

- `PORT`: Server port (default: 8000)

## Dependencies

- FastAPI: Web framework
- MediaPipe: Hand tracking
- OpenCV: Image processing
- TensorFlow: ML model inference
- scikit-learn: Additional ML utilities